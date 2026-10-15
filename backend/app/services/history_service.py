from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.meal_history import MealHistory
from app.models.recipe import Recipe
from app.models.recognition import Recognition
from app.models.food_image import FoodImage
from app.schemas.history import MealHistoryCreate, MealFeedbackCreate


def create_meal_history(
    db: Session,
    user_id: int,
    history_in: MealHistoryCreate
) -> MealHistory:
    """Record consumption of a meal with optional initial feedback and rating."""
    history = MealHistory(
        user_id=user_id,
        food_id=history_in.food_id,
        recipe_id=history_in.recipe_id,
        recognition_id=history_in.recognition_id,
        meal_type=history_in.meal_type,
        consumed_at=history_in.consumed_at or datetime.now(timezone.utc),
        feedback=history_in.feedback,
        rating=history_in.rating,
        notes=history_in.notes,
        action=history_in.action or "cooked"
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def log_recipe_view(db: Session, user_id: int, recipe_id: int) -> Optional[MealHistory]:
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    start = datetime.combine(datetime.now(timezone.utc).date(), datetime.min.time())
    existing = (
        db.query(MealHistory)
        .filter(
            MealHistory.user_id == user_id,
            MealHistory.recipe_id == recipe_id,
            MealHistory.action == "viewed",
            MealHistory.consumed_at >= start,
        )
        .first()
    )
    if existing:
        return existing
    history = MealHistory(
        user_id=user_id,
        recipe_id=recipe_id,
        meal_type=recipe.meal_type,
        consumed_at=datetime.now(timezone.utc),
        action="viewed",
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def get_user_insights(db: Session, user_id: int, days: int = 14) -> Dict[str, Any]:
    from app.services.analytics_service import _nutrition_trend
    from app.services.user_service import get_or_create_dietary_profile

    profile = get_or_create_dietary_profile(db, user_id)
    trend = _nutrition_trend(db, days=days, user_id=user_id)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    actions = dict(
        db.query(MealHistory.action, func.count(MealHistory.id))
        .filter(MealHistory.user_id == user_id, MealHistory.consumed_at >= since)
        .group_by(MealHistory.action)
        .all()
    )
    top = (
        db.query(Recipe.name, func.count(MealHistory.id))
        .join(MealHistory, MealHistory.recipe_id == Recipe.id)
        .filter(MealHistory.user_id == user_id, MealHistory.action == "cooked")
        .group_by(Recipe.name)
        .order_by(func.count(MealHistory.id).desc())
        .limit(5)
        .all()
    )
    by_slot = dict(
        db.query(MealHistory.meal_type, func.count(MealHistory.id))
        .filter(MealHistory.user_id == user_id, MealHistory.action == "cooked", MealHistory.consumed_at >= since)
        .group_by(MealHistory.meal_type)
        .all()
    )
    scans = (
        db.query(Recognition.predicted_name, func.count(Recognition.id))
        .join(FoodImage, Recognition.food_image_id == FoodImage.id)
        .filter(FoodImage.user_id == user_id)
        .group_by(Recognition.predicted_name)
        .order_by(func.count(Recognition.id).desc())
        .limit(5)
        .all()
    )
    scan_total = (
        db.query(func.count(Recognition.id))
        .join(FoodImage, Recognition.food_image_id == FoodImage.id)
        .filter(FoodImage.user_id == user_id)
        .scalar()
        or 0
    )
    avg_rating = (
        db.query(func.avg(MealHistory.rating))
        .filter(MealHistory.user_id == user_id, MealHistory.rating.isnot(None))
        .scalar()
    )

    active_days = [d for d in trend if d["meals"] > 0]
    def average(key: str) -> float:
        return round(sum(d[key] for d in active_days) / len(active_days), 1) if active_days else 0.0

    return {
        "days": days,
        "trend": trend,
        "targets": {
            "calories": profile.daily_calories or 2000.0,
            "protein": profile.protein_target or 75.0,
            "carbohydrates": profile.carbohydrate_target or 250.0,
            "fat": profile.fat_target or 65.0,
        },
        "averages": {
            "calories": average("calories"),
            "protein": average("protein"),
            "carbohydrates": average("carbohydrates"),
            "fat": average("fat"),
        },
        "active_days": len(active_days),
        "actions": {
            "cooked": actions.get("cooked", 0),
            "skipped": actions.get("skipped", 0),
            "viewed": actions.get("viewed", 0),
        },
        "by_meal_type": by_slot,
        "top_recipes": [{"name": n, "count": c} for n, c in top],
        "scans": {"total": scan_total, "top": [{"name": n, "count": c} for n, c in scans]},
        "average_rating": round(float(avg_rating), 2) if avg_rating else None,
    }


def submit_meal_feedback(
    db: Session,
    user_id: int,
    feedback_in: MealFeedbackCreate
) -> MealHistory:
    """Submit or update feedback, rating, and notes for a meal record."""
    history = None
    if feedback_in.history_id:
        history = (
            db.query(MealHistory)
            .filter(MealHistory.id == feedback_in.history_id, MealHistory.user_id == user_id)
            .first()
        )

    if not history:
        # Create a new consumption feedback log
        history = MealHistory(
            user_id=user_id,
            meal_type="Meal",
            consumed_at=datetime.now(timezone.utc),
            feedback=feedback_in.feedback,
            rating=feedback_in.rating or (5 if feedback_in.feedback == "positive" else 2),
            notes=feedback_in.notes
        )
        db.add(history)
    else:
        history.feedback = feedback_in.feedback
        if feedback_in.rating is not None:
            history.rating = feedback_in.rating
        if feedback_in.notes is not None:
            history.notes = feedback_in.notes

    db.commit()
    db.refresh(history)
    if history.recipe_id and history.feedback in ("positive", "negative", "neutral"):
        from app.services.feedback_service import set_recipe_rating
        set_recipe_rating(db, user_id, history.recipe_id, history.feedback)
    return history


def get_user_meal_history(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    target_date: Optional[date] = None,
    meal_type: Optional[str] = None,
    food_id: Optional[int] = None,
    action: Optional[str] = None
) -> List[MealHistory]:
    """Retrieve logged meal entries for authenticated user with optional date/meal_type/food filters."""
    query = db.query(MealHistory).filter(MealHistory.user_id == user_id)

    if target_date:
        query = query.filter(
            MealHistory.consumed_at >= datetime.combine(target_date, datetime.min.time()),
            MealHistory.consumed_at <= datetime.combine(target_date, datetime.max.time())
        )
    if meal_type:
        query = query.filter(MealHistory.meal_type.ilike(f"%{meal_type}%"))
    if food_id:
        query = query.filter(MealHistory.food_id == food_id)
    if action:
        query = query.filter(MealHistory.action == action)
    else:
        query = query.filter(MealHistory.action != "viewed")

    return query.order_by(MealHistory.consumed_at.desc()).offset(skip).limit(limit).all()


def get_meal_history_by_id(
    db: Session,
    history_id: int,
    user_id: int
) -> MealHistory:
    """Retrieve single meal history entry owned by user."""
    history = (
        db.query(MealHistory)
        .filter(MealHistory.id == history_id, MealHistory.user_id == user_id)
        .first()
    )
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meal history record with ID {history_id} not found"
        )
    return history
