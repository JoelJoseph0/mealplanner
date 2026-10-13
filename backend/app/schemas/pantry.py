from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class PantryItemInput(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    food_id: Optional[int] = None
    quantity: Optional[str] = Field(None, max_length=60)
    expiry_date: Optional[date] = None


class PantryAddRequest(BaseModel):
    items: List[PantryItemInput] = Field(default_factory=list)
    names: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def ensure_not_empty(self):
        if not self.items and not any(n.strip() for n in self.names):
            raise ValueError("Provide at least one ingredient to add")
        return self


class PantryItemUpdate(BaseModel):
    quantity: Optional[str] = Field(None, max_length=60)
    expiry_date: Optional[date] = None
    clear_expiry: bool = False


class PantryItemResponse(BaseModel):
    id: int
    food_id: int
    name: str
    category: str
    is_staple: bool = False
    quantity: Optional[str] = None
    expiry_date: Optional[date] = None
    expires_soon: bool = False
    created_at: datetime


class UnrecognizedIngredient(BaseModel):
    input: str
    suggestions: List[str] = Field(default_factory=list)


class CookSuggestionRequest(BaseModel):
    ingredients: Optional[List[str]] = None
    use_saved_pantry: bool = False
    meal_type: Optional[str] = None
    max_missing: int = Field(2, ge=0, le=5)
    assume_staples: bool = True
    apply_profile: bool = True
    limit: int = Field(24, ge=1, le=100)
