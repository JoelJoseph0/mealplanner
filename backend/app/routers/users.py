from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserProfileUpdate, UserPreferencesUpdate
from app.schemas.dietary_profile import DietaryProfileResponse
from app.services.user_service import update_user_profile, update_user_preferences, get_or_create_dietary_profile
from app.utils.helpers import api_response

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    """Get the authenticated user's profile and dietary settings."""
    return api_response(
        data=UserResponse.model_validate(current_user),
        message="Profile retrieved successfully"
    )


@router.put("/profile")
def update_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user biometric details (full_name, age, gender, height, weight, activity_level)."""
    updated_user = update_user_profile(db, current_user, profile_in)
    return api_response(
        data=UserResponse.model_validate(updated_user),
        message="User profile updated successfully"
    )


@router.get("/preferences")
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve dietary preferences, allergies, and nutrition targets."""
    profile = get_or_create_dietary_profile(db, current_user.id)
    return api_response(
        data=DietaryProfileResponse.model_validate(profile),
        message="Dietary preferences retrieved successfully"
    )


@router.put("/preferences")
def update_preferences(
    prefs_in: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update diet type, allergies, preferred foods, avoided foods, and nutrition targets."""
    profile = update_user_preferences(db, current_user.id, prefs_in)
    return api_response(
        data=DietaryProfileResponse.model_validate(profile),
        message="Dietary preferences updated successfully"
    )
