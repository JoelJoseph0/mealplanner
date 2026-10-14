from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.food import Food
from app.models.nutrition import Nutrition
from app.schemas.food import FoodCreate, FoodUpdate


def get_all_foods(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None
) -> List[Food]:
    """Retrieve list of foods with optional category and keyword search filters."""
    query = db.query(Food).filter(Food.is_active == True)
    if category:
        query = query.filter(Food.category.ilike(f"%{category}%"))
    if search:
        term = search.strip().lower()
        matches = [
            f for f in query.order_by(Food.name).all()
            if term in f.name.lower() or any(term in str(a).lower() for a in (f.aliases or []))
        ]
        return matches[skip:skip + limit]
    return query.order_by(Food.name).offset(skip).limit(limit).all()


def get_food_by_id(db: Session, food_id: int) -> Food:
    """Retrieve single food by ID or raise 404."""
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food with ID {food_id} not found"
        )
    return food


def get_food_by_name(db: Session, name: str) -> Optional[Food]:
    """Look up food case-insensitively by name."""
    return db.query(Food).filter(Food.name.ilike(name.strip())).first()


def _upsert_nutrition(db: Session, food: Food, data) -> None:
    if data is None:
        return
    record = db.query(Nutrition).filter(Nutrition.food_id == food.id).first()
    if record is None:
        record = Nutrition(food_id=food.id)
        db.add(record)
    record.serving_size = data.serving_size
    record.calories = data.calories
    record.protein = data.protein
    record.carbohydrates = data.carbohydrates
    record.fat = data.fat
    record.fiber = data.fiber
    record.sugar = data.sugar


def create_food(db: Session, food_in: FoodCreate) -> Food:
    """Create a new food item (admin privileged)."""
    existing = get_food_by_name(db, food_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Food item with name '{food_in.name}' already exists"
        )

    new_food = Food(
        name=food_in.name.strip(),
        category=food_in.category,
        description=food_in.description,
        image_url=food_in.image_url,
        aliases=food_in.aliases,
        substitutes=food_in.substitutes,
        is_staple=food_in.is_staple,
        is_active=food_in.is_active
    )
    db.add(new_food)
    db.flush()
    _upsert_nutrition(db, new_food, food_in.nutrition)
    db.commit()
    db.refresh(new_food)
    return new_food


def update_food(db: Session, food_id: int, food_in: FoodUpdate) -> Food:
    """Update food item details (admin privileged)."""
    food = get_food_by_id(db, food_id)

    if food_in.name is not None and food_in.name.strip().lower() != food.name.lower():
        existing = get_food_by_name(db, food_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another food item with name '{food_in.name}' already exists"
            )
        food.name = food_in.name.strip()

    if food_in.category is not None:
        food.category = food_in.category
    if food_in.description is not None:
        food.description = food_in.description
    if food_in.image_url is not None:
        food.image_url = food_in.image_url
    if food_in.aliases is not None:
        food.aliases = food_in.aliases
    if food_in.substitutes is not None:
        food.substitutes = food_in.substitutes
    if food_in.is_staple is not None:
        food.is_staple = food_in.is_staple
    if food_in.is_active is not None:
        food.is_active = food_in.is_active
    _upsert_nutrition(db, food, food_in.nutrition)

    db.commit()
    db.refresh(food)
    return food


def delete_food(db: Session, food_id: int) -> bool:
    """Delete a food item (admin privileged)."""
    food = get_food_by_id(db, food_id)
    db.delete(food)
    db.commit()
    return True
