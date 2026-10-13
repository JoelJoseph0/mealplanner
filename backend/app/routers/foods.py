from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.food import FoodCreate, FoodUpdate, FoodWithNutritionResponse
from app.services.food_service import get_all_foods, get_food_by_id, create_food, update_food, delete_food
from app.utils.helpers import api_response

router = APIRouter(prefix="/foods", tags=["Foods"])


@router.get("")
def list_foods(
    category: Optional[str] = Query(None, description="Filter by food category"),
    search: Optional[str] = Query(None, description="Search by food name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve food list with optional search and category filters."""
    foods = get_all_foods(db, skip=skip, limit=limit, category=category, search=search)
    return api_response(
        data=[FoodWithNutritionResponse.model_validate(f) for f in foods],
        message="Foods retrieved successfully"
    )


@router.get("/{food_id}")
def get_food(
    food_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details and nutrition for a specific food item."""
    food = get_food_by_id(db, food_id)
    return api_response(
        data=FoodWithNutritionResponse.model_validate(food),
        message="Food details retrieved successfully"
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def add_food(
    food_in: FoodCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Add a new food item (admin privileges required)."""
    new_food = create_food(db, food_in)
    return api_response(
        data=FoodWithNutritionResponse.model_validate(new_food),
        message="Food item created successfully"
    )


@router.put("/{food_id}")
def edit_food(
    food_id: int,
    food_in: FoodUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update food details (admin privileges required)."""
    updated_food = update_food(db, food_id, food_in)
    return api_response(
        data=FoodWithNutritionResponse.model_validate(updated_food),
        message="Food item updated successfully"
    )


@router.delete("/{food_id}", status_code=status.HTTP_200_OK)
def remove_food(
    food_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a food item (admin privileges required)."""
    delete_food(db, food_id)
    return api_response(
        message=f"Food item {food_id} deleted successfully"
    )
