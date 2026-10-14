from typing import List, Optional, Union
from datetime import date
from pydantic import BaseModel, Field, model_validator


class ShoppingAddRequest(BaseModel):
    names: List[str] = Field(default_factory=list)
    quantity: Optional[str] = Field(None, max_length=60)
    source: str = Field("manual", max_length=40)

    @model_validator(mode="after")
    def ensure_not_empty(self):
        if not any(n.strip() for n in self.names):
            raise ValueError("Provide at least one item to add")
        return self


class ShoppingFromRecipeRequest(BaseModel):
    recipe_id: int


class ShoppingFromPlanRequest(BaseModel):
    start_date: Optional[Union[date, str]] = None
    days: int = Field(7, ge=1, le=14)
    timezone: Optional[str] = None


class ShoppingUpdateRequest(BaseModel):
    is_checked: Optional[bool] = None
    quantity: Optional[str] = Field(None, max_length=60)


class PantryConsumeRequest(BaseModel):
    recipe_id: int
    food_ids: List[int] = Field(default_factory=list)


class RecipeRatingRequest(BaseModel):
    feedback: Optional[str] = None
