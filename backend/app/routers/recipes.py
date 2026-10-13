from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse
from app.services.recipe_service import (
    get_recipes,
    get_recipe_by_id,
    create_recipe,
    update_recipe,
    delete_recipe
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/recipes", tags=["Recipes"])


@router.get("")
def list_recipes(
    meal_type: Optional[str] = Query(None, description="Filter by meal type (e.g., Breakfast, Lunch, Dinner, Snack)"),
    diet_type: Optional[str] = Query(None, description="Filter by diet (e.g., Vegetarian, Vegan, Non-Vegetarian)"),
    search: Optional[str] = Query(None, description="Keyword search in recipe title"),
    max_calories: Optional[float] = Query(None, description="Maximum calorie threshold"),
    ingredient: Optional[str] = Query(None, description="Only recipes that use this ingredient (e.g., tomato)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=300),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve recipes with optional dietary and nutritional filtering."""
    recipes = get_recipes(
        db,
        skip=skip,
        limit=limit,
        meal_type=meal_type,
        diet_type=diet_type,
        search=search,
        max_calories=max_calories,
        ingredient=ingredient
    )
    return api_response(
        data=[RecipeResponse.model_validate(r) for r in recipes],
        message="Recipes retrieved successfully"
    )


@router.get("/{recipe_id}")
def get_single_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve recipe details and preparation instructions by ID."""
    recipe = get_recipe_by_id(db, recipe_id)
    return api_response(
        data=RecipeResponse.model_validate(recipe),
        message="Recipe retrieved successfully"
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def add_recipe(
    recipe_in: RecipeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Add a new recipe to the database (admin privileges required)."""
    new_recipe = create_recipe(db, recipe_in)
    return api_response(
        data=RecipeResponse.model_validate(new_recipe),
        message="Recipe created successfully"
    )


@router.put("/{recipe_id}")
def edit_recipe(
    recipe_id: int,
    recipe_in: RecipeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update recipe details (admin privileges required)."""
    updated_recipe = update_recipe(db, recipe_id, recipe_in)
    return api_response(
        data=RecipeResponse.model_validate(updated_recipe),
        message="Recipe updated successfully"
    )


@router.delete("/{recipe_id}")
def remove_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a recipe (admin privileges required)."""
    delete_recipe(db, recipe_id)
    return api_response(
        message=f"Recipe {recipe_id} deleted successfully"
    )
