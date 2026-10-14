from datetime import datetime, date, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.meal_history import MealHistory
from app.schemas.history import MealHistoryCreate, MealFeedbackCreate


def create_meal_history(
    db: Session,
    user_id: int,
    history_in: MealHistoryCreate
) -> MealHistory:
    """Record consumption of a meal with optional initial feedback and rating."""
    history = MealHistory(
        user_id=user_id,
        food_id=history_in.food_id,
        recipe_id=history_in.recipe_id,
        recognition_id=history_in.recognition_id,
        meal_type=history_in.meal_type,
        consumed_at=history_in.consumed_at or datetime.now(timezone.utc),
        feedback=history_in.feedback,
        rating=history_in.rating,
        notes=history_in.notes
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def submit_meal_feedback(
    db: Session,
    user_id: int,
    feedback_in: MealFeedbackCreate
) -> MealHistory:
    """Submit or update feedback, rating, and notes for a meal record."""
    history = None
    if feedback_in.history_id:
        history = (
            db.query(MealHistory)
            .filter(MealHistory.id == feedback_in.history_id, MealHistory.user_id == user_id)
            .first()
        )

    if not history:
        # Create a new consumption feedback log
        history = MealHistory(
            user_id=user_id,
            meal_type="Meal",
            consumed_at=datetime.now(timezone.utc),
            feedback=feedback_in.feedback,
            rating=feedback_in.rating or (5 if feedback_in.feedback == "positive" else 2),
            notes=feedback_in.notes
        )
        db.add(history)
    else:
        history.feedback = feedback_in.feedback
        if feedback_in.rating is not None:
            history.rating = feedback_in.rating
        if feedback_in.notes is not None:
            history.notes = feedback_in.notes

    db.commit()
    db.refresh(history)
    if history.recipe_id and history.feedback in ("positive", "negative", "neutral"):
        from app.services.feedback_service import set_recipe_rating
        set_recipe_rating(db, user_id, history.recipe_id, history.feedback)
    return history


def get_user_meal_history(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    target_date: Optional[date] = None,
    meal_type: Optional[str] = None,
    food_id: Optional[int] = None
) -> List[MealHistory]:
    """Retrieve logged meal entries for authenticated user with optional date/meal_type/food filters."""
    query = db.query(MealHistory).filter(MealHistory.user_id == user_id)

    if target_date:
        query = query.filter(
            MealHistory.consumed_at >= datetime.combine(target_date, datetime.min.time()),
            MealHistory.consumed_at <= datetime.combine(target_date, datetime.max.time())
        )
    if meal_type:
        query = query.filter(MealHistory.meal_type.ilike(f"%{meal_type}%"))
    if food_id:
        query = query.filter(MealHistory.food_id == food_id)

    return query.order_by(MealHistory.consumed_at.desc()).offset(skip).limit(limit).all()


def get_meal_history_by_id(
    db: Session,
    history_id: int,
    user_id: int
) -> MealHistory:
    """Retrieve single meal history entry owned by user."""
    history = (
        db.query(MealHistory)
        .filter(MealHistory.id == history_id, MealHistory.user_id == user_id)
        .first()
    )
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meal history record with ID {history_id} not found"
        )
    return history
