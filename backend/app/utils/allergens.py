from typing import Iterable, List

DAIRY = "Dairy (Milk)"
GLUTEN = "Gluten (Wheat)"

INGREDIENT_ALLERGENS = {
    "Milk": [DAIRY],
    "Curd": [DAIRY],
    "Greek Yogurt": [DAIRY],
    "Paneer": [DAIRY],
    "Butter": [DAIRY],
    "Ghee": [DAIRY],
    "Cheese": [DAIRY],
    "Fresh Cream": [DAIRY],
    "Wheat Flour": [GLUTEN],
    "Maida": [GLUTEN],
    "Semolina": [GLUTEN],
    "Bread": [GLUTEN],
    "Breadcrumbs": [GLUTEN],
    "Vermicelli": [GLUTEN],
    "Pasta": [GLUTEN],
    "Noodles": [GLUTEN],
    "Soy Sauce": ["Soy", GLUTEN],
    "Egg": ["Egg"],
    "Peanuts": ["Peanuts"],
    "Peanut Butter": ["Peanuts"],
    "Almonds": ["Tree Nuts"],
    "Cashews": ["Tree Nuts"],
    "Walnuts": ["Tree Nuts"],
    "Pistachios": ["Tree Nuts"],
    "Almond Butter": ["Tree Nuts"],
    "Almond Milk": ["Tree Nuts"],
    "Fish": ["Fish"],
    "Salmon": ["Fish"],
    "Prawns": ["Shellfish"],
    "Tofu": ["Soy"],
    "Soya Chunks": ["Soy"],
    "Sesame Seeds": ["Sesame"],
    "Sesame Oil": ["Sesame"],
}


def derive_allergens(ingredient_names: Iterable[str]) -> List[str]:
    found: List[str] = []
    for name in ingredient_names:
        for allergen in INGREDIENT_ALLERGENS.get(name, []):
            if allergen not in found:
                found.append(allergen)
    return found


def merge_allergens(existing: Iterable[str], derived: Iterable[str]) -> List[str]:
    merged: List[str] = []
    seen = set()
    for label in list(existing or []) + list(derived or []):
        key = str(label).strip().lower()
        if key and key not in seen:
            seen.add(key)
            merged.append(str(label).strip())
    return merged
