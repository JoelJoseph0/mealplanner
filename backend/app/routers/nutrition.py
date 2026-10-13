from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.nutrition import NutritionCreate, NutritionUpdate, NutritionResponse
from app.services.nutrition_service import (
    get_nutrition_by_food_id,
    create_nutrition,
    update_nutrition,
    delete_nutrition
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


@router.get("/{food_id}")
def get_food_nutrition(
    food_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve nutritional breakdown for a specific food item."""
    nutrition = get_nutrition_by_food_id(db, food_id)
    resp = NutritionResponse.model_validate(nutrition)
    if nutrition.food:
        resp.food_name = nutrition.food.name
        resp.category = nutrition.food.category
    return api_response(
        data=resp,
        message="Nutrition data retrieved successfully"
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def add_nutrition(
    nutrition_in: NutritionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create nutrition data for a food item (admin privileges required)."""
    new_nutrition = create_nutrition(db, nutrition_in)
    return api_response(
        data=NutritionResponse.model_validate(new_nutrition),
        message="Nutrition record created successfully"
    )


@router.put("/{nutrition_id}")
def edit_nutrition(
    nutrition_id: int,
    nutrition_in: NutritionUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update nutrition data (admin privileges required)."""
    updated_nutrition = update_nutrition(db, nutrition_id, nutrition_in)
    return api_response(
        data=NutritionResponse.model_validate(updated_nutrition),
        message="Nutrition record updated successfully"
    )


@router.delete("/{nutrition_id}")
def remove_nutrition(
    nutrition_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete nutrition data (admin privileges required)."""
    delete_nutrition(db, nutrition_id)
    return api_response(
        message=f"Nutrition record {nutrition_id} deleted successfully"
    )
