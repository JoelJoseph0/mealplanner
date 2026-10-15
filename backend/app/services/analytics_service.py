from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.food import Food
from app.models.recipe import Recipe
from app.models.food_image import FoodImage
from app.models.recognition import Recognition
from app.models.meal_plan import MealPlan
from app.models.meal_history import MealHistory
from app.models.pantry_item import PantryItem

CONFIDENCE_BUCKETS = [
    ("85% - 100% (High)", 0.85, 1.01),
    ("70% - 84%", 0.70, 0.85),
    ("45% - 69%", 0.45, 0.70),
    ("< 45% (Low)", 0.0, 0.45),
]


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso(value: Optional[datetime]) -> Optional[str]:
    normalized = _as_utc(value)
    return normalized.isoformat() if normalized else None


def _percentage(part: int, whole: int) -> float:
    return round((part / whole) * 100.0, 1) if whole else 0.0


def _last_months(count: int = 6) -> List[tuple]:
    now = datetime.now(timezone.utc)
    months = []
    year, month = now.year, now.month
    for _ in range(count):
        months.append((year, month))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


def _bucket_by_month(timestamps: List[Optional[datetime]], months: List[tuple]) -> Dict[tuple, int]:
    counts = Counter()
    wanted = set(months)
    for value in timestamps:
        normalized = _as_utc(value)
        if normalized and (normalized.year, normalized.month) in wanted:
            counts[(normalized.year, normalized.month)] += 1
    return counts


def model_summary() -> Dict[str, Any]:
    try:
        from app.computer_vision.model_loader import get_model_loader
        loader = get_model_loader()
        meta = loader.get_metadata()
        return {
            "trained": loader.is_trained(),
            "architecture": meta.get("architecture"),
            "backbone_weights": meta.get("backbone_weights"),
            "num_classes": len(loader.get_class_names()),
            "class_names": loader.get_class_names(),
            "validation_accuracy": meta.get("validation_accuracy"),
            "test_accuracy": meta.get("test_accuracy"),
            "test_top3_accuracy": meta.get("test_top3_accuracy"),
            "test_f1_macro": meta.get("test_f1_macro"),
            "train_images": meta.get("train_images"),
            "test_images": meta.get("test_images"),
            "trained_at": meta.get("trained_at"),
        }
    except Exception:
        return {"trained": False, "num_classes": 0, "class_names": []}


