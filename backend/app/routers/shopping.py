from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.shopping import (
    ShoppingAddRequest,
    ShoppingFromRecipeRequest,
    ShoppingFromPlanRequest,
    ShoppingUpdateRequest,
)
from app.services import shopping_service
from app.utils.helpers import api_response

router = APIRouter(prefix="/shopping", tags=["Shopping List"])


@router.get("")
def get_shopping_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return api_response(data=shopping_service.list_items(db, current_user.id), message="Shopping list retrieved successfully")


@router.post("", status_code=status.HTTP_201_CREATED)
def add_items(
    request: ShoppingAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = shopping_service.add_by_names(db, current_user.id, request)
    return api_response(data=result, message=f"{result['added']} item(s) added to your shopping list")


@router.post("/from-recipe", status_code=status.HTTP_201_CREATED)
def add_from_recipe(
    request: ShoppingFromRecipeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = shopping_service.add_from_recipe(db, current_user.id, request.recipe_id)
    return api_response(data=result, message=f"{result['added']} missing ingredient(s) added to your shopping list")


@router.post("/from-plan", status_code=status.HTTP_201_CREATED)
def add_from_plan(
    request: ShoppingFromPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = shopping_service.add_from_plan(db, current_user.id, request)
    return api_response(data=result, message=f"{result['added']} ingredient(s) added from your meal plan")


@router.post("/checkout")
def checkout_checked_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = shopping_service.checkout(db, current_user.id)
    return api_response(data=result, message=f"{result['moved']} item(s) moved to your pantry")


@router.put("/{item_id}")
def edit_item(
    item_id: int,
    update: ShoppingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return api_response(data=shopping_service.update_item(db, current_user.id, item_id, update), message="Shopping item updated")


@router.delete("/{item_id}")
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shopping_service.delete_item(db, current_user.id, item_id)
    return api_response(message="Item removed from shopping list")


@router.delete("")
def clear_list(
    checked_only: bool = Query(False, description="Only remove items that are ticked"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    removed = shopping_service.clear_items(db, current_user.id, checked_only=checked_only)
    return api_response(data={"removed": removed}, message="Shopping list updated")
