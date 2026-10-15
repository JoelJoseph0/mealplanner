from typing import Dict, Optional, List
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
    goal: Optional[str] = Field(None, pattern="^(maintain|lose|gain|muscle)$")
    intolerances: Optional[List[str]] = None
    health_conditions: Optional[List[str]] = None


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


class ReminderSlot(BaseModel):
    enabled: bool = True
    time: Optional[str] = Field(None, pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")


class ReminderSettings(BaseModel):
    enabled: bool = False
    lead_minutes: int = Field(15, ge=0, le=120)
    slots: Dict[str, ReminderSlot] = Field(default_factory=dict)
    plan_reminder: bool = True


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = Field(None, pattern="^(user|admin)$")


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    dietary_profile: Optional[DietaryProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
