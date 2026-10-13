from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DietaryProfileBase(BaseModel):
    diet_type: str = Field(default="None")
    allergies: List[str] = Field(default_factory=list)
    preferred_foods: List[str] = Field(default_factory=list)
    avoided_foods: List[str] = Field(default_factory=list)
    daily_calories: Optional[float] = Field(default=2000.0, ge=500.0, le=10000.0)
    protein_target: Optional[float] = Field(default=75.0, ge=0.0)
    carbohydrate_target: Optional[float] = Field(default=250.0, ge=0.0)
    fat_target: Optional[float] = Field(default=65.0, ge=0.0)
    height: Optional[float] = Field(default=None, ge=50.0, le=250.0)
    weight: Optional[float] = Field(default=None, ge=20.0, le=300.0)
    activity_level: Optional[str] = Field(default="moderate")


class DietaryProfileCreate(DietaryProfileBase):
    pass


class DietaryProfileUpdate(BaseModel):
    diet_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    preferred_foods: Optional[List[str]] = None
    avoided_foods: Optional[List[str]] = None
    daily_calories: Optional[float] = None
    protein_target: Optional[float] = None
    carbohydrate_target: Optional[float] = None
    fat_target: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None


class DietaryProfileResponse(DietaryProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
