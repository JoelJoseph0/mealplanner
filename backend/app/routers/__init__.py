from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.foods import router as foods_router
from app.routers.ingredients import router as ingredients_router
from app.routers.pantry import router as pantry_router
from app.routers.shopping import router as shopping_router
from app.routers.recognition import router as recognition_router
from app.routers.nutrition import router as nutrition_router
from app.routers.recipes import router as recipes_router
from app.routers.recommendations import router as recommendations_router
from app.routers.meal_plans import router as meal_plans_router
from app.routers.history import router as history_router
from app.routers.admin import router as admin_router

__all__ = [
    "auth_router",
    "users_router",
    "foods_router",
    "ingredients_router",
    "pantry_router",
    "shopping_router",
    "recognition_router",
    "nutrition_router",
    "recipes_router",
    "recommendations_router",
    "meal_plans_router",
    "history_router",
    "admin_router",
]
