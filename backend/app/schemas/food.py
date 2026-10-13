from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.nutrition import NutritionResponse


class FoodBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., max_length=50)
    description: Optional[str] = None
    image_url: Optional[str] = None
    aliases: List[str] = Field(default_factory=list)
    substitutes: List[str] = Field(default_factory=list)
    is_staple: bool = False
    is_active: bool = True

    @field_validator("aliases", "substitutes", mode="before")
    @classmethod
    def normalize_name_lists(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return [str(s).strip() for s in v if str(s).strip()]

    @field_validator("is_staple", mode="before")
    @classmethod
    def normalize_staple(cls, v):
        return bool(v) if v is not None else False


class FoodCreate(FoodBase):
    pass


class FoodUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    image_url: Optional[str] = None
    aliases: Optional[List[str]] = None
    substitutes: Optional[List[str]] = None
    is_staple: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("aliases", "substitutes", mode="before")
    @classmethod
    def normalize_update_lists(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return [str(s).strip() for s in v if str(s).strip()]


class FoodResponse(FoodBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FoodWithNutritionResponse(FoodResponse):
    nutrition: Optional[NutritionResponse] = None

    model_config = ConfigDict(from_attributes=True)


class IngredientSuggestion(BaseModel):
    id: int
    name: str
    category: str
    is_staple: bool = False
    matched_alias: Optional[str] = None
