from datetime import date, datetime, timedelta, timezone
import random
import re
import zoneinfo
from typing import Dict, Any, List, Optional, Union, Tuple
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe
from app.models.dietary_profile import DietaryProfile
from app.models.meal_history import MealHistory
from app.recommendation.filters import filter_recipes
from app.recommendation.scoring import calculate_recipe_score
from app.recommendation.pantry_matcher import pantry_coverage
from app.services.ingredient_service import get_user_pantry_context
from app.services.feedback_service import get_feedback_map

MEAL_SLOTS = [
    ("Breakfast", 0.25),
    ("Morning Snack", 0.10),
    ("Lunch", 0.35),
    ("Evening Snack", 0.10),
    ("Dinner", 0.20),
]


def normalize_calendar_date(
    raw_date: Optional[Union[date, datetime, str]],
    user_tz: Optional[str] = None
) -> date:
    """
    Consistently normalize any date representation (None, date object, YYYY-MM-DD, ISO string,
    datetime with/without timezone) to an exact calendar date, respecting timezone transitions.
    """
    # 1. Fallback if None or empty
    if raw_date is None or raw_date == "":
        if user_tz:
            try:
                tz = zoneinfo.ZoneInfo(user_tz)
                return datetime.now(tz).date()
            except Exception:
                pass
        return date.today()

    # 2. If already a pure date object
    if isinstance(raw_date, date) and not isinstance(raw_date, datetime):
        return raw_date

    # 3. If a datetime object
    if isinstance(raw_date, datetime):
        if raw_date.tzinfo is not None and user_tz:
            try:
                tz = zoneinfo.ZoneInfo(user_tz)
                return raw_date.astimezone(tz).date()
            except Exception:
                pass
        return raw_date.date()

    # 4. If a string
    if isinstance(raw_date, str):
        s = raw_date.strip()
        # Direct YYYY-MM-DD regex match
        if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
            try:
                return datetime.strptime(s, "%Y-%m-%d").date()
            except Exception:
                pass

        # ISO format with timezone or Z (e.g. 2026-10-05T08:30:00Z or 2026-10-04T18:30:00+05:30)
        try:
            iso_str = s.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso_str)
            if dt.tzinfo is not None and user_tz:
                try:
                    tz = zoneinfo.ZoneInfo(user_tz)
                    return dt.astimezone(tz).date()
                except Exception:
                    pass
            return dt.date()
        except Exception:
            # Fallback regex extraction of YYYY-MM-DD prefix
            m = re.match(r"^(\d{4}-\d{2}-\d{2})", s)
            if m:
                try:
                    return datetime.strptime(m.group(1), "%Y-%m-%d").date()
                except Exception:
                    pass

    return date.today()


def _is_slot_appropriate(recipe: Recipe, slot_name: str) -> Tuple[bool, float]:
    """
    Check if a recipe naturally aligns with the planned meal slot.
    Returns (is_suitable, bonus_penalty_score).
    Ensures:
      - Breakfast recipes go to Breakfast
      - Snack recipes/salads/smoothies go to Morning and Evening Snacks
      - Lunch & Dinner get filling main course recipes
    """
    slot_lower = slot_name.lower()
    rec_type_lower = (recipe.meal_type or "").lower()
    rec_name_lower = (recipe.name or "").lower()

    if "breakfast" in slot_lower:
        if "breakfast" in rec_type_lower:
            return True, 35.0
        elif "snack" in rec_type_lower or "smoothie" in rec_name_lower or "oats" in rec_name_lower:
            return True, 10.0
        else:
            return False, -30.0

    elif "morning snack" in slot_lower:
        if "morning snack" in rec_type_lower or ("snack" in rec_type_lower and "evening" not in rec_type_lower):
            return True, 35.0
        elif any(k in rec_name_lower for k in ["smoothie", "fruit", "yogurt", "sprout", "nuts", "shake"]):
            return True, 30.0
        elif "breakfast" in rec_type_lower and recipe.calories <= 280:
            return True, 10.0
        elif recipe.calories > 350 or any(k in rec_type_lower for k in ["lunch", "dinner"]):
            return False, -40.0
        return True, 5.0

    elif "lunch" in slot_lower:
        if "lunch" in rec_type_lower:
            return True, 35.0
        elif "dinner" in rec_type_lower or "main" in rec_type_lower:
            return True, 20.0
        elif "snack" in rec_type_lower or recipe.calories < 250:
            return False, -30.0
        return True, 10.0

    elif "evening snack" in slot_lower:
        if "evening snack" in rec_type_lower or "snack" in rec_type_lower:
            return True, 35.0
        elif any(k in rec_name_lower for k in ["chaat", "salad", "toast", "makhana", "dhokla", "cutlet"]):
            return True, 30.0
        elif recipe.calories <= 340 and "dinner" not in rec_type_lower:
            return True, 15.0
        elif recipe.calories > 380 or any(k in rec_type_lower for k in ["lunch", "dinner"]):
            return False, -40.0
        return True, 5.0

    elif "dinner" in slot_lower:
        if "dinner" in rec_type_lower:
            return True, 35.0
        elif "lunch" in rec_type_lower or "main" in rec_type_lower:
            return True, 20.0
        elif "snack" in rec_type_lower or recipe.calories < 250:
            return False, -30.0
        return True, 10.0

    return True, 0.0


