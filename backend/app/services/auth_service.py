from typing import Optional, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.dietary_profile import DietaryProfile
from app.schemas.auth import UserRegister, UserLogin
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token
from app.utils.helpers import calculate_daily_targets


def register_user(db: Session, user_data: UserRegister) -> User:
    """Register a new user, create hashed credentials, and initialize default dietary profile."""
    existing_user = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    # Hash password securely
    hashed_pwd = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email.lower(),
        password_hash=hashed_pwd,
        age=user_data.age,
        gender=user_data.gender,
        role="user",
        is_active=True
    )
    db.add(new_user)
    db.flush()  # Flush to generate new_user.id

    # Compute default targets based on initial user metrics
    targets = calculate_daily_targets(
        weight=65.0,
        height=170.0,
        age=user_data.age or 25,
        gender=user_data.gender or "other",
        activity_level="moderate"
    )

    # Initialize default DietaryProfile
    default_profile = DietaryProfile(
        user_id=new_user.id,
        diet_type="None",
        allergies=[],
        preferred_foods=[],
        avoided_foods=[],
        daily_calories=targets["daily_calories"],
        protein_target=targets["protein_target"],
        carbohydrate_target=targets["carbohydrate_target"],
        fat_target=targets["fat_target"],
        height=170.0,
        weight=65.0,
        activity_level="moderate"
    )
    db.add(default_profile)
    db.commit()
    db.refresh(new_user)
    return new_user


def authenticate_user(db: Session, login_data: UserLogin) -> User:
    """Verify credentials and return user model or raise 401 unauthorized."""
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently disabled"
        )

    return user


def create_token_for_user(user: User) -> Dict[str, str]:
    """Generate JWT access token for authenticated user."""
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    }
    token = create_access_token(payload)
    return {
        "access_token": token,
        "token_type": "bearer"
    }
