from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.dietary_profile import DietaryProfile
from app.schemas.user import UserProfileUpdate, UserPreferencesUpdate
from app.utils.helpers import calculate_daily_targets
from app.auth.password import hash_password, verify_password


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

    recalculate_targets(user, profile)

    db.commit()
    db.refresh(user)
    return user


def recalculate_targets(user: User, profile: DietaryProfile) -> bool:
    if not (profile.weight and profile.height and user.age and user.gender):
        return False
    targets = calculate_daily_targets(
        weight=profile.weight,
        height=profile.height,
        age=user.age,
        gender=user.gender,
        activity_level=profile.activity_level,
        goal=profile.goal
    )
    profile.daily_calories = targets["daily_calories"]
    profile.protein_target = targets["protein_target"]
    profile.carbohydrate_target = targets["carbohydrate_target"]
    profile.fat_target = targets["fat_target"]
    return True


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
    if prefs_in.intolerances is not None:
        profile.intolerances = [i.strip() for i in prefs_in.intolerances if i and i.strip()]
    if prefs_in.health_conditions is not None:
        profile.health_conditions = [c.strip() for c in prefs_in.health_conditions if c and c.strip()]
    if prefs_in.goal is not None and prefs_in.goal != profile.goal:
        profile.goal = prefs_in.goal
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            recalculate_targets(user, profile)

    db.commit()
    db.refresh(profile)
    return profile


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your current password is incorrect")
    if current_password == new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a password different from your current one")
    if not any(c.isalpha() for c in new_password) or not any(c.isdigit() for c in new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use at least one letter and one number")
    user.password_hash = hash_password(new_password)
    db.commit()


DEFAULT_REMINDER_TIMES = {
    "Breakfast": "08:30",
    "Morning Snack": "11:00",
    "Lunch": "13:30",
    "Evening Snack": "17:00",
    "Dinner": "20:00",
}


def get_reminder_settings(db: Session, user_id: int) -> Dict[str, Any]:
    profile = get_or_create_dietary_profile(db, user_id)
    stored = dict(profile.reminders or {})
    slots = dict(stored.get("slots") or {})
    merged = {}
    for slot, default_time in DEFAULT_REMINDER_TIMES.items():
        current = slots.get(slot) or {}
        merged[slot] = {
            "enabled": bool(current.get("enabled", True)),
            "time": current.get("time") or default_time,
        }
    return {
        "enabled": bool(stored.get("enabled", False)),
        "lead_minutes": int(stored.get("lead_minutes", 15)),
        "plan_reminder": bool(stored.get("plan_reminder", True)),
        "slots": merged,
    }


def update_reminder_settings(db: Session, user_id: int, settings: Dict[str, Any]) -> Dict[str, Any]:
    profile = get_or_create_dietary_profile(db, user_id)
    slots = {
        name: {"enabled": bool(value.get("enabled", True)), "time": value.get("time") or DEFAULT_REMINDER_TIMES.get(name)}
        for name, value in (settings.get("slots") or {}).items()
        if name in DEFAULT_REMINDER_TIMES
    }
    profile.reminders = {
        "enabled": bool(settings.get("enabled", False)),
        "lead_minutes": int(settings.get("lead_minutes", 15)),
        "plan_reminder": bool(settings.get("plan_reminder", True)),
        "slots": slots,
    }
    db.commit()
    return get_reminder_settings(db, user_id)
