from datetime import date, datetime
from typing import List, Dict, Optional, Union, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.recipe import RecipeResponse


class MealPlanItemBase(BaseModel):
    plan_date: date
    meal_type: str
    recipe_id: int
    servings: int = 1


class MealPlanItemResponse(BaseModel):
    id: int
    plan_date: date
    meal_type: str
    recipe_id: int
    servings: int
    created_at: datetime
    recipe: RecipeResponse

    model_config = ConfigDict(from_attributes=True)


class NutritionTotals(BaseModel):
    calories: float = 0.0
    protein: float = 0.0
    carbohydrates: float = 0.0
    fat: float = 0.0
    fiber: float = 0.0


class DailyMealPlanResponse(BaseModel):
    date: date
    meals: Dict[str, Optional[MealPlanItemResponse]]  # Breakfast, Morning Snack, Lunch, Evening Snack, Dinner
    meals_list: Optional[List[Dict[str, Any]]] = None
    totals: NutritionTotals
    target: Optional[Dict[str, float]] = None


class WeeklyTotals(BaseModel):
    average_daily_calories: float = 0.0
    average_protein: float = 0.0
    average_carbs: float = 0.0
    average_fat: float = 0.0
    average_fiber: float = 0.0
    total_calories: float = 0.0
    total_protein: float = 0.0
    total_carbs: float = 0.0
    total_fat: float = 0.0


class WeeklyMealPlanResponse(BaseModel):
    start_date: date
    end_date: date
    days: Dict[str, Any]  # e.g. "Monday": DailyMealPlanResponse, ...
    weekly_average_calories: float
    weekly_totals: Optional[WeeklyTotals] = None


class MealPlanGenerateRequest(BaseModel):
    plan_date: Optional[Union[date, str]] = None
    timezone: Optional[str] = None
    force_regenerate: bool = False
    use_pantry: bool = False


class MealPlanWeekGenerateRequest(BaseModel):
    start_date: Optional[Union[date, str]] = None
    timezone: Optional[str] = None
    force_regenerate: bool = False
    use_pantry: bool = False
