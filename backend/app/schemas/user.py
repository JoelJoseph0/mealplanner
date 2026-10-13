from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from app.schemas.dietary_profile import DietaryProfileResponse


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    age: Optional[int] = None
    gender: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    is_active: Optional[bool] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    height: Optional[float] = Field(None, ge=50.0, le=250.0)
    weight: Optional[float] = Field(None, ge=20.0, le=300.0)
    activity_level: Optional[str] = None


class UserPreferencesUpdate(BaseModel):
    diet_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    preferred_foods: Optional[List[str]] = None
    avoided_foods: Optional[List[str]] = None
    daily_calories: Optional[float] = None
    protein_target: Optional[float] = None
    carbohydrate_target: Optional[float] = None
    fat_target: Optional[float] = None


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    dietary_profile: Optional[DietaryProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
