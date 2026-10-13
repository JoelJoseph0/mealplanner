from typing import Iterable, List, Optional, Sequence, Tuple
from sqlalchemy.orm import Session
from app.models.food import Food
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.pantry_item import PantryItem
from app.recommendation.pantry_matcher import PantryContext, build_substitute_map, find_expiring_ids
from app.utils.ingredient_parser import IngredientIndex, normalize_key, parse_ingredient_line
from app.utils.allergens import derive_allergens, merge_allergens

DEFAULT_CATEGORY = "Others"


def load_catalog(db: Session) -> Tuple[List[Food], IngredientIndex]:
    foods = db.query(Food).filter(Food.is_active == True).all()
    return foods, IngredientIndex(foods)


def search_ingredients(
    db: Session,
    query: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
) -> List[dict]:
    foods = db.query(Food).filter(Food.is_active == True).all()
    if category:
        foods = [f for f in foods if (f.category or "").lower() == category.lower()]

    term = (query or "").strip().lower()
    term_key = normalize_key(term)
    ranked = []
    for food in foods:
        name_lower = food.name.lower()
        if not term:
            ranked.append((2, name_lower, food, None))
            continue
        if name_lower.startswith(term) or normalize_key(food.name).startswith(term_key):
            ranked.append((0, name_lower, food, None))
            continue
        alias_hit = next(
            (a for a in (food.aliases or []) if a.lower().startswith(term) or normalize_key(a).startswith(term_key)),
            None
        )
        if alias_hit:
            ranked.append((1, name_lower, food, alias_hit))
            continue
        if term in name_lower:
            ranked.append((2, name_lower, food, None))
            continue
        alias_contains = next((a for a in (food.aliases or []) if term in a.lower()), None)
        if alias_contains:
            ranked.append((3, name_lower, food, alias_contains))

    ranked.sort(key=lambda item: (item[0], item[1]))
    return [
        {
            "id": food.id,
            "name": food.name,
            "category": food.category,
            "is_staple": bool(food.is_staple),
            "matched_alias": alias,
        }
        for _, _, food, alias in ranked[:limit]
    ]


def list_categories(db: Session) -> List[str]:
    rows = db.query(Food.category).filter(Food.is_active == True).distinct().all()
    return sorted({row[0] for row in rows if row[0]})


def get_or_create_food(db: Session, index: IngredientIndex, raw_name: str) -> Optional[Food]:
    food_id = index.resolve(raw_name)
    if food_id is not None:
        return db.query(Food).filter(Food.id == food_id).first()

    name_part, _, _ = parse_ingredient_line(raw_name)
    clean_name = " ".join(name_part.split()).strip(" ,.-")
    if len(clean_name) < 2:
        return None
    display_name = clean_name[:100].title()

    existing = db.query(Food).filter(Food.name.ilike(display_name)).first()
    if existing:
        return existing

    food = Food(
        name=display_name,
        category=DEFAULT_CATEGORY,
        description=None,
        aliases=[],
        substitutes=[],
        is_staple=False,
        is_active=True
    )
    db.add(food)
    db.flush()
    index.key_to_id.setdefault(normalize_key(display_name), food.id)
    index.names[food.id] = food.name
    return food


def _format_display(name: str, quantity: Optional[str], is_optional: bool) -> str:
    text = f"{name} - {quantity}" if quantity else name
    return f"{text} (optional)" if is_optional else text


def sync_recipe_ingredients(
    db: Session,
    recipe: Recipe,
    lines: Optional[Sequence[str]] = None,
    items: Optional[Iterable] = None,
    index: Optional[IngredientIndex] = None
) -> None:
    catalog_index = index or load_catalog(db)[1]
    entries = []
    if items:
        for item in items:
            name = getattr(item, "name", None) if not isinstance(item, dict) else item.get("name")
            food_id = getattr(item, "food_id", None) if not isinstance(item, dict) else item.get("food_id")
            quantity = getattr(item, "quantity", None) if not isinstance(item, dict) else item.get("quantity")
            is_optional = getattr(item, "is_optional", False) if not isinstance(item, dict) else item.get("is_optional", False)
            entries.append((name, food_id, quantity, bool(is_optional)))
    else:
        for line in lines or []:
            if not str(line).strip():
                continue
            name, quantity, is_optional = parse_ingredient_line(str(line))
            entries.append((str(line), None, quantity, is_optional))

    recipe.ingredient_links.clear()
    db.flush()

    seen = set()
    display_lines = []
    for position, (name, food_id, quantity, is_optional) in enumerate(entries):
        food = None
        if food_id:
            food = db.query(Food).filter(Food.id == food_id).first()
        if food is None and name:
            food = get_or_create_food(db, catalog_index, name)
        if food is None or food.id in seen:
            continue
        seen.add(food.id)
        recipe.ingredient_links.append(
            RecipeIngredient(
                food=food,
                quantity=(quantity or None),
                is_optional=is_optional,
                position=position
            )
        )
        display_lines.append(_format_display(food.name, quantity, is_optional))

    recipe.ingredients = display_lines
    linked_names = [link.food.name for link in recipe.ingredient_links if link.food is not None]
    recipe.allergy_information = merge_allergens(recipe.allergy_information or [], derive_allergens(linked_names))
    db.flush()


def build_pantry_context(
    db: Session,
    pantry_ids: Iterable[int],
    pantry_items: Optional[Iterable[PantryItem]] = None,
    assume_staples: bool = True,
    catalog: Optional[Tuple[List[Food], IngredientIndex]] = None
) -> PantryContext:
    foods, index = catalog or load_catalog(db)
    return PantryContext(
        pantry_ids=set(pantry_ids),
        food_names={f.id: f.name for f in foods},
        substitute_map=build_substitute_map(foods, index),
        expiring_ids=find_expiring_ids(pantry_items or []),
        staple_ids={f.id for f in foods if f.is_staple},
        assume_staples=assume_staples,
    )


def get_user_pantry_context(db: Session, user_id: int, assume_staples: bool = True) -> PantryContext:
    items = db.query(PantryItem).filter(PantryItem.user_id == user_id).all()
    return build_pantry_context(db, [i.food_id for i in items], items, assume_staples)
