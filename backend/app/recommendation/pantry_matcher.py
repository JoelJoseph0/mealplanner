from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Dict, Iterable, List, Optional, Set

from app.models.recipe import Recipe
from app.utils.ingredient_parser import IngredientIndex
from app.utils.quantity import compare_quantities, format_quantity

EXPIRY_WINDOW_DAYS = 3


@dataclass
class PantryContext:
    pantry_ids: Set[int]
    food_names: Dict[int, str]
    substitute_map: Dict[int, Set[int]] = field(default_factory=dict)
    expiring_ids: Set[int] = field(default_factory=set)
    staple_ids: Set[int] = field(default_factory=set)
    quantities: Dict[int, str] = field(default_factory=dict)
    assume_staples: bool = True

    def is_available(self, food_id: int) -> bool:
        return food_id in self.pantry_ids or (self.assume_staples and food_id in self.staple_ids)


@dataclass
class IngredientRef:
    food_id: int
    name: str
    quantity: Optional[str] = None
    in_pantry: bool = False
    short: bool = False
    note: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "food_id": self.food_id,
            "name": self.name,
            "quantity": self.quantity,
            "in_pantry": self.in_pantry,
            "short": self.short,
            "note": self.note,
        }


@dataclass
class PantryMatch:
    recipe: Recipe
    required_count: int
    have: List[IngredientRef]
    missing: List[IngredientRef]
    substitutions: List[Dict[str, str]]
    staples: List[str]
    optional: List[IngredientRef]
    expiring_used: List[str]
    pantry_used: int
    pantry_hits: int = 0

    @property
    def missing_count(self) -> int:
        return len(self.missing)

    @property
    def covered_count(self) -> int:
        return len(self.have) + len(self.substitutions)

    @property
    def coverage(self) -> float:
        if self.required_count == 0:
            return 1.0
        return self.covered_count / self.required_count

    @property
    def match_percent(self) -> int:
        return int(round(self.coverage * 100))

    @property
    def status(self) -> str:
        return "ready" if not self.missing else "almost"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "match_percent": self.match_percent,
            "required_count": self.required_count,
            "have": [ref.to_dict() for ref in self.have],
            "missing": [ref.to_dict() for ref in self.missing],
            "substitutions": self.substitutions,
            "staples": self.staples,
            "optional": [ref.to_dict() for ref in self.optional],
            "expiring_used": self.expiring_used,
        }


def build_substitute_map(foods: Iterable, index: IngredientIndex) -> Dict[int, Set[int]]:
    result: Dict[int, Set[int]] = {}
    for food in foods:
        for name in food.substitutes or []:
            other_id = index.resolve(name)
            if other_id is None or other_id == food.id:
                continue
            result.setdefault(food.id, set()).add(other_id)
            result.setdefault(other_id, set()).add(food.id)
    return result


def find_expiring_ids(pantry_items: Iterable, today: Optional[date] = None) -> Set[int]:
    reference = today or date.today()
    limit = reference + timedelta(days=EXPIRY_WINDOW_DAYS)
    return {
        item.food_id
        for item in pantry_items
        if item.expiry_date is not None and item.expiry_date <= limit
    }


def match_recipe(recipe: Recipe, context: PantryContext) -> PantryMatch:
    have: List[IngredientRef] = []
    missing: List[IngredientRef] = []
    substitutions: List[Dict[str, str]] = []
    staples: List[str] = []
    optional: List[IngredientRef] = []
    used_ids: Set[int] = set()
    required_count = 0
    substitution_hits = 0
    short_hits = 0

    for link in recipe.ingredient_links or []:
        food = link.food
        if food is None:
            continue
        in_pantry = food.id in context.pantry_ids
        ref = IngredientRef(food.id, food.name, link.quantity, in_pantry)
        if in_pantry:
            used_ids.add(food.id)

        if link.is_optional:
            optional.append(ref)
            continue
        if context.assume_staples and food.is_staple:
            staples.append(food.name)
            continue

        required_count += 1
        if in_pantry:
            comparison = compare_quantities(context.quantities.get(food.id), link.quantity)
            if comparison and comparison[0] + 1e-9 < comparison[1]:
                ref.short = True
                ref.note = f"have {format_quantity(comparison[0], comparison[2])}, need {format_quantity(comparison[1], comparison[2])}"
                missing.append(ref)
                short_hits += 1
            else:
                have.append(ref)
            continue

        alternative = next(
            (sid for sid in sorted(context.substitute_map.get(food.id, set())) if context.is_available(sid)),
            None
        )
        if alternative is not None:
            if alternative in context.pantry_ids:
                used_ids.add(alternative)
                substitution_hits += 1
            substitutions.append({
                "missing": food.name,
                "use": context.food_names.get(alternative, "substitute"),
            })
            continue

        missing.append(ref)

    expiring_used = sorted(context.food_names.get(fid, "") for fid in used_ids & context.expiring_ids)

    return PantryMatch(
        recipe=recipe,
        required_count=required_count,
        have=have,
        missing=missing,
        substitutions=substitutions,
        staples=staples,
        optional=optional,
        expiring_used=[name for name in expiring_used if name],
        pantry_used=len(used_ids),
        pantry_hits=len(have) + substitution_hits + short_hits,
    )


def find_cookable_recipes(
    recipes: Iterable[Recipe],
    context: PantryContext,
    max_missing: int = 2
) -> List[PantryMatch]:
    results: List[PantryMatch] = []
    for recipe in recipes:
        match = match_recipe(recipe, context)
        if match.pantry_hits == 0:
            continue
        if match.missing_count > max_missing:
            continue
        results.append(match)
    return results


def rank_matches(matches: List[PantryMatch], profile_scores: Optional[Dict[int, float]] = None) -> List[PantryMatch]:
    scores = profile_scores or {}
    return sorted(
        matches,
        key=lambda m: (
            m.missing_count,
            -m.coverage,
            -len(m.expiring_used),
            -m.pantry_used,
            -scores.get(m.recipe.id, 0.0),
            m.recipe.name,
        )
    )


def pantry_coverage(recipe: Recipe, context: PantryContext) -> float:
    match = match_recipe(recipe, context)
    if match.pantry_hits == 0:
        return 0.0
    return match.coverage
