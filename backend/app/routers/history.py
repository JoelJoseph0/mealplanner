from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.history import MealHistoryCreate, MealFeedbackCreate, MealHistoryResponse
from app.services.history_service import (
    create_meal_history,
    submit_meal_feedback,
    get_user_meal_history,
    get_meal_history_by_id
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
def list_history(
    target_date: Optional[date] = Query(None, description="Filter by consumption date"),
    meal_type: Optional[str] = Query(None, description="Filter by meal type"),
    food_id: Optional[int] = Query(None, description="Filter by food item ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve personal meal consumption logs with optional filters."""
    history_records = get_user_meal_history(
        db,
        current_user.id,
        skip=skip,
        limit=limit,
        target_date=target_date,
        meal_type=meal_type,
        food_id=food_id
    )
    return api_response(
        data=[MealHistoryResponse.model_validate(h) for h in history_records],
        message="Meal history retrieved successfully"
    )


@router.get("/{history_id}")
def get_history_item(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details of a single meal history log."""
    history = get_meal_history_by_id(db, history_id, current_user.id)
    return api_response(
        data=MealHistoryResponse.model_validate(history),
        message="Meal log retrieved successfully"
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def log_meal(
    history_in: MealHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log a consumed meal, food item, or recognized dish."""
    new_record = create_meal_history(db, current_user.id, history_in)
    return api_response(
        data=MealHistoryResponse.model_validate(new_record),
        message="Meal logged successfully"
    )


@router.post("/feedback")
def log_feedback(
    feedback_in: MealFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit post-meal rating (1-5), feedback (positive/neutral/negative), and notes."""
    updated_record = submit_meal_feedback(db, current_user.id, feedback_in)
    return api_response(
        data=MealHistoryResponse.model_validate(updated_record),
        message="Meal feedback submitted successfully"
    )
