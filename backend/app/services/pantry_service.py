from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.food import Food
from app.models.pantry_item import PantryItem
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.dietary_profile import DietaryProfile
from app.models.meal_history import MealHistory
from app.schemas.pantry import PantryAddRequest, PantryItemInput, PantryItemUpdate, CookSuggestionRequest
from app.schemas.recipe import RecipeResponse
from app.recommendation.filters import filter_recipes
from app.recommendation.scoring import calculate_recipe_score
from app.recommendation.pantry_matcher import EXPIRY_WINDOW_DAYS, find_cookable_recipes, rank_matches
from app.services.ingredient_service import load_catalog, build_pantry_context
from app.services.feedback_service import get_feedback_map
from app.utils.quantity import parse_quantity, compare_quantities, format_quantity


def _serialize_item(item: PantryItem) -> Dict[str, Any]:
    soon_limit = date.today() + timedelta(days=EXPIRY_WINDOW_DAYS)
    return {
        "id": item.id,
        "food_id": item.food_id,
        "name": item.food.name if item.food else "",
        "category": item.food.category if item.food else "",
        "is_staple": bool(item.food.is_staple) if item.food else False,
        "quantity": item.quantity,
        "expiry_date": item.expiry_date,
        "expires_soon": bool(item.expiry_date and item.expiry_date <= soon_limit),
        "created_at": item.created_at,
    }


def list_pantry(db: Session, user_id: int) -> List[Dict[str, Any]]:
    items = (
        db.query(PantryItem)
        .options(joinedload(PantryItem.food))
        .filter(PantryItem.user_id == user_id)
        .all()
    )
    items.sort(key=lambda i: ((i.food.category if i.food else ""), (i.food.name if i.food else "")))
    return [_serialize_item(i) for i in items]


def add_pantry_items(db: Session, user_id: int, request: PantryAddRequest) -> Dict[str, Any]:
    _, index = load_catalog(db)
    inputs = list(request.items)
    inputs.extend(PantryItemInput(name=part) for part in _split_names(request.names))

    added: List[PantryItem] = []
    updated: List[PantryItem] = []
    unrecognized: List[Dict[str, Any]] = []
    touched_ids = set()

    for entry in inputs:
        food = None
        if entry.food_id:
            food = db.query(Food).filter(Food.id == entry.food_id, Food.is_active == True).first()
        elif entry.name:
            food_id = index.resolve(entry.name)
            if food_id is not None:
                food = db.query(Food).filter(Food.id == food_id).first()

        if food is None:
            label = entry.name or f"#{entry.food_id}"
            unrecognized.append({"input": label, "suggestions": index.suggest(entry.name or "")})
            continue
        if food.id in touched_ids:
            continue
        touched_ids.add(food.id)

        existing = (
            db.query(PantryItem)
            .filter(PantryItem.user_id == user_id, PantryItem.food_id == food.id)
            .first()
        )
        if existing:
            if entry.quantity is not None:
                existing.quantity = entry.quantity
            if entry.expiry_date is not None:
                existing.expiry_date = entry.expiry_date
            updated.append(existing)
        else:
            item = PantryItem(
                user_id=user_id,
                food_id=food.id,
                quantity=entry.quantity,
                expiry_date=entry.expiry_date
            )
            db.add(item)
            added.append(item)

    db.commit()
    for item in added + updated:
        db.refresh(item)

    return {
        "added": [_serialize_item(i) for i in added],
        "updated": [_serialize_item(i) for i in updated],
        "unrecognized": unrecognized,
    }