def _pantry_coverage_map(db: Session, user_id: int, recipes: List[Recipe]) -> Dict[int, float]:
    context = get_user_pantry_context(db, user_id)
    if not context.pantry_ids:
        return {}
    return {r.id: pantry_coverage(r, context) for r in recipes}


def _calculate_totals(items: List[MealPlan]) -> Dict[str, float]:
    """Calculate aggregate nutritional values for a list of meal plan items from actual recipes."""
    calories = sum((item.recipe.calories or 0.0) * (item.servings or 1) for item in items if item.recipe)
    protein = sum((item.recipe.protein or 0.0) * (item.servings or 1) for item in items if item.recipe)
    carbs = sum((item.recipe.carbohydrates or 0.0) * (item.servings or 1) for item in items if item.recipe)
    fat = sum((item.recipe.fat or 0.0) * (item.servings or 1) for item in items if item.recipe)
    fiber = sum((item.recipe.fiber or 0.0) * (item.servings or 1) for item in items if item.recipe)

    return {
        "calories": round(calories, 1),
        "protein": round(protein, 1),
        "carbohydrates": round(carbs, 1),
        "fat": round(fat, 1),
        "fiber": round(fiber, 1)
    }


def _load_day(db: Session, user_id: int, plan_date: date) -> List[MealPlan]:
    return (
        db.query(MealPlan)
        .options(joinedload(MealPlan.recipe))
        .filter(MealPlan.user_id == user_id, MealPlan.plan_date == plan_date)
        .all()
    )


def _day_payload(plan_date: date, items: List[MealPlan]) -> Dict[str, Any]:
    meals_dict: Dict[str, Optional[MealPlan]] = {slot: None for slot, _ in MEAL_SLOTS}
    for item in items:
        meals_dict[item.meal_type] = item
    return {
        "date": plan_date,
        "meals": meals_dict,
        "totals": _calculate_totals(items),
        "generated": len(items) > 0,
    }


def _pick_servings(recipe: Recipe, slot_target: float) -> int:
    calories = recipe.calories or 0.0
    if calories <= 0:
        return 1
    return 2 if abs(calories * 2 - slot_target) < abs(calories - slot_target) else 1


def _balance_servings(items: List[MealPlan], recipes_by_id: Dict[int, Recipe], daily_calories: float) -> None:
    def recipe_of(item: MealPlan) -> Optional[Recipe]:
        return item.recipe or recipes_by_id.get(item.recipe_id)

    def total() -> float:
        return sum((recipe_of(i).calories or 0.0) * (i.servings or 1) for i in items if recipe_of(i))

    current = total()
    while current < daily_calories * 0.92:
        options = [
            i for i in items
            if not i.locked and (i.servings or 1) < 2 and recipe_of(i)
            and (recipe_of(i).calories or 0.0) > 0
            and current + recipe_of(i).calories <= daily_calories * 1.08
            and (recipe_of(i).calories or 0.0) * 2 <= 650
        ]
        if not options:
            break
        best = max(options, key=lambda i: recipe_of(i).calories)
        best.servings = 2
        current = total()


