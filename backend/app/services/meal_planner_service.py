from datetime import date, datetime, timedelta
import re
import zoneinfo
from typing import Dict, Any, List, Optional, Union, Tuple
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe
from app.models.dietary_profile import DietaryProfile
from app.recommendation.filters import filter_recipes
from app.recommendation.scoring import calculate_recipe_score
from app.recommendation.pantry_matcher import pantry_coverage
from app.services.ingredient_service import get_user_pantry_context

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


def generate_daily_meal_plan(
    db: Session,
    user_id: int,
    target_date: Optional[Union[date, str]] = None,
    user_tz: Optional[str] = None,
    force_regenerate: bool = False,
    use_pantry: bool = False
) -> Dict[str, Any]:
    """
    Generate or retrieve a balanced 5-meal daily plan tailored to user's dietary profile.
    Strictly enforces zero intra-day repetition when sufficient recipes exist.
    Calculates exact nutrition totals from actual recipes.
    """
    norm_date = normalize_calendar_date(target_date, user_tz)

    # Check for existing plan on this date
    existing_items = (
        db.query(MealPlan)
        .options(joinedload(MealPlan.recipe))
        .filter(MealPlan.user_id == user_id, MealPlan.plan_date == norm_date)
        .all()
    )

    if existing_items and not force_regenerate:
        meals_dict = {slot: None for slot, _ in MEAL_SLOTS}
        for item in existing_items:
            meals_dict[item.meal_type] = item

        return {
            "date": norm_date,
            "meals": meals_dict,
            "totals": _calculate_totals(existing_items)
        }

    # If force_regenerate, clear previous plan for this day
    if existing_items and force_regenerate:
        for item in existing_items:
            db.delete(item)
        db.flush()

    # Load user dietary profile
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    daily_calories = profile.daily_calories if profile and profile.daily_calories else 2000.0

    # Fetch and filter eligible recipes
    all_recipes = db.query(Recipe).all()
    safe_recipes = filter_recipes(all_recipes, profile) if profile else all_recipes

    if not safe_recipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recipes match your dietary restrictions and allergy criteria"
        )

    coverage_map = _pantry_coverage_map(db, user_id, safe_recipes) if use_pantry else {}

    meals_dict = {}
    created_items = []
    used_today_ids = set()

    for slot_name, calorie_fraction in MEAL_SLOTS:
        slot_target_cals = daily_calories * calorie_fraction

        # Separate available recipes that have not been used today
        available_candidates = [r for r in safe_recipes if r.id not in used_today_ids]
        candidate_pool = available_candidates if available_candidates else safe_recipes

        scored_candidates = []
        for r in candidate_pool:
            _, slot_bonus = _is_slot_appropriate(r, slot_name)
            base_score, _ = calculate_recipe_score(
                recipe=r,
                profile=profile,
                target_calories_per_meal=slot_target_cals,
                preferred_meal_type=slot_name,
                pantry_coverage=coverage_map.get(r.id, 0.0) if coverage_map else None
            )
            final_score = base_score + slot_bonus

            # Strict intra-day penalty if forced to pick a previously used recipe
            if r.id in used_today_ids:
                final_score -= 150.0

            scored_candidates.append((r, final_score))

        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        chosen_recipe = scored_candidates[0][0] if scored_candidates else safe_recipes[0]
        used_today_ids.add(chosen_recipe.id)

        plan_item = MealPlan(
            user_id=user_id,
            plan_date=norm_date,
            meal_type=slot_name,
            recipe_id=chosen_recipe.id,
            servings=1
        )
        db.add(plan_item)
        created_items.append(plan_item)
        meals_dict[slot_name] = plan_item

    db.commit()
    for item in created_items:
        db.refresh(item)

    return {
        "date": norm_date,
        "meals": meals_dict,
        "totals": _calculate_totals(created_items)
    }


