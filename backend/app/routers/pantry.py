from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.pantry import PantryAddRequest, PantryItemUpdate, CookSuggestionRequest
from app.services.pantry_service import (
    list_pantry,
    add_pantry_items,
    update_pantry_item,
    remove_pantry_item,
    clear_pantry,
    suggest_recipes,
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/pantry", tags=["Pantry"])


@router.get("")
def get_pantry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = list_pantry(db, current_user.id)
    return api_response(data=items, message="Pantry retrieved successfully")


@router.post("", status_code=status.HTTP_201_CREATED)
def add_to_pantry(
    request: PantryAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = add_pantry_items(db, current_user.id, request)
    added = len(result["added"]) + len(result["updated"])
    message = f"{added} ingredient(s) saved to your pantry"
    if result["unrecognized"]:
        message += f"; {len(result['unrecognized'])} not recognised"
    return api_response(data=result, message=message)


@router.post("/suggest")
def what_can_i_cook(
    request: CookSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = suggest_recipes(db, current_user.id, request)
    return api_response(
        data=result,
        message=f"{result['ready_count']} recipe(s) ready to cook, {result['almost_count']} need a few more items"
    )


@router.put("/{item_id}")
def edit_pantry_item(
    item_id: int,
    update: PantryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = update_pantry_item(db, current_user.id, item_id, update)
    return api_response(data=item, message="Pantry item updated successfully")


@router.delete("/{item_id}")
def delete_pantry_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    remove_pantry_item(db, current_user.id, item_id)
    return api_response(message="Ingredient removed from pantry")


@router.delete("")
def empty_pantry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    removed = clear_pantry(db, current_user.id)
    return api_response(data={"removed": removed}, message="Pantry cleared")
