from typing import Dict, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.meal_history import MealHistory
from app.models.recipe import Recipe
from app.models.recipe_rating import RecipeRating

VALID_FEEDBACK = {"positive", "negative", "neutral"}


def get_feedback_map(db: Session, user_id: int) -> Dict[int, str]:
    result: Dict[int, str] = {}
    rows = (
        db.query(MealHistory.recipe_id, MealHistory.feedback)
        .filter(MealHistory.user_id == user_id, MealHistory.recipe_id.isnot(None), MealHistory.feedback.isnot(None))
        .order_by(MealHistory.consumed_at.asc(), MealHistory.id.asc())
        .all()
    )
    for row in rows:
        result[row.recipe_id] = row.feedback
    for rating in db.query(RecipeRating).filter(RecipeRating.user_id == user_id).all():
        result[rating.recipe_id] = rating.feedback
    return result


def set_recipe_rating(db: Session, user_id: int, recipe_id: int, feedback: Optional[str]) -> Optional[str]:
    if not db.query(Recipe.id).filter(Recipe.id == recipe_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recipe with ID {recipe_id} not found"
        )
    existing = (
        db.query(RecipeRating)
        .filter(RecipeRating.user_id == user_id, RecipeRating.recipe_id == recipe_id)
        .first()
    )
    if feedback is None:
        if existing:
            db.delete(existing)
            db.commit()
        return None
    if feedback not in VALID_FEEDBACK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback must be positive, negative or neutral"
        )
    if existing:
        existing.feedback = feedback
    else:
        db.add(RecipeRating(user_id=user_id, recipe_id=recipe_id, feedback=feedback))
    db.commit()
    return feedback