def get_daily_meal_plan(
    db: Session,
    user_id: int,
    target_date: Optional[Union[date, str]] = None,
    user_tz: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieve existing daily meal plan for a specific date or generate automatically."""
    norm_date = normalize_calendar_date(target_date, user_tz)

    existing_items = (
        db.query(MealPlan)
        .options(joinedload(MealPlan.recipe))
        .filter(MealPlan.user_id == user_id, MealPlan.plan_date == norm_date)
        .all()
    )

    if not existing_items:
        return generate_daily_meal_plan(db, user_id, target_date=norm_date, user_tz=user_tz)

    meals_dict = {slot: None for slot, _ in MEAL_SLOTS}
    for item in existing_items:
        meals_dict[item.meal_type] = item

    return {
        "date": norm_date,
        "meals": meals_dict,
        "totals": _calculate_totals(existing_items)
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
    Generate 7-day meal plan starting from Monday of target week.
    Normalizes start_date to respect user's timezone consistently.
    Enforces strict anti-repetition rotation to maximize variety across the week.
    Calculates exact aggregate daily and weekly nutritional totals from actual recipes.
    """
    # 1. Consistently resolve calendar date for client's timezone
    norm_date = normalize_calendar_date(start_date, user_tz)
    # Always align start_date to Monday of that week
    aligned_start_date = norm_date - timedelta(days=norm_date.weekday())

    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    daily_calories = profile.daily_calories if profile and profile.daily_calories else 2000.0

    all_recipes = db.query(Recipe).all()
    safe_recipes = filter_recipes(all_recipes, profile) if profile else all_recipes

    if not safe_recipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recipes match your dietary restrictions and allergy criteria"
        )

    coverage_map = _pantry_coverage_map(db, user_id, safe_recipes) if use_pantry else {}

    days_result = {}
    total_week_cals = 0.0
    total_week_protein = 0.0
    total_week_carbs = 0.0
    total_week_fat = 0.0
    total_week_fiber = 0.0

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    # Global weekly tracking for variety & anti-repetition
    week_usage_counts: Dict[int, int] = {r.id: 0 for r in safe_recipes}
    last_used_day: Dict[int, int] = {}  # recipe_id -> day_index (0..6)

    for i in range(7):
        curr_date = aligned_start_date + timedelta(days=i)
        day_name = day_names[i]

        # Check existing items
        existing_items = (
            db.query(MealPlan)
            .options(joinedload(MealPlan.recipe))
            .filter(MealPlan.user_id == user_id, MealPlan.plan_date == curr_date)
            .all()
        )

        # If already populated and complete, reuse
        if existing_items and len(existing_items) == len(MEAL_SLOTS) and not force_regenerate:
            meals_dict = {slot: None for slot, _ in MEAL_SLOTS}
            for item in existing_items:
                meals_dict[item.meal_type] = item
                if item.recipe_id:
                    week_usage_counts[item.recipe_id] = week_usage_counts.get(item.recipe_id, 0) + 1
                    last_used_day[item.recipe_id] = i

            totals = _calculate_totals(existing_items)
            total_week_cals += totals["calories"]
            total_week_protein += totals["protein"]
            total_week_carbs += totals["carbohydrates"]
            total_week_fat += totals["fat"]
            total_week_fiber += totals["fiber"]

            days_result[day_name] = {
                "date": curr_date,
                "meals": meals_dict,
                "totals": totals
            }
            continue

        # If regenerating or incomplete, clear existing entries for this day
        if existing_items:
            for item in existing_items:
                db.delete(item)
            db.flush()

        created_items = []
        meals_dict = {}
        used_today_ids = set()

        for slot_name, calorie_fraction in MEAL_SLOTS:
            slot_target = daily_calories * calorie_fraction

            # Prefer recipes not used today
            available_today = [r for r in safe_recipes if r.id not in used_today_ids]
            pool = available_today if available_today else safe_recipes

            scored_candidates = []
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

                # 1. Intra-day penalty (prevent same recipe on same day)
                if r.id in used_today_ids:
                    score -= 150.0

                # 2. Recency penalty (discourage eating what you had yesterday or 2 days ago)
                if r.id in last_used_day:
                    days_since = i - last_used_day[r.id]
                    if days_since == 1:
                        score -= 80.0
                    elif days_since == 2:
                        score -= 40.0
                    elif days_since == 3:
                        score -= 20.0

                # 3. Frequency penalty (heavily penalize recipes already used multiple times this week)
                usage_count = week_usage_counts.get(r.id, 0)
                score -= (usage_count * 60.0)

                # 4. Variety bonus for recipes completely unused this week
                if usage_count == 0:
                    score += 25.0

                scored_candidates.append((r, score))

            scored_candidates.sort(key=lambda x: x[1], reverse=True)
            chosen_recipe = scored_candidates[0][0] if scored_candidates else safe_recipes[0]

            used_today_ids.add(chosen_recipe.id)
            week_usage_counts[chosen_recipe.id] = week_usage_counts.get(chosen_recipe.id, 0) + 1
            last_used_day[chosen_recipe.id] = i

            item = MealPlan(
                user_id=user_id,
                plan_date=curr_date,
                meal_type=slot_name,
                recipe_id=chosen_recipe.id,
                servings=1
            )
            db.add(item)
            created_items.append(item)
            meals_dict[slot_name] = item

        db.commit()
        for item in created_items:
            db.refresh(item)

        totals = _calculate_totals(created_items)
        total_week_cals += totals["calories"]
        total_week_protein += totals["protein"]
        total_week_carbs += totals["carbohydrates"]
        total_week_fat += totals["fat"]
        total_week_fiber += totals["fiber"]

        days_result[day_name] = {
            "date": curr_date,
            "meals": meals_dict,
            "totals": totals
        }

    weekly_totals = {
        "average_daily_calories": round(total_week_cals / 7.0, 1),
        "average_protein": round(total_week_protein / 7.0, 1),
        "average_carbs": round(total_week_carbs / 7.0, 1),
        "average_fat": round(total_week_fat / 7.0, 1),
        "average_fiber": round(total_week_fiber / 7.0, 1),
        "total_calories": round(total_week_cals, 1),
        "total_protein": round(total_week_protein, 1),
        "total_carbs": round(total_week_carbs, 1),
        "total_fat": round(total_week_fat, 1),
    }

    end_date = aligned_start_date + timedelta(days=6)
    return {
        "start_date": aligned_start_date,
        "end_date": end_date,
        "days": days_result,
        "weekly_average_calories": round(total_week_cals / 7.0, 1),
        "weekly_totals": weekly_totals
    }


def get_weekly_meal_plan(
    db: Session,
    user_id: int,
    start_date: Optional[Union[date, str]] = None,
    user_tz: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieve existing weekly meal plan or generate if missing."""
    return generate_weekly_meal_plan(db, user_id, start_date=start_date, user_tz=user_tz, force_regenerate=False)