def _eligible_recipes(db: Session, user_id: int, profile: Optional[DietaryProfile]) -> List[Recipe]:
    all_recipes = db.query(Recipe).all()
    safe_recipes = filter_recipes(all_recipes, profile) if profile else all_recipes
    if not safe_recipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recipes match your dietary restrictions and allergy criteria"
        )
    disliked = {rid for rid, fb in get_feedback_map(db, user_id).items() if fb == "negative"}
    liked_pool = [r for r in safe_recipes if r.id not in disliked]
    return liked_pool if len(liked_pool) >= len(MEAL_SLOTS) else safe_recipes


def _choose_for_slot(
    pool: List[Recipe],
    profile: Optional[DietaryProfile],
    slot_name: str,
    slot_target: float,
    used_today: set,
    coverage_map: Dict[int, float],
    week_usage: Optional[Dict[int, int]] = None,
    last_used_day: Optional[Dict[int, int]] = None,
    day_index: int = 0
) -> Recipe:
    scored: List[Tuple[Recipe, float]] = []
    for r in pool:
        _, slot_bonus = _is_slot_appropriate(r, slot_name)
        base_score, _ = calculate_recipe_score(
            recipe=r,
            profile=profile,
            target_calories_per_meal=slot_target,
            preferred_meal_type=slot_name,
            pantry_coverage=coverage_map.get(r.id, 0.0) if coverage_map else None
        )
        score = base_score + slot_bonus
        if r.id in used_today:
            score -= 150.0
        if last_used_day is not None and r.id in last_used_day:
            days_since = day_index - last_used_day[r.id]
            if days_since == 1:
                score -= 80.0
            elif days_since == 2:
                score -= 40.0
            elif days_since == 3:
                score -= 20.0
        if week_usage is not None:
            usage = week_usage.get(r.id, 0)
            score -= usage * 60.0
            if usage == 0:
                score += 25.0
        scored.append((r, score))
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[0][0] if scored else pool[0]


def _fill_day(
    db: Session,
    user_id: int,
    plan_date: date,
    profile: Optional[DietaryProfile],
    daily_calories: float,
    pool: List[Recipe],
    coverage_map: Dict[int, float],
    replace_unlocked: bool,
    week_usage: Optional[Dict[int, int]] = None,
    last_used_day: Optional[Dict[int, int]] = None,
    day_index: int = 0
) -> List[MealPlan]:
    existing = _load_day(db, user_id, plan_date)
    kept: List[MealPlan] = []
    for item in existing:
        if replace_unlocked and not item.locked:
            db.delete(item)
        else:
            kept.append(item)
    if replace_unlocked:
        db.flush()

    taken_slots = {item.meal_type for item in kept}
    used_today = {item.recipe_id for item in kept}
    created: List[MealPlan] = []

    for slot_name, calorie_fraction in MEAL_SLOTS:
        if slot_name in taken_slots:
            continue
        slot_target = daily_calories * calorie_fraction
        candidates = [r for r in pool if r.id not in used_today] or pool
        chosen = _choose_for_slot(
            candidates, profile, slot_name, slot_target, used_today, coverage_map,
            week_usage, last_used_day, day_index
        )
        used_today.add(chosen.id)
        if week_usage is not None:
            week_usage[chosen.id] = week_usage.get(chosen.id, 0) + 1
        if last_used_day is not None:
            last_used_day[chosen.id] = day_index
        item = MealPlan(
            user_id=user_id,
            plan_date=plan_date,
            meal_type=slot_name,
            recipe_id=chosen.id,
            servings=_pick_servings(chosen, slot_target)
        )
        db.add(item)
        created.append(item)

    _balance_servings(kept + created, {r.id: r for r in pool}, daily_calories)
    db.commit()
    return _load_day(db, user_id, plan_date)


def generate_daily_meal_plan(
    db: Session,
    user_id: int,
    target_date: Optional[Union[date, str]] = None,
    user_tz: Optional[str] = None,
    force_regenerate: bool = False,
    use_pantry: bool = False
) -> Dict[str, Any]:
    """
    Create (or refresh) a balanced 5-meal day tailored to the user's profile.
    Locked meals are kept, disliked recipes are avoided and portions are sized to the slot's calorie target.
    """
    norm_date = normalize_calendar_date(target_date, user_tz)
    existing = _load_day(db, user_id, norm_date)

    if existing and not force_regenerate and len({i.meal_type for i in existing}) >= len(MEAL_SLOTS):
        return _day_payload(norm_date, existing)

    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    daily_calories = profile.daily_calories if profile and profile.daily_calories else 2000.0
    pool = _eligible_recipes(db, user_id, profile)
    coverage_map = _pantry_coverage_map(db, user_id, pool) if use_pantry else {}

    items = _fill_day(
        db, user_id, norm_date, profile, daily_calories, pool, coverage_map,
        replace_unlocked=force_regenerate
    )
    return _day_payload(norm_date, items)


