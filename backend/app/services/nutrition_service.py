from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.nutrition import Nutrition
from app.models.food import Food
from app.schemas.nutrition import NutritionCreate, NutritionUpdate


def get_nutrition_by_food_id(db: Session, food_id: int) -> Nutrition:
    """Retrieve nutrition record for a specific food or raise 404."""
    nutrition = db.query(Nutrition).filter(Nutrition.food_id == food_id).first()
    if not nutrition:
        # Check if food exists
        food = db.query(Food).filter(Food.id == food_id).first()
        if not food:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Food with ID {food_id} does not exist"
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nutrition data not found for food ID {food_id}"
        )
    return nutrition


def get_nutrition_by_id(db: Session, nutrition_id: int) -> Nutrition:
    """Retrieve nutrition record by primary key."""
    nutrition = db.query(Nutrition).filter(Nutrition.id == nutrition_id).first()
    if not nutrition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nutrition record with ID {nutrition_id} not found"
        )
    return nutrition


def create_nutrition(db: Session, nutrition_in: NutritionCreate) -> Nutrition:
    """Create nutrition information for a food item (admin privileged)."""
    # Check food exists
    food = db.query(Food).filter(Food.id == nutrition_in.food_id).first()
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food item with ID {nutrition_in.food_id} not found"
        )

    # Check if nutrition already exists for this food
    existing = db.query(Nutrition).filter(Nutrition.food_id == nutrition_in.food_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Nutrition record for food ID {nutrition_in.food_id} already exists"
        )

    new_nutrition = Nutrition(
        food_id=nutrition_in.food_id,
        serving_size=nutrition_in.serving_size,
        calories=nutrition_in.calories,
        protein=nutrition_in.protein,
        carbohydrates=nutrition_in.carbohydrates,
        fat=nutrition_in.fat,
        fiber=nutrition_in.fiber,
        sugar=nutrition_in.sugar
    )
    db.add(new_nutrition)
    db.commit()
    db.refresh(new_nutrition)
    return new_nutrition


def update_nutrition(db: Session, nutrition_id: int, nutrition_in: NutritionUpdate) -> Nutrition:
    """Update nutrition record (admin privileged)."""
    nutrition = get_nutrition_by_id(db, nutrition_id)

    if nutrition_in.serving_size is not None:
        nutrition.serving_size = nutrition_in.serving_size
    if nutrition_in.calories is not None:
        nutrition.calories = nutrition_in.calories
    if nutrition_in.protein is not None:
        nutrition.protein = nutrition_in.protein
    if nutrition_in.carbohydrates is not None:
        nutrition.carbohydrates = nutrition_in.carbohydrates
    if nutrition_in.fat is not None:
        nutrition.fat = nutrition_in.fat
    if nutrition_in.fiber is not None:
        nutrition.fiber = nutrition_in.fiber
    if nutrition_in.sugar is not None:
        nutrition.sugar = nutrition_in.sugar

    db.commit()
    db.refresh(nutrition)
    return nutrition


def delete_nutrition(db: Session, nutrition_id: int) -> bool:
    """Delete nutrition record (admin privileged)."""
    nutrition = get_nutrition_by_id(db, nutrition_id)
    db.delete(nutrition)
    db.commit()
    return True
