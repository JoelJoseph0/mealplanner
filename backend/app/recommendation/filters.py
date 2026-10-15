from typing import List
from app.models.recipe import Recipe
from app.models.dietary_profile import DietaryProfile


def _ingredient_texts(recipe: Recipe) -> List[str]:
    texts = [str(i).strip().lower() for i in (recipe.ingredients or [])]
    for link in recipe.ingredient_links or []:
        if link.food is not None:
            texts.append(link.food.name.strip().lower())
    return texts


def is_diet_compatible(recipe_diet: str, user_diet: str) -> bool:
    """
    Check if a recipe's diet type is strictly compatible with the user's diet preference.
    Allowed diets: None, Vegetarian, Vegan, Non-Vegetarian, Eggetarian
    """
    if not user_diet or user_diet.lower() == "none":
        return True

    user_diet_lower = user_diet.lower()
    recipe_diet_lower = recipe_diet.lower()

    if user_diet_lower == "vegan":
        # Vegan users can ONLY eat vegan recipes
        return recipe_diet_lower == "vegan"

    if user_diet_lower == "vegetarian":
        # Vegetarian users can eat Vegetarian or Vegan recipes
        return recipe_diet_lower in {"vegetarian", "vegan"}

    if user_diet_lower == "eggetarian":
        # Eggetarian can eat Vegetarian, Vegan, or Eggetarian recipes
        return recipe_diet_lower in {"vegetarian", "vegan", "eggetarian"}

    if user_diet_lower == "non-vegetarian":
        # Non-vegetarian users can eat anything
        return True

    return True


def term_variants(term: str) -> List[str]:
    """The term itself plus its singular form, so 'peanuts' also matches 'peanut'."""
    value = term.strip().lower()
    variants = [value]
    if len(value) > 3 and value.endswith("ies"):
        variants.append(value[:-3] + "y")
    elif len(value) > 3 and value.endswith("es"):
        variants.append(value[:-2])
    if len(value) > 3 and value.endswith("s"):
        variants.append(value[:-1])
    return [v for v in dict.fromkeys(variants) if v]


def contains_allergen(recipe: Recipe, user_allergies: List[str]) -> bool:
    """
    STRICT allergy check.
    Returns True if the recipe contains ANY of the user's allergens in:
    1. recipe.allergy_information list
    2. recipe.ingredients list
    3. recipe.name
    """
    if not user_allergies:
        return False

    allergies_lower = [v for a in user_allergies if a.strip() for v in term_variants(a)]
    if not allergies_lower:
        return False

    # Check recipe allergy_information list
    recipe_allergies = [str(a).strip().lower() for a in (recipe.allergy_information or [])]
    for allergy in allergies_lower:
        if any(allergy in item for item in recipe_allergies):
            return True

    # Check recipe ingredients list
    recipe_ingredients = _ingredient_texts(recipe)
    for allergy in allergies_lower:
        if any(allergy in item for item in recipe_ingredients):
            return True

    # Check recipe name
    recipe_name_lower = recipe.name.lower()
    for allergy in allergies_lower:
        if allergy in recipe_name_lower:
            return True

    return False


def contains_avoided_foods(recipe: Recipe, avoided_foods: List[str]) -> bool:
    """
    Check if recipe contains any foods the user wants to avoid.
    """
    if not avoided_foods:
        return False

    avoided_lower = [f.strip().lower() for f in avoided_foods if f.strip()]
    if not avoided_lower:
        return False

    recipe_ingredients = _ingredient_texts(recipe)
    recipe_name_lower = recipe.name.lower()

    for item in avoided_lower:
        if any(item in ing for ing in recipe_ingredients) or item in recipe_name_lower:
            return True

    return False


INTOLERANCE_TERMS = {
    "lactose": ["milk", "curd", "yogurt", "paneer", "cheese", "cream", "butter", "khoa", "lassi", "buttermilk", "dairy"],
    "gluten": ["wheat", "atta", "maida", "semolina", "rava", "sooji", "bread", "pasta", "noodle", "barley", "vermicelli"],
    "fructose": ["honey", "jaggery", "mango", "apple", "pear"],
    "histamine": ["fermented", "vinegar", "spinach", "tomato", "cheese"],
    "caffeine": ["coffee", "tea", "cocoa", "chocolate"],
    "fodmap": ["onion", "garlic", "wheat", "beans", "chickpea"],
}


def restricted_terms(profile: DietaryProfile) -> List[str]:
    terms = [a for a in (profile.allergies or []) if a]
    for item in getattr(profile, "intolerances", None) or []:
        key = str(item).strip().lower()
        if not key:
            continue
        terms.append(key)
        for name, extra in INTOLERANCE_TERMS.items():
            if name in key:
                terms.extend(extra)
    return terms


def filter_recipes(
    recipes: List[Recipe],
    profile: DietaryProfile
) -> List[Recipe]:
    """
    Applies strict elimination filters:
    1. Filter out recipes violating user diet type
    2. Filter out recipes with ANY user allergen (Zero tolerance)
    3. Filter out recipes containing avoided foods
    """
    if not profile:
        return recipes

    user_diet = profile.diet_type or "None"
    allergies = restricted_terms(profile)
    avoided_foods = profile.avoided_foods or []

    safe_recipes = []
    for recipe in recipes:
        # 1. Diet Compatibility
        if not is_diet_compatible(recipe.diet_type, user_diet):
            continue

        # 2. Strict Allergy Elimination
        if contains_allergen(recipe, allergies):
            continue

        # 3. Avoided Foods Elimination
        if contains_avoided_foods(recipe, avoided_foods):
            continue

        safe_recipes.append(recipe)

    return safe_recipes
