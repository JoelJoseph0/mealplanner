from typing import Dict, Any, List
from sqlalchemy.orm import Session, joinedload
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.services.ingredient_service import get_user_pantry_context
from app.services.feedback_service import get_feedback_map
from app.models.food import Food
from app.models.meal_history import MealHistory
from app.models.dietary_profile import DietaryProfile
from app.schemas.recommendation import RecommendationRequest
from app.recommendation.rule_engine import generate_recommendations


def get_recommendations_for_user(
    db: Session,
    user_id: int,
    request: RecommendationRequest
) -> Dict[str, Any]:
    """
    Produce personalized, allergy-safe recipe recommendations:
    1. Loads user DietaryProfile (diet type, allergies, preferences, avoided foods)
    2. Collects past feedback history for recipe score adjustment
    3. Resolves recognized food name if food_id is provided
    4. Executes rule-based filtering and multi-factor scoring
    5. Returns ranked results with transparent match reasons
    """
    # 1. Fetch user profile
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()

    # 2. Gather user's past meal feedback history
    feedback_map: Dict[int, str] = get_feedback_map(db, user_id)

    # 3. Resolve recognized food name
    recognized_food_name = request.recognized_food_name
    if not recognized_food_name and request.recognized_food_id:
        food = db.query(Food).filter(Food.id == request.recognized_food_id).first()
        if food:
            recognized_food_name = food.name

    # 4. Fetch all available recipes
    all_recipes = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredient_links).joinedload(RecipeIngredient.food))
        .all()
    )

    pantry_context = get_user_pantry_context(db, user_id) if request.use_pantry else None

    # 5. Execute recommendation engine
    recommendations = generate_recommendations(
        all_recipes=all_recipes,
        profile=profile,
        meal_type=request.meal_type,
        target_calories=request.target_calories,
        recognized_food_name=recognized_food_name,
        feedback_history=feedback_map,
        limit=request.limit or 5,
        pantry_context=pantry_context
    )

    return {
        "total_evaluated": len(all_recipes),
        "recommendations": recommendations
    }
