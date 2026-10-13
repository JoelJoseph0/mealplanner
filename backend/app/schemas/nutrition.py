from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NutritionBase(BaseModel):
    serving_size: str = Field(default="100g")
    calories: float = Field(default=0.0, ge=0.0)
    protein: float = Field(default=0.0, ge=0.0)
    carbohydrates: float = Field(default=0.0, ge=0.0)
    fat: float = Field(default=0.0, ge=0.0)
    fiber: float = Field(default=0.0, ge=0.0)
    sugar: float = Field(default=0.0, ge=0.0)


class NutritionCreate(NutritionBase):
    food_id: int


class NutritionUpdate(BaseModel):
    serving_size: Optional[str] = None
    calories: Optional[float] = Field(None, ge=0.0)
    protein: Optional[float] = Field(None, ge=0.0)
    carbohydrates: Optional[float] = Field(None, ge=0.0)
    fat: Optional[float] = Field(None, ge=0.0)
    fiber: Optional[float] = Field(None, ge=0.0)
    sugar: Optional[float] = Field(None, ge=0.0)


class NutritionResponse(NutritionBase):
    id: int
    food_id: int
    food_name: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
