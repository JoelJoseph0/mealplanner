from app.services.auth_service import register_user, authenticate_user, create_token_for_user
from app.services.user_service import get_user_by_id, update_user_profile, update_user_preferences
from app.services.food_service import get_all_foods, get_food_by_id, create_food, update_food, delete_food
from app.services.nutrition_service import get_nutrition_by_food_id, get_nutrition_by_id, create_nutrition, update_nutrition, delete_nutrition
from app.services.recognition_service import process_and_recognize_food, get_user_recognition_history, get_recognition_by_id
from app.services.recipe_service import get_recipes, get_recipe_by_id, create_recipe, update_recipe, delete_recipe
from app.services.recommendation_service import get_recommendations_for_user
from app.services.meal_planner_service import generate_daily_meal_plan, get_daily_meal_plan, generate_weekly_meal_plan, get_weekly_meal_plan
from app.services.history_service import create_meal_history, submit_meal_feedback, get_user_meal_history, get_meal_history_by_id
from app.services.ingredient_service import search_ingredients, sync_recipe_ingredients
from app.services.pantry_service import list_pantry, add_pantry_items, update_pantry_item, remove_pantry_item, clear_pantry, suggest_recipes

__all__ = [
    "register_user",
    "authenticate_user",
    "create_token_for_user",
    "get_user_by_id",
    "update_user_profile",
    "update_user_preferences",
    "get_all_foods",
    "get_food_by_id",
    "create_food",
    "update_food",
    "delete_food",
    "get_nutrition_by_food_id",
    "get_nutrition_by_id",
    "create_nutrition",
    "update_nutrition",
    "delete_nutrition",
    "process_and_recognize_food",
    "get_user_recognition_history",
    "get_recognition_by_id",
    "get_recipes",
    "get_recipe_by_id",
    "create_recipe",
    "update_recipe",
    "delete_recipe",
    "get_recommendations_for_user",
    "generate_daily_meal_plan",
    "get_daily_meal_plan",
    "generate_weekly_meal_plan",
    "get_weekly_meal_plan",
    "create_meal_history",
    "submit_meal_feedback",
    "get_user_meal_history",
    "get_meal_history_by_id",
    "search_ingredients",
    "sync_recipe_ingredients",
    "list_pantry",
    "add_pantry_items",
    "update_pantry_item",
    "remove_pantry_item",
    "clear_pantry",
    "suggest_recipes",
]