def _nutrition_trend(db: Session, days: int = 14, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    query = (
        db.query(MealHistory.consumed_at, MealHistory.user_id, Recipe.calories, Recipe.protein, Recipe.carbohydrates, Recipe.fat)
        .join(Recipe, MealHistory.recipe_id == Recipe.id)
        .filter(MealHistory.action == "cooked")
        .filter(MealHistory.consumed_at >= datetime.combine(start, datetime.min.time()))
    )
    if user_id is not None:
        query = query.filter(MealHistory.user_id == user_id)
    totals: Dict[Any, Dict[str, float]] = {}
    users_per_day: Dict[Any, set] = {}
    for consumed_at, uid, calories, protein, carbs, fat in query.all():
        stamp = _as_utc(consumed_at)
        if stamp is None:
            continue
        day = stamp.date()
        bucket = totals.setdefault(day, {"calories": 0.0, "protein": 0.0, "carbohydrates": 0.0, "fat": 0.0, "meals": 0})
        bucket["calories"] += calories or 0.0
        bucket["protein"] += protein or 0.0
        bucket["carbohydrates"] += carbs or 0.0
        bucket["fat"] += fat or 0.0
        bucket["meals"] += 1
        users_per_day.setdefault(day, set()).add(uid)
    trend = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        bucket = totals.get(day, {"calories": 0.0, "protein": 0.0, "carbohydrates": 0.0, "fat": 0.0, "meals": 0})
        people = max(1, len(users_per_day.get(day, ()))) if user_id is None else 1
        trend.append({
            "date": day.isoformat(),
            "label": day.strftime("%d %b"),
            "meals": bucket["meals"],
            "calories": round(bucket["calories"] / people, 1),
            "protein": round(bucket["protein"] / people, 1),
            "carbohydrates": round(bucket["carbohydrates"] / people, 1),
            "fat": round(bucket["fat"] / people, 1),
        })
    return trend


def build_reports(db: Session) -> Dict[str, Any]:
    feedback_stats = (
        db.query(MealHistory.feedback, func.count(MealHistory.id))
        .filter(MealHistory.feedback.isnot(None))
        .group_by(MealHistory.feedback)
        .all()
    )
    avg_rating = db.query(func.avg(MealHistory.rating)).filter(MealHistory.rating.isnot(None)).scalar() or 0.0

    confidences = [row[0] for row in db.query(Recognition.confidence).all()]
    total_recognitions = len(confidences)
    high_confidence = sum(1 for c in confidences if c >= 0.5)

    distribution = []
    for label, low, high in CONFIDENCE_BUCKETS:
        count = sum(1 for c in confidences if low <= c < high)
        distribution.append({"range": label, "count": count, "percentage": _percentage(count, total_recognitions)})

    recognized = (
        db.query(Recognition.predicted_name, func.count(Recognition.id))
        .group_by(Recognition.predicted_name)
        .order_by(func.count(Recognition.id).desc())
        .limit(6)
        .all()
    )
    most_recognized = [
        {"name": name, "count": count, "percentage": _percentage(count, total_recognitions)}
        for name, count in recognized
    ]

    cooked = (
        db.query(Recipe.name, func.count(MealHistory.id))
        .join(MealHistory, MealHistory.recipe_id == Recipe.id)
        .filter(MealHistory.action == "cooked")
        .group_by(Recipe.name)
        .order_by(func.count(MealHistory.id).desc())
        .limit(5)
        .all()
    )
    planned = (
        db.query(Recipe.name, func.count(MealPlan.id))
        .join(MealPlan, MealPlan.recipe_id == Recipe.id)
        .group_by(Recipe.name)
        .order_by(func.count(MealPlan.id).desc())
        .limit(5)
        .all()
    )
    stocked = (
        db.query(Food.name, func.count(PantryItem.id))
        .join(PantryItem, PantryItem.food_id == Food.id)
        .group_by(Food.name)
        .order_by(func.count(PantryItem.id).desc())
        .limit(6)
        .all()
    )
    total_pantry_items = db.query(func.count(PantryItem.id)).scalar() or 0

    planned_days = db.query(MealPlan.user_id, MealPlan.plan_date).distinct().count()
    total_plan_entries = db.query(func.count(MealPlan.id)).scalar() or 0
    meals_logged = db.query(func.count(MealHistory.id)).filter(MealHistory.action == "cooked").scalar() or 0

    months = _last_months(6)
    scans_by_month = _bucket_by_month([row[0] for row in db.query(Recognition.created_at).all()], months)
    logs_by_month = _bucket_by_month([row[0] for row in db.query(MealHistory.consumed_at).filter(MealHistory.action == "cooked").all()], months)
    users_by_month = _bucket_by_month([row[0] for row in db.query(User.created_at).all()], months)
    pantry_by_month = _bucket_by_month([row[0] for row in db.query(PantryItem.created_at).all()], months)
    monthly_activity = [
        {
            "month": datetime(year, month, 1).strftime("%b"),
            "year": year,
            "scans": scans_by_month.get((year, month), 0),
            "meals_logged": logs_by_month.get((year, month), 0),
            "new_users": users_by_month.get((year, month), 0),
            "pantry_additions": pantry_by_month.get((year, month), 0),
        }
        for year, month in months
    ]

    action_counts = dict(
        db.query(MealHistory.action, func.count(MealHistory.id)).group_by(MealHistory.action).all()
    )
    nutrition_trend = _nutrition_trend(db, days=14)

    return {
        "report_name": "Smart Meal Planner System Diagnostic Report",
        "user_satisfaction": {
            "average_rating": round(float(avg_rating), 2),
            "feedback_breakdown": {item[0]: item[1] for item in feedback_stats},
            "meals_logged": meals_logged,
        },
        "computer_vision_performance": {
            "total_inferences": total_recognitions,
            "high_confidence_predictions": high_confidence,
            "high_confidence_rate_percentage": _percentage(high_confidence, total_recognitions),
            "confidence_distribution": distribution,
            "most_recognized_ingredients": most_recognized,
            "model": model_summary(),
        },
        "meal_planning": {
            "planned_days": planned_days,
            "plan_entries": total_plan_entries,
            "most_planned_recipes": [{"name": n, "count": c} for n, c in planned],
            "most_cooked_recipes": [{"name": n, "count": c} for n, c in cooked],
            "meal_actions": {
                "cooked": action_counts.get("cooked", 0),
                "skipped": action_counts.get("skipped", 0),
                "viewed": action_counts.get("viewed", 0),
            },
            "nutrition_trend": nutrition_trend,
        },
        "pantry": {
            "total_items": total_pantry_items,
            "top_ingredients": [{"name": n, "count": c} for n, c in stocked],
        },
        "monthly_activity": monthly_activity,
    }


def recent_activity(db: Session, limit: int = 8) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []

    recognitions = (
        db.query(Recognition, User.full_name)
        .join(FoodImage, Recognition.food_image_id == FoodImage.id)
        .join(User, FoodImage.user_id == User.id)
        .order_by(Recognition.created_at.desc())
        .limit(limit)
        .all()
    )
    for recognition, name in recognitions:
        events.append({
            "action": "Ingredient Scanned",
            "user": name,
            "detail": f"{recognition.predicted_name} ({round(recognition.confidence * 100, 1)}% confidence)",
            "timestamp": _as_utc(recognition.created_at),
        })

    logs = (
        db.query(MealHistory, User.full_name, Recipe.name)
        .join(User, MealHistory.user_id == User.id)
        .outerjoin(Recipe, MealHistory.recipe_id == Recipe.id)
        .filter(MealHistory.action != "viewed")
        .order_by(MealHistory.consumed_at.desc())
        .limit(limit)
        .all()
    )
    for log, name, recipe_name in logs:
        detail = recipe_name or log.meal_type
        if log.feedback:
            detail = f"{detail} (feedback: {log.feedback})"
        events.append({
            "action": "Meal Skipped" if log.action == "skipped" else "Meal Logged",
            "user": name,
            "detail": detail,
            "timestamp": _as_utc(log.consumed_at),
        })

    pantry = (
        db.query(PantryItem, User.full_name, Food.name)
        .join(User, PantryItem.user_id == User.id)
        .join(Food, PantryItem.food_id == Food.id)
        .order_by(PantryItem.created_at.desc())
        .limit(limit)
        .all()
    )
    for item, name, food_name in pantry:
        events.append({
            "action": "Pantry Updated",
            "user": name,
            "detail": f"Added {food_name}",
            "timestamp": _as_utc(item.created_at),
        })

    users = db.query(User).order_by(User.created_at.desc()).limit(limit).all()
    for user in users:
        events.append({
            "action": "User Registered",
            "user": user.full_name,
            "detail": user.email,
            "timestamp": _as_utc(user.created_at),
        })

    epoch = datetime.min.replace(tzinfo=timezone.utc)
    events.sort(key=lambda e: e["timestamp"] or epoch, reverse=True)
    return [
        {"id": index + 1, "action": e["action"], "user": e["user"], "detail": e["detail"], "time": _iso(e["timestamp"])}
        for index, e in enumerate(events[:limit])
    ]
