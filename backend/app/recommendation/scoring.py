from typing import Tuple, List, Optional, Dict
from app.models.recipe import Recipe
from app.models.dietary_profile import DietaryProfile

WEIGHT_CALORIES = 20.0
WEIGHT_PROTEIN = 15.0
WEIGHT_PREFERENCE = 10.0
WEIGHT_MEAL_TYPE = 10.0
WEIGHT_HIGHLIGHT = 10.0
WEIGHT_PANTRY = 35.0


def _recipe_text(recipe: Recipe) -> str:
    link_names = [link.food.name for link in (recipe.ingredient_links or []) if link.food is not None]
    parts = [recipe.name or ""]
    parts.extend(str(i) for i in (recipe.ingredients or []))
    parts.extend(link_names)
    return " ".join(parts).lower()


def calculate_recipe_score(
    recipe: Recipe,
    profile: Optional[DietaryProfile] = None,
    target_calories_per_meal: Optional[float] = None,
    preferred_meal_type: Optional[str] = None,
    recognized_food_name: Optional[str] = None,
    recipe_feedback_history: Optional[Dict[int, str]] = None,
    pantry_coverage: Optional[float] = None
) -> Tuple[float, List[str]]:
    points = 0.0
    possible = 0.0
    reasons: List[str] = []

    if profile:
        reasons.append(f"Compatible with your {profile.diet_type or 'chosen'} diet")
        if profile.allergies:
            reasons.append("Free from your listed allergens")

    if profile and profile.daily_calories:
        expected_meal_calories = target_calories_per_meal or (profile.daily_calories / 3.0)
    else:
        expected_meal_calories = target_calories_per_meal or 600.0

    possible += WEIGHT_CALORIES
    calorie_diff = abs((recipe.calories or 0.0) - expected_meal_calories)
    if calorie_diff <= 100:
        points += WEIGHT_CALORIES
        reasons.append(f"Optimal calories ({recipe.calories:.0f} kcal) for this meal")
    elif calorie_diff <= 250:
        points += WEIGHT_CALORIES * 0.6
        reasons.append(f"Acceptable calories ({recipe.calories:.0f} kcal)")

    possible += WEIGHT_PROTEIN
    target_protein = (profile.protein_target / 3.0) if (profile and profile.protein_target) else 25.0
    if (recipe.protein or 0.0) >= target_protein * 0.8:
        points += WEIGHT_PROTEIN
        reasons.append(f"High protein content ({recipe.protein:.1f}g)")
    elif (recipe.protein or 0.0) >= target_protein * 0.5:
        points += WEIGHT_PROTEIN * 0.5
        reasons.append(f"Moderate protein content ({recipe.protein:.1f}g)")

    preferred = [p.lower().strip() for p in (profile.preferred_foods or [])] if profile else []
    preferred = [p for p in preferred if p]
    if preferred:
        possible += WEIGHT_PREFERENCE
        recipe_text = _recipe_text(recipe)
        matched_preferred = [p for p in preferred if p in recipe_text]
        if matched_preferred:
            points += WEIGHT_PREFERENCE
            reasons.append(f"Matches preferred foods: {', '.join(matched_preferred[:3])}")

    if preferred_meal_type:
        possible += WEIGHT_MEAL_TYPE
        if preferred_meal_type.lower() in (recipe.meal_type or "").lower():
            points += WEIGHT_MEAL_TYPE
            reasons.append(f"Matches meal type: {recipe.meal_type}")

    if recognized_food_name:
        possible += WEIGHT_HIGHLIGHT
        highlight = recognized_food_name.strip().lower()
        if highlight and highlight in _recipe_text(recipe):
            points += WEIGHT_HIGHLIGHT
            reasons.append(f"Uses {recognized_food_name.strip()}")

    if pantry_coverage is not None:
        possible += WEIGHT_PANTRY
        coverage = max(0.0, min(1.0, pantry_coverage))
        points += WEIGHT_PANTRY * coverage
        if coverage > 0:
            reasons.append(f"Uses {round(coverage * 100)}% of its ingredients from your pantry")

    score = (points / possible) * 100.0 if possible else 0.0

    if recipe_feedback_history and recipe.id in recipe_feedback_history:
        feedback = recipe_feedback_history[recipe.id]
        if feedback == "positive":
            score += 5.0
            reasons.append("You rated this recipe positively before")
        elif feedback == "negative":
            score -= 15.0
            reasons.append("You rated this recipe negatively before")

    return round(max(0.0, min(100.0, score)), 1), reasons
