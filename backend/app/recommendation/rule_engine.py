from typing import List, Optional, Dict, Any
from app.models.recipe import Recipe
from app.models.dietary_profile import DietaryProfile
from app.recommendation.filters import filter_recipes
from app.recommendation.scoring import calculate_recipe_score
from app.recommendation.pantry_matcher import PantryContext, pantry_coverage

SLOT_CALORIE_SHARE = {
    "breakfast": 0.25,
    "morning snack": 0.10,
    "lunch": 0.35,
    "evening snack": 0.10,
    "snack": 0.10,
    "dinner": 0.20,
}


def generate_recommendations(
    all_recipes: List[Recipe],
    profile: Optional[DietaryProfile] = None,
    meal_type: Optional[str] = None,
    target_calories: Optional[float] = None,
    recognized_food_name: Optional[str] = None,
    feedback_history: Optional[Dict[int, str]] = None,
    limit: int = 5,
    pantry_context: Optional[PantryContext] = None,
    recent_counts: Optional[Dict[int, int]] = None
) -> List[Dict[str, Any]]:
    """
    Combines strict elimination filtering and multi-factor scoring to rank recipes.
    Returns sorted list of dictionaries with recipe, score, match_reasons, and flags.
    """
    # 1. Apply strict elimination filters
    candidate_recipes = filter_recipes(all_recipes, profile) if profile else all_recipes

    # 2. Filter by meal_type if provided
    if meal_type:
        filtered_by_type = [
            r for r in candidate_recipes
            if meal_type.lower() in r.meal_type.lower() or r.meal_type.lower() in meal_type.lower()
        ]
        # Only narrow down if matches exist, else keep candidates
        if filtered_by_type:
            candidate_recipes = filtered_by_type

    # 3. Score each safe recipe
    daily_calories = profile.daily_calories if (profile and profile.daily_calories) else 2000.0
    ranked = []
    for recipe in candidate_recipes:
        coverage = pantry_coverage(recipe, pantry_context) if pantry_context and pantry_context.pantry_ids else None
        slot_target = target_calories
        if slot_target is None and not meal_type:
            slot_target = daily_calories * SLOT_CALORIE_SHARE.get((recipe.meal_type or "").lower(), 1.0 / 3.0)
        score, reasons = calculate_recipe_score(
            recipe=recipe,
            profile=profile,
            target_calories_per_meal=slot_target,
            preferred_meal_type=meal_type,
            recognized_food_name=recognized_food_name,
            recipe_feedback_history=feedback_history,
            pantry_coverage=coverage
        )
        repeats = (recent_counts or {}).get(recipe.id, 0)
        if repeats:
            score = round(max(0.0, score - min(30.0, 12.0 * repeats)), 1)
            reasons.append(f"Lowered for variety: you had this {repeats} time{'s' if repeats > 1 else ''} this week")
        ranked.append({
            "recipe": recipe,
            "score": score,
            "match_reasons": reasons,
            "diet_compatible": True,
            "allergy_safe": True,
            "pantry_coverage": round(coverage * 100) if coverage is not None else None
        })

    # 4. Sort descending by score
    ranked.sort(key=lambda item: item["score"], reverse=True)

    return ranked[:limit]
