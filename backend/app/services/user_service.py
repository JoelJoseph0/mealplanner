from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.dietary_profile import DietaryProfile
from app.schemas.user import UserProfileUpdate, UserPreferencesUpdate
from app.utils.helpers import calculate_daily_targets


def get_user_by_id(db: Session, user_id: int) -> User:
    """Retrieve user by primary key or raise 404."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


def get_or_create_dietary_profile(db: Session, user_id: int) -> DietaryProfile:
    """Retrieve or initialize dietary profile for a user."""
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    if not profile:
        profile = DietaryProfile(
            user_id=user_id,
            diet_type="None",
            allergies=[],
            preferred_foods=[],
            avoided_foods=[],
            daily_calories=2000.0,
            protein_target=75.0,
            carbohydrate_target=250.0,
            fat_target=65.0
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def update_user_profile(db: Session, user: User, profile_in: UserProfileUpdate) -> User:
    """
    Update core user attributes and physical biometric fields (height, weight, activity).
    Recalculates calorie and macronutrient baseline targets automatically.
    """
    if profile_in.full_name is not None:
        user.full_name = profile_in.full_name
    if profile_in.age is not None:
        user.age = profile_in.age
    if profile_in.gender is not None:
        user.gender = profile_in.gender

    profile = get_or_create_dietary_profile(db, user.id)

    if profile_in.height is not None:
        profile.height = profile_in.height
    if profile_in.weight is not None:
        profile.weight = profile_in.weight
    if profile_in.activity_level is not None:
        profile.activity_level = profile_in.activity_level

    # Recalculate baseline targets using updated biometrics
    if profile.weight and profile.height and user.age and user.gender:
        targets = calculate_daily_targets(
            weight=profile.weight,
            height=profile.height,
            age=user.age,
            gender=user.gender,
            activity_level=profile.activity_level
        )
        profile.daily_calories = targets["daily_calories"]
        profile.protein_target = targets["protein_target"]
        profile.carbohydrate_target = targets["carbohydrate_target"]
        profile.fat_target = targets["fat_target"]

    db.commit()
    db.refresh(user)
    return user


def update_user_preferences(db: Session, user_id: int, prefs_in: UserPreferencesUpdate) -> DietaryProfile:
    """Update diet type, allergies, preferred foods, avoided foods, and nutrition goals."""
    profile = get_or_create_dietary_profile(db, user_id)

    if prefs_in.diet_type is not None:
        profile.diet_type = prefs_in.diet_type
    if prefs_in.allergies is not None:
        profile.allergies = prefs_in.allergies
    if prefs_in.preferred_foods is not None:
        profile.preferred_foods = prefs_in.preferred_foods
    if prefs_in.avoided_foods is not None:
        profile.avoided_foods = prefs_in.avoided_foods
    if prefs_in.daily_calories is not None:
        profile.daily_calories = prefs_in.daily_calories
    if prefs_in.protein_target is not None:
        profile.protein_target = prefs_in.protein_target
    if prefs_in.carbohydrate_target is not None:
        profile.carbohydrate_target = prefs_in.carbohydrate_target
    if prefs_in.fat_target is not None:
        profile.fat_target = prefs_in.fat_target

    db.commit()
    db.refresh(profile)
    return profile
