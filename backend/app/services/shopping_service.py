from collections import OrderedDict
from datetime import timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.food import Food
from app.models.meal_plan import MealPlan
from app.models.pantry_item import PantryItem
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.shopping_item import ShoppingItem
from app.schemas.shopping import ShoppingAddRequest, ShoppingFromPlanRequest, ShoppingUpdateRequest
from app.services.ingredient_service import load_catalog
from app.services.meal_planner_service import normalize_calendar_date


def _serialize(item: ShoppingItem) -> Dict[str, Any]:
    return {
        "id": item.id,
        "food_id": item.food_id,
        "name": item.food.name if item.food else "",
        "category": item.food.category if item.food else "Others",
        "quantity": item.quantity,
        "source": item.source,
        "is_checked": bool(item.is_checked),
        "created_at": item.created_at,
    }


def list_items(db: Session, user_id: int) -> List[Dict[str, Any]]:
    items = (
        db.query(ShoppingItem)
        .options(joinedload(ShoppingItem.food))
        .filter(ShoppingItem.user_id == user_id)
        .all()
    )
    items.sort(key=lambda i: (bool(i.is_checked), i.food.category if i.food else "", i.food.name if i.food else ""))
    return [_serialize(i) for i in items]


def _add_food_ids(db: Session, user_id: int, entries: List[Dict[str, Any]], source: str) -> Dict[str, int]:
    pantry_ids = {row[0] for row in db.query(PantryItem.food_id).filter(PantryItem.user_id == user_id).all()}
    existing = {row[0] for row in db.query(ShoppingItem.food_id).filter(ShoppingItem.user_id == user_id).all()}
    added = skipped = 0
    for entry in entries:
        food_id = entry["food_id"]
        if food_id in existing:
            skipped += 1
            continue
        if source != "manual" and food_id in pantry_ids:
            skipped += 1
            continue
        db.add(ShoppingItem(user_id=user_id, food_id=food_id, quantity=entry.get("quantity"), source=source))
        existing.add(food_id)
        added += 1
    db.commit()
    return {"added": added, "skipped": skipped}


def add_by_names(db: Session, user_id: int, request: ShoppingAddRequest) -> Dict[str, Any]:
    _, index = load_catalog(db)
    entries = []
    unrecognized = []
    for raw in request.names:
        for part in str(raw).split(","):
            text = part.strip()
            if not text:
                continue
            food_id = index.resolve(text)
            if food_id is None:
                unrecognized.append({"input": text, "suggestions": index.suggest(text)})
            else:
                entries.append({"food_id": food_id, "quantity": request.quantity})
    result = _add_food_ids(db, user_id, entries, request.source or "manual")
    result["unrecognized"] = unrecognized
    return result


def _key_links(recipe: Recipe) -> List[RecipeIngredient]:
    return [
        link for link in (recipe.ingredient_links or [])
        if link.food is not None and not link.is_optional and not link.food.is_staple
    ]


def add_from_recipe(db: Session, user_id: int, recipe_id: int) -> Dict[str, Any]:
    recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredient_links).joinedload(RecipeIngredient.food))
        .filter(Recipe.id == recipe_id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recipe with ID {recipe_id} not found")
    pantry_ids = {row[0] for row in db.query(PantryItem.food_id).filter(PantryItem.user_id == user_id).all()}
    entries = [
        {"food_id": link.food_id, "quantity": link.quantity}
        for link in _key_links(recipe)
        if link.food_id not in pantry_ids
    ]
    result = _add_food_ids(db, user_id, entries, "recipe")
    result["unrecognized"] = []
    return result


def add_from_plan(db: Session, user_id: int, request: ShoppingFromPlanRequest) -> Dict[str, Any]:
    start = normalize_calendar_date(request.start_date, request.timezone)
    end = start + timedelta(days=request.days - 1)
    plan_items = (
        db.query(MealPlan)
        .options(joinedload(MealPlan.recipe).joinedload(Recipe.ingredient_links).joinedload(RecipeIngredient.food))
        .filter(MealPlan.user_id == user_id, MealPlan.plan_date >= start, MealPlan.plan_date <= end)
        .all()
    )
    pantry_ids = {row[0] for row in db.query(PantryItem.food_id).filter(PantryItem.user_id == user_id).all()}
    needed: "OrderedDict[int, int]" = OrderedDict()
    for plan_item in plan_items:
        if plan_item.recipe is None or plan_item.completed:
            continue
        for link in _key_links(plan_item.recipe):
            if link.food_id in pantry_ids:
                continue
            needed[link.food_id] = needed.get(link.food_id, 0) + 1
    entries = [
        {"food_id": food_id, "quantity": f"for {count} meal{'s' if count > 1 else ''}"}
        for food_id, count in needed.items()
    ]
    result = _add_food_ids(db, user_id, entries, "plan")
    result["unrecognized"] = []
    result["meals_considered"] = len(plan_items)
    return result


def _get_owned(db: Session, user_id: int, item_id: int) -> ShoppingItem:
    item = (
        db.query(ShoppingItem)
        .filter(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shopping item with ID {item_id} not found")
    return item


def update_item(db: Session, user_id: int, item_id: int, update: ShoppingUpdateRequest) -> Dict[str, Any]:
    item = _get_owned(db, user_id, item_id)
    if update.is_checked is not None:
        item.is_checked = update.is_checked
    if update.quantity is not None:
        item.quantity = update.quantity.strip() or None
    db.commit()
    db.refresh(item)
    return _serialize(item)


def delete_item(db: Session, user_id: int, item_id: int) -> None:
    item = _get_owned(db, user_id, item_id)
    db.delete(item)
    db.commit()


def clear_items(db: Session, user_id: int, checked_only: bool = False) -> int:
    query = db.query(ShoppingItem).filter(ShoppingItem.user_id == user_id)
    if checked_only:
        query = query.filter(ShoppingItem.is_checked == True)
    count = query.delete(synchronize_session=False)
    db.commit()
    return count


def checkout(db: Session, user_id: int) -> Dict[str, Any]:
    checked = (
        db.query(ShoppingItem)
        .options(joinedload(ShoppingItem.food))
        .filter(ShoppingItem.user_id == user_id, ShoppingItem.is_checked == True)
        .all()
    )
    pantry_existing = {row[0] for row in db.query(PantryItem.food_id).filter(PantryItem.user_id == user_id).all()}
    moved: List[str] = []
    for item in checked:
        if item.food_id not in pantry_existing:
            quantity = item.quantity if item.quantity and not item.quantity.startswith("for ") else None
            db.add(PantryItem(user_id=user_id, food_id=item.food_id, quantity=quantity))
            pantry_existing.add(item.food_id)
        moved.append(item.food.name if item.food else "")
        db.delete(item)
    db.commit()
    return {"moved": len(checked), "names": moved}