def consume_ingredients(db: Session, user_id: int, recipe_id: int, food_ids: List[int]) -> Dict[str, Any]:
    recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredient_links).joinedload(RecipeIngredient.food))
        .filter(Recipe.id == recipe_id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recipe with ID {recipe_id} not found")
    needs = {link.food_id: link.quantity for link in recipe.ingredient_links}

    removed: List[str] = []
    reduced: List[Dict[str, Any]] = []
    items = (
        db.query(PantryItem)
        .options(joinedload(PantryItem.food))
        .filter(PantryItem.user_id == user_id, PantryItem.food_id.in_(food_ids or [-1]))
        .all()
    )
    for item in items:
        name = item.food.name if item.food else ""
        comparison = compare_quantities(item.quantity, needs.get(item.food_id))
        if comparison and comparison[0] > comparison[1] + 1e-9:
            remaining = format_quantity(comparison[0] - comparison[1], comparison[2])
            item.quantity = remaining
            reduced.append({"name": name, "remaining": remaining})
        else:
            db.delete(item)
            removed.append(name)
    db.commit()
    return {"removed": removed, "reduced": reduced}


def _split_names(values: Optional[List[str]]) -> List[str]:
    parts: List[str] = []
    for value in values or []:
        parts.extend(p.strip() for p in str(value).split(",") if p.strip())
    return parts


def _get_owned_item(db: Session, user_id: int, item_id: int) -> PantryItem:
    item = (
        db.query(PantryItem)
        .filter(PantryItem.id == item_id, PantryItem.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pantry item with ID {item_id} not found"
        )
    return item


def update_pantry_item(db: Session, user_id: int, item_id: int, update: PantryItemUpdate) -> Dict[str, Any]:
    item = _get_owned_item(db, user_id, item_id)
    if update.quantity is not None:
        item.quantity = update.quantity.strip() or None
    if update.clear_expiry:
        item.expiry_date = None
    elif update.expiry_date is not None:
        item.expiry_date = update.expiry_date
    db.commit()
    db.refresh(item)
    return _serialize_item(item)


def remove_pantry_item(db: Session, user_id: int, item_id: int) -> None:
    item = _get_owned_item(db, user_id, item_id)
    db.delete(item)
    db.commit()


def clear_pantry(db: Session, user_id: int) -> int:
    count = db.query(PantryItem).filter(PantryItem.user_id == user_id).delete()
    db.commit()
    return count


def _load_recipes(db: Session) -> List[Recipe]:
    return (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredient_links).joinedload(RecipeIngredient.food))
        .all()
    )


def _feedback_map(db: Session, user_id: int) -> Dict[int, str]:
    return get_feedback_map(db, user_id)


def suggest_recipes(db: Session, user_id: int, request: CookSuggestionRequest) -> Dict[str, Any]:
    catalog = load_catalog(db)
    _, index = catalog

    pantry_items = db.query(PantryItem).filter(PantryItem.user_id == user_id).all()
    typed = _split_names(request.ingredients)

    unrecognized: List[Dict[str, Any]] = []
    pantry_ids = set()
    if typed:
        for text in typed:
            food_id = index.resolve(text)
            if food_id is None:
                unrecognized.append({"input": text, "suggestions": index.suggest(text)})
            else:
                pantry_ids.add(food_id)
        if request.use_saved_pantry:
            pantry_ids.update(i.food_id for i in pantry_items)
    else:
        pantry_ids.update(i.food_id for i in pantry_items)

    context = build_pantry_context(
        db,
        pantry_ids,
        pantry_items=[i for i in pantry_items if i.food_id in pantry_ids],
        assume_staples=request.assume_staples,
        catalog=catalog
    )

    recipes = _load_recipes(db)
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    candidates = filter_recipes(recipes, profile) if (profile and request.apply_profile) else recipes

    if request.meal_type and request.meal_type.lower() != "all":
        wanted = request.meal_type.lower()
        candidates = [r for r in candidates if wanted in (r.meal_type or "").lower()]

    matches = find_cookable_recipes(candidates, context, max_missing=request.max_missing) if pantry_ids else []

    feedback = _feedback_map(db, user_id)
    scored = {}
    reasons = {}
    for match in matches:
        score, why = calculate_recipe_score(
            recipe=match.recipe,
            profile=profile if request.apply_profile else None,
            recipe_feedback_history=feedback,
            pantry_coverage=match.coverage
        )
        scored[match.recipe.id] = score
        reasons[match.recipe.id] = why

    ranked = rank_matches(matches, scored)[:request.limit]

    shopping: Dict[int, Dict[str, Any]] = {}
    for match in ranked:
        for ref in match.missing:
            entry = shopping.setdefault(ref.food_id, {"food_id": ref.food_id, "name": ref.name, "unlocks": 0})
            entry["unlocks"] += 1

    results = []
    for match in ranked:
        payload = match.to_dict()
        payload["recipe"] = RecipeResponse.model_validate(match.recipe)
        payload["score"] = scored.get(match.recipe.id, 0.0)
        payload["match_reasons"] = reasons.get(match.recipe.id, [])
        results.append(payload)

    return {
        "pantry": sorted(context.food_names.get(fid, "") for fid in pantry_ids),
        "unrecognized": unrecognized,
        "total_evaluated": len(candidates),
        "ready_count": sum(1 for m in ranked if m.status == "ready"),
        "almost_count": sum(1 for m in ranked if m.status == "almost"),
        "results": results,
        "shopping_list": sorted(shopping.values(), key=lambda e: (-e["unlocks"], e["name"])),
    }
