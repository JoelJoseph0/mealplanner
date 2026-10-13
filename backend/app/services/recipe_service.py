from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeCreate, RecipeUpdate
from app.models.recipe_ingredient import RecipeIngredient
from app.services.ingredient_service import sync_recipe_ingredients, load_catalog


def get_recipes(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    meal_type: Optional[str] = None,
    diet_type: Optional[str] = None,
    search: Optional[str] = None,
    max_calories: Optional[float] = None,
    ingredient: Optional[str] = None
) -> List[Recipe]:
    """Retrieve recipes with optional multi-attribute filters."""
    query = db.query(Recipe)
    if ingredient:
        _, index = load_catalog(db)
        food_id = index.resolve(ingredient)
        if food_id is None:
            return []
        query = query.join(RecipeIngredient, RecipeIngredient.recipe_id == Recipe.id).filter(RecipeIngredient.food_id == food_id)
    if meal_type:
        query = query.filter(Recipe.meal_type.ilike(f"%{meal_type}%"))
    if diet_type:
        query = query.filter(Recipe.diet_type.ilike(f"%{diet_type}%"))
    if search:
        query = query.filter(Recipe.name.ilike(f"%{search}%"))
    if max_calories is not None:
        query = query.filter(Recipe.calories <= max_calories)
    return query.offset(skip).limit(limit).all()


def get_recipe_by_id(db: Session, recipe_id: int) -> Recipe:
    """Retrieve a single recipe by ID or raise 404."""
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recipe with ID {recipe_id} not found"
        )
    return recipe


def create_recipe(db: Session, recipe_in: RecipeCreate) -> Recipe:
    """Create a new recipe (admin privileged)."""
    new_recipe = Recipe(
        name=recipe_in.name.strip(),
        description=recipe_in.description,
        ingredients=recipe_in.ingredients,
        instructions=recipe_in.instructions,
        meal_type=recipe_in.meal_type,
        diet_type=recipe_in.diet_type,
        allergy_information=recipe_in.allergy_information,
        image_url=recipe_in.image_url,
        preparation_time=recipe_in.preparation_time,
        cooking_time=recipe_in.cooking_time,
        servings=recipe_in.servings,
        calories=recipe_in.calories,
        protein=recipe_in.protein,
        carbohydrates=recipe_in.carbohydrates,
        fat=recipe_in.fat,
        fiber=recipe_in.fiber
    )
    db.add(new_recipe)
    db.flush()
    sync_recipe_ingredients(db, new_recipe, lines=recipe_in.ingredients, items=recipe_in.ingredient_items)
    db.commit()
    db.refresh(new_recipe)
    return new_recipe


def update_recipe(db: Session, recipe_id: int, recipe_in: RecipeUpdate) -> Recipe:
    """Update recipe attributes (admin privileged)."""
    recipe = get_recipe_by_id(db, recipe_id)

    if recipe_in.name is not None:
        recipe.name = recipe_in.name.strip()
    if recipe_in.description is not None:
        recipe.description = recipe_in.description
    if recipe_in.ingredient_items is not None:
        sync_recipe_ingredients(db, recipe, items=recipe_in.ingredient_items)
    elif recipe_in.ingredients is not None:
        sync_recipe_ingredients(db, recipe, lines=recipe_in.ingredients)
    if recipe_in.instructions is not None:
        recipe.instructions = recipe_in.instructions
    if recipe_in.meal_type is not None:
        recipe.meal_type = recipe_in.meal_type
    if recipe_in.diet_type is not None:
        recipe.diet_type = recipe_in.diet_type
    if recipe_in.allergy_information is not None:
        recipe.allergy_information = recipe_in.allergy_information
    if recipe_in.image_url is not None:
        recipe.image_url = recipe_in.image_url
    if recipe_in.preparation_time is not None:
        recipe.preparation_time = recipe_in.preparation_time
    if recipe_in.cooking_time is not None:
        recipe.cooking_time = recipe_in.cooking_time
    if recipe_in.servings is not None:
        recipe.servings = recipe_in.servings
    if recipe_in.calories is not None:
        recipe.calories = recipe_in.calories
    if recipe_in.protein is not None:
        recipe.protein = recipe_in.protein
    if recipe_in.carbohydrates is not None:
        recipe.carbohydrates = recipe_in.carbohydrates
    if recipe_in.fat is not None:
        recipe.fat = recipe_in.fat
    if recipe_in.fiber is not None:
        recipe.fiber = recipe_in.fiber

    db.commit()
    db.refresh(recipe)
    return recipe


def delete_recipe(db: Session, recipe_id: int) -> bool:
    """Delete a recipe (admin privileged)."""
    recipe = get_recipe_by_id(db, recipe_id)
    db.delete(recipe)
    db.commit()
    return True
