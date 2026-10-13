from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

DataT = TypeVar("DataT")


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[DataT] = None


from app.schemas.auth import UserRegister, UserLogin, Token, TokenData
from app.schemas.user import UserResponse, UserUpdate, UserProfileUpdate, UserPreferencesUpdate
from app.schemas.dietary_profile import DietaryProfileResponse, DietaryProfileUpdate
from app.schemas.food import FoodCreate, FoodUpdate, FoodResponse, FoodWithNutritionResponse
from app.schemas.nutrition import NutritionCreate, NutritionUpdate, NutritionResponse
from app.schemas.recognition import RecognitionResponse, PredictionResult
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.schemas.meal_plan import DailyMealPlanResponse, WeeklyMealPlanResponse
from app.schemas.history import MealHistoryCreate, MealFeedbackCreate, MealHistoryResponse
from app.schemas.pantry import PantryAddRequest, PantryItemUpdate, PantryItemResponse, CookSuggestionRequest

__all__ = [
    "ApiResponse",
    "UserRegister",
    "UserLogin",
    "Token",
    "TokenData",
    "UserResponse",
    "UserUpdate",
    "UserProfileUpdate",
    "UserPreferencesUpdate",
    "DietaryProfileResponse",
    "DietaryProfileUpdate",
    "FoodCreate",
    "FoodUpdate",
    "FoodResponse",
    "FoodWithNutritionResponse",
    "NutritionCreate",
    "NutritionUpdate",
    "NutritionResponse",
    "RecognitionResponse",
    "PredictionResult",
    "RecipeCreate",
    "RecipeUpdate",
    "RecipeResponse",
    "RecommendationRequest",
    "RecommendationResponse",
    "DailyMealPlanResponse",
    "WeeklyMealPlanResponse",
    "MealHistoryCreate",
    "MealFeedbackCreate",
    "MealHistoryResponse",
    "PantryAddRequest",
    "PantryItemUpdate",
    "PantryItemResponse",
    "CookSuggestionRequest",
]
