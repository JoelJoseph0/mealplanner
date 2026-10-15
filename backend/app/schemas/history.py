from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.food import FoodResponse
from app.schemas.recipe import RecipeResponse


class MealHistoryCreate(BaseModel):
    food_id: Optional[int] = None
    recipe_id: Optional[int] = None
    recognition_id: Optional[int] = None
    meal_type: str = Field(..., max_length=50)  # Breakfast, Morning Snack, Lunch, Evening Snack, Dinner
    consumed_at: Optional[datetime] = None
    feedback: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    action: Optional[str] = Field("cooked", pattern="^(cooked|skipped|viewed)$")


class RecipeViewCreate(BaseModel):
    recipe_id: int


class MealFeedbackCreate(BaseModel):
    history_id: Optional[int] = None
    meal_id: Optional[int] = None
    feedback: str
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, values):
        if isinstance(values, dict):
            if not values.get("history_id") and values.get("meal_id"):
                try:
                    values["history_id"] = int(values["meal_id"])
                except Exception:
                    pass
            raw_fb = str(values.get("feedback", "")).strip().lower()
            if raw_fb in ["good", "positive", "like", "thumbs_up"]:
                values["feedback"] = "positive"
            elif raw_fb in ["not suitable", "negative", "dislike", "thumbs_down"]:
                values["feedback"] = "negative"
            elif raw_fb in ["neutral", "ok"]:
                values["feedback"] = "neutral"
            else:
                values["feedback"] = "positive"
        return values


class MealHistoryResponse(BaseModel):
    id: int
    user_id: int
    food_id: Optional[int] = None
    recipe_id: Optional[int] = None
    recognition_id: Optional[int] = None
    meal_type: str
    consumed_at: datetime
    action: str = "cooked"
    feedback: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    food: Optional[FoodResponse] = None
    recipe: Optional[RecipeResponse] = None

    model_config = ConfigDict(from_attributes=True)