def get_daily_meal_plan(
    db: Session,
    user_id: int,
    target_date: Optional[Union[date, str]] = None,
    user_tz: Optional[str] = None
) -> Dict[str, Any]:
    """Return the stored plan for a date; nothing is generated until the user asks for it."""
    norm_date = normalize_calendar_date(target_date, user_tz)
    return _day_payload(norm_date, _load_day(db, user_id, norm_date))


DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _week_response(start_date: date, days: List[Dict[str, Any]]) -> Dict[str, Any]:
    keys = ("calories", "protein", "carbohydrates", "fat", "fiber")
    sums = {k: sum(d["totals"][k] for d in days) for k in keys}
    days_result = {DAY_NAMES[i]: day for i, day in enumerate(days)}
    return {
        "start_date": start_date,
        "end_date": start_date + timedelta(days=6),
        "days": days_result,
        "weekly_average_calories": round(sums["calories"] / 7.0, 1),
        "weekly_totals": {
            "average_daily_calories": round(sums["calories"] / 7.0, 1),
            "average_protein": round(sums["protein"] / 7.0, 1),
            "average_carbs": round(sums["carbohydrates"] / 7.0, 1),
            "average_fat": round(sums["fat"] / 7.0, 1),
            "average_fiber": round(sums["fiber"] / 7.0, 1),
            "total_calories": round(sums["calories"], 1),
            "total_protein": round(sums["protein"], 1),
            "total_carbs": round(sums["carbohydrates"], 1),
            "total_fat": round(sums["fat"], 1),
        },
    }


def generate_weekly_meal_plan(
    db: Session,
    user_id: int,
    start_date: Optional[Union[date, str]] = None,
    user_tz: Optional[str] = None,
    force_regenerate: bool = False,
    use_pantry: bool = False
) -> Dict[str, Any]:
    """
    Create (or refresh) a 7-day plan starting on the Monday of the requested week, rotating recipes
    for variety. Locked meals are kept and complete days are reused unless a refresh is requested.
    """
    norm_date = normalize_calendar_date(start_date, user_tz)
    aligned_start = norm_date - timedelta(days=norm_date.weekday())

    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    daily_calories = profile.daily_calories if profile and profile.daily_calories else 2000.0
    pool = _eligible_recipes(db, user_id, profile)
    coverage_map = _pantry_coverage_map(db, user_id, pool) if use_pantry else {}

    week_usage: Dict[int, int] = {r.id: 0 for r in pool}
    last_used_day: Dict[int, int] = {}
    days: List[Dict[str, Any]] = []

    for i in range(7):
        current = aligned_start + timedelta(days=i)
        existing = _load_day(db, user_id, current)
        complete = len({item.meal_type for item in existing}) >= len(MEAL_SLOTS)

        if complete and not force_regenerate:
            for item in existing:
                week_usage[item.recipe_id] = week_usage.get(item.recipe_id, 0) + 1
                last_used_day[item.recipe_id] = i
            days.append(_day_payload(current, existing))
            continue

        for item in existing:
            if item.locked:
                week_usage[item.recipe_id] = week_usage.get(item.recipe_id, 0) + 1
                last_used_day[item.recipe_id] = i

        items = _fill_day(
            db, user_id, current, profile, daily_calories, pool, coverage_map,
            replace_unlocked=force_regenerate,
            week_usage=week_usage, last_used_day=last_used_day, day_index=i
        )
        days.append(_day_payload(current, items))

    return _week_response(aligned_start, days)


def get_weekly_meal_plan(
    db: Session,
    user_id: int,
    start_date: Optional[Union[date, str]] = None,
    user_tz: Optional[str] = None
) -> Dict[str, Any]:
    """Return the stored week; days without a plan stay empty until the user generates one."""
    norm_date = normalize_calendar_date(start_date, user_tz)
    aligned_start = norm_date - timedelta(days=norm_date.weekday())
    days = [
        _day_payload(aligned_start + timedelta(days=i), _load_day(db, user_id, aligned_start + timedelta(days=i)))
        for i in range(7)
    ]
    return _week_response(aligned_start, days)


