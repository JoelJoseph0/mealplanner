from typing import Any, Optional, Dict


def api_response(data: Any = None, message: str = "Operation completed successfully", success: bool = True) -> Dict[str, Any]:
    """Standardized API response structure helper."""
    return {
        "success": success,
        "message": message,
        "data": data
    }


GOAL_RULES = {
    "maintain": (0.0, (0.20, 0.50, 0.30)),
    "lose": (-500.0, (0.30, 0.40, 0.30)),
    "gain": (300.0, (0.20, 0.50, 0.30)),
    "muscle": (250.0, (0.30, 0.45, 0.25)),
}

GOAL_LABELS = {
    "maintain": "Maintain weight",
    "lose": "Lose weight",
    "gain": "Gain weight",
    "muscle": "Build muscle",
}


def calculate_daily_targets(
    weight: Optional[float],
    height: Optional[float],
    age: Optional[int],
    gender: Optional[str],
    activity_level: Optional[str],
    goal: Optional[str] = None
) -> Dict[str, float]:
    """
    Calculate estimated calorie and macro targets using Mifflin-St Jeor equation.
    Defaults to 2000 kcal if insufficient profile data is provided.
    """
    if not (weight and height and age and gender):
        return {
            "daily_calories": 2000.0,
            "protein_target": 75.0,
            "carbohydrate_target": 250.0,
            "fat_target": 65.0
        }

    # BMR calculation
    if gender.lower() == "male":
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    else:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161

    # Activity multiplier
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "lightly active": 1.375,
        "moderate": 1.55,
        "moderately active": 1.55,
        "active": 1.725,
        "very active": 1.725,
        "very_active": 1.9,
        "extra active": 1.9
    }
    multiplier = activity_multipliers.get((activity_level or "moderate").strip().lower(), 1.55)
    tdee = round(bmr * multiplier, 1)

    adjustment, split = GOAL_RULES.get((goal or "maintain").lower(), GOAL_RULES["maintain"])
    floor = 1500.0 if gender.lower() == "male" else 1200.0
    tdee = round(max(min(floor, tdee), tdee + adjustment), 1)
    protein_share, carb_share, fat_share = split

    protein_g = round((tdee * protein_share) / 4.0, 1)
    carbs_g = round((tdee * carb_share) / 4.0, 1)
    fat_g = round((tdee * fat_share) / 9.0, 1)

    return {
        "daily_calories": tdee,
        "protein_target": protein_g,
        "carbohydrate_target": carbs_g,
        "fat_target": fat_g
    }
