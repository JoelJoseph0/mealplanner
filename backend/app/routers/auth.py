from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import UserRegister, UserLogin, Token
from app.schemas.user import UserResponse
from app.auth.dependencies import get_current_user, get_optional_current_user
from app.models.user import User
from app.services.auth_service import register_user, authenticate_user, create_token_for_user
from app.utils.helpers import api_response

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account with initial profile."""
    new_user = register_user(db, user_data)
    token_dict = create_token_for_user(new_user)
    return api_response(
        data={
            "user": UserResponse.model_validate(new_user),
            "token": token_dict
        },
        message="User registered successfully"
    )


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT access token."""
    user = authenticate_user(db, login_data)
    token_dict = create_token_for_user(user)
    token_dict["user"] = UserResponse.model_validate(user)
    return token_dict


@router.post("/logout")
def logout(current_user: Optional[User] = Depends(get_optional_current_user)):
    """Stateless logout acknowledgement for authenticated or unauthenticated users."""
    email_desc = current_user.email if current_user else "session"
    return api_response(
        message=f"User {email_desc} successfully logged out"
    )


@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Retrieve profile and preferences of currently authenticated user."""
    return api_response(
        data=UserResponse.model_validate(current_user),
        message="Current user profile retrieved successfully"
    )