def _owned_item(db: Session, user_id: int, plan_id: int) -> MealPlan:
    item = (
        db.query(MealPlan)
        .options(joinedload(MealPlan.recipe))
        .filter(MealPlan.id == plan_id, MealPlan.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Planned meal {plan_id} not found")
    return item


def _unlog_completed(db: Session, item: MealPlan) -> None:
    if item.history_id:
        history = db.query(MealHistory).filter(MealHistory.id == item.history_id).first()
        if history and not history.feedback:
            db.delete(history)
    item.completed = False
    item.history_id = None


def swap_meal(db: Session, user_id: int, plan_id: int, use_pantry: bool = False) -> MealPlan:
    item = _owned_item(db, user_id, plan_id)
    if item.locked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unlock this meal before swapping it")

    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    daily_calories = profile.daily_calories if profile and profile.daily_calories else 2000.0
    fraction = dict(MEAL_SLOTS).get(item.meal_type, 0.2)
    slot_target = daily_calories * fraction

    pool = _eligible_recipes(db, user_id, profile)
    day_items = _load_day(db, user_id, item.plan_date)
    unavailable = {i.recipe_id for i in day_items}
    candidates = [r for r in pool if r.id not in unavailable]
    if not candidates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No other suitable recipe is available for this slot")

    coverage_map = _pantry_coverage_map(db, user_id, candidates) if use_pantry else {}
    ranked: List[Tuple[Recipe, float]] = []
    for r in candidates:
        _, slot_bonus = _is_slot_appropriate(r, item.meal_type)
        base_score, _ = calculate_recipe_score(
            recipe=r,
            profile=profile,
            target_calories_per_meal=slot_target,
            preferred_meal_type=item.meal_type,
            pantry_coverage=coverage_map.get(r.id, 0.0) if coverage_map else None
        )
        ranked.append((r, base_score + slot_bonus))
    ranked.sort(key=lambda pair: pair[1], reverse=True)
    chosen = random.choice([r for r, _ in ranked[:3]])

    if item.completed:
        _unlog_completed(db, item)
    item.recipe_id = chosen.id
    item.servings = _pick_servings(chosen, slot_target)
    db.commit()
    return _owned_item(db, user_id, plan_id)


def set_meal_locked(db: Session, user_id: int, plan_id: int, locked: bool) -> MealPlan:
    item = _owned_item(db, user_id, plan_id)
    item.locked = locked
    db.commit()
    return _owned_item(db, user_id, plan_id)


def set_meal_skipped(db: Session, user_id: int, plan_id: int, skipped: bool) -> MealPlan:
    item = _owned_item(db, user_id, plan_id)
    if skipped and not item.skipped:
        if item.completed:
            _unlog_completed(db, item)
        history = MealHistory(
            user_id=user_id,
            recipe_id=item.recipe_id,
            meal_type=item.meal_type,
            consumed_at=datetime.now(timezone.utc),
            action="skipped",
            notes="Skipped from meal plan"
        )
        db.add(history)
        db.flush()
        item.history_id = history.id
        item.skipped = True
    elif not skipped and item.skipped:
        if item.history_id:
            history = db.query(MealHistory).filter(MealHistory.id == item.history_id).first()
            if history and history.action == "skipped":
                db.delete(history)
        item.history_id = None
        item.skipped = False
    db.commit()
    return _owned_item(db, user_id, plan_id)


def set_meal_completed(db: Session, user_id: int, plan_id: int, completed: bool) -> MealPlan:
    item = _owned_item(db, user_id, plan_id)
    if completed and item.skipped:
        set_meal_skipped(db, user_id, plan_id, False)
        item = _owned_item(db, user_id, plan_id)
    if completed and not item.completed:
        history = MealHistory(
            user_id=user_id,
            recipe_id=item.recipe_id,
            meal_type=item.meal_type,
            consumed_at=datetime.now(timezone.utc),
            notes="Completed from meal plan"
        )
        db.add(history)
        db.flush()
        item.history_id = history.id
        item.completed = True
    elif not completed and item.completed:
        _unlog_completed(db, item)
    db.commit()
    return _owned_item(db, user_id, plan_id)
