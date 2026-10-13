from datetime import datetime
from typing import List, Optional
import re
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RecipeIngredientInput(BaseModel):
    name: Optional[str] = None
    food_id: Optional[int] = None
    quantity: Optional[str] = Field(None, max_length=60)
    is_optional: bool = False


class RecipeIngredientItem(BaseModel):
    food_id: int
    name: str
    category: Optional[str] = None
    quantity: Optional[str] = None
    is_optional: bool = False
    is_staple: bool = False


class RecipeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    ingredients: List[str] = Field(default_factory=list)
    instructions: str = Field(..., min_length=5)
    meal_type: str = Field(..., max_length=50)  # Breakfast, Lunch, Snack, Dinner, Morning Snack, Evening Snack
    diet_type: str = Field(..., max_length=50)  # Vegetarian, Vegan, Non-Vegetarian, Eggetarian
    allergy_information: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    preparation_time: int = Field(default=15, ge=0)
    cooking_time: int = Field(default=20, ge=0)
    servings: int = Field(default=1, ge=1)
    calories: float = Field(default=0.0, ge=0.0)
    protein: float = Field(default=0.0, ge=0.0)
    carbohydrates: float = Field(default=0.0, ge=0.0)
    fat: float = Field(default=0.0, ge=0.0)
    fiber: float = Field(default=0.0, ge=0.0)

    @field_validator("instructions", mode="before")
    @classmethod
    def normalize_instructions(cls, v):
        if isinstance(v, list):
            return "\n".join(str(s).strip() for s in v if s)
        return str(v) if v is not None else ""

    @field_validator("preparation_time", "cooking_time", mode="before")
    @classmethod
    def normalize_time(cls, v):
        if isinstance(v, str):
            m = re.search(r"\d+", v)
            return int(m.group(0)) if m else 15
        return v if v is not None else 15


class RecipeCreate(RecipeBase):
    ingredient_items: Optional[List[RecipeIngredientInput]] = None


class RecipeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    ingredients: Optional[List[str]] = None
    ingredient_items: Optional[List[RecipeIngredientInput]] = None
    instructions: Optional[str] = None
    meal_type: Optional[str] = None
    diet_type: Optional[str] = None
    allergy_information: Optional[List[str]] = None
    image_url: Optional[str] = None
    preparation_time: Optional[int] = Field(None, ge=0)
    cooking_time: Optional[int] = Field(None, ge=0)
    servings: Optional[int] = Field(None, ge=1)
    calories: Optional[float] = Field(None, ge=0.0)
    protein: Optional[float] = Field(None, ge=0.0)
    carbohydrates: Optional[float] = Field(None, ge=0.0)
    fat: Optional[float] = Field(None, ge=0.0)
    fiber: Optional[float] = Field(None, ge=0.0)

    @field_validator("instructions", mode="before")
    @classmethod
    def normalize_update_instructions(cls, v):
        if isinstance(v, list):
            return "\n".join(str(s).strip() for s in v if s)
        return v

    @field_validator("preparation_time", "cooking_time", mode="before")
    @classmethod
    def normalize_update_time(cls, v):
        if isinstance(v, str):
            m = re.search(r"\d+", v)
            return int(m.group(0)) if m else 15
        return v


class RecipeResponse(RecipeBase):
    id: int
    ingredient_items: List[RecipeIngredientItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
