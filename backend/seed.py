"""
Database Seed Script for Smart Meal Planner
Populates the database with the admin and demo users, the ingredient catalog (with aliases,
substitutes, staples and nutrition per 100g), structured recipes linked to those ingredients,
and a sample pantry for the demo user. Safe to run repeatedly: existing rows are updated in place.
"""

import json
from pathlib import Path

from app.database import SessionLocal, engine, Base
from app.schema_upgrade import ensure_schema
from app.models.user import User
from app.models.dietary_profile import DietaryProfile
from app.models.food import Food
from app.models.nutrition import Nutrition
from app.models.recipe import Recipe
from app.models.pantry_item import PantryItem
from app.auth.password import hash_password
from app.services.ingredient_service import load_catalog, sync_recipe_ingredients

DATA_DIR = Path(__file__).resolve().parent / "data"

LEGACY_DISH_FOODS = [
    "Idli", "Dosa", "Appam", "Puttu", "Chapati", "Biryani", "Fried Rice",
    "Chicken Curry", "Fish Curry", "Sambar", "Avial", "Vegetable Curry",
]

DEMO_PANTRY = ["Tomato", "Onion", "Potato", "Papaya", "Rice", "Green Chilli", "Curd", "Lemon"]


def _load_json(filename: str):
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_users(db) -> None:
    admin = db.query(User).filter(User.email == "admin@mealplanner.com").first()
    if not admin:
        admin = User(
            full_name="System Administrator",
            email="admin@mealplanner.com",
            password_hash=hash_password("Admin@123"),
            age=30,
            gender="other",
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.flush()
        db.add(DietaryProfile(
            user_id=admin.id,
            diet_type="None",
            allergies=[],
            preferred_foods=["Rice", "Chicken"],
            avoided_foods=[],
            daily_calories=2200.0,
            protein_target=85.0,
            carbohydrate_target=275.0,
            fat_target=70.0,
            height=175.0,
            weight=72.0,
            activity_level="moderate"
        ))
        print("[OK] Seeded Admin User: admin@mealplanner.com / Admin@123")

    demo_user = db.query(User).filter(User.email == "user@mealplanner.com").first()
    if not demo_user:
        demo_user = User(
            full_name="Abhijith Demo User",
            email="user@mealplanner.com",
            password_hash=hash_password("User@123"),
            age=24,
            gender="male",
            role="user",
            is_active=True
        )
        db.add(demo_user)
        db.flush()
        db.add(DietaryProfile(
            user_id=demo_user.id,
            diet_type="Vegetarian",
            allergies=["Peanuts"],
            preferred_foods=["Dosa", "Idli", "Sambar"],
            avoided_foods=["Beef"],
            daily_calories=2000.0,
            protein_target=75.0,
            carbohydrate_target=250.0,
            fat_target=65.0,
            height=172.0,
            weight=66.0,
            activity_level="moderate"
        ))
        print("[OK] Seeded Demo User: user@mealplanner.com / User@123")
    db.flush()


def seed_ingredients(db) -> None:
    for item in _load_json("ingredients.json"):
        calories, protein, carbs, fat, fiber, sugar = item["per100g"]
        food = db.query(Food).filter(Food.name.ilike(item["name"])).first()
        if food is None:
            food = Food(name=item["name"])
            db.add(food)
            action = "Seeded"
        else:
            action = "Updated"
        food.category = item["category"]
        food.aliases = item.get("aliases", [])
        food.substitutes = item.get("substitutes", [])
        food.is_staple = bool(item.get("staple", False))
        food.is_active = True
        db.flush()

        nutrition = db.query(Nutrition).filter(Nutrition.food_id == food.id).first()
        if nutrition is None:
            nutrition = Nutrition(food_id=food.id)
            db.add(nutrition)
        nutrition.serving_size = "100g"
        nutrition.calories = calories
        nutrition.protein = protein
        nutrition.carbohydrates = carbs
        nutrition.fat = fat
        nutrition.fiber = fiber
        nutrition.sugar = sugar
        print(f"[OK] {action} Ingredient: {food.name}")

    for legacy_name in LEGACY_DISH_FOODS:
        legacy = db.query(Food).filter(Food.name == legacy_name).first()
        if legacy and legacy.is_active:
            legacy.is_active = False
            print(f"[OK] Retired legacy dish entry: {legacy_name}")
    db.flush()


def seed_recipes(db) -> None:
    _, index = load_catalog(db)
    for rec in _load_json("recipes.json"):
        calories, protein, carbs, fat, fiber = rec["nutrition"]
        recipe = db.query(Recipe).filter(Recipe.name == rec["name"]).first()
        if recipe is None:
            recipe = Recipe(name=rec["name"], ingredients=[], allergy_information=[])
            db.add(recipe)
            action = "Seeded"
        else:
            action = "Updated"
        recipe.description = rec["description"]
        recipe.instructions = "\n".join(f"{i}. {step}" for i, step in enumerate(rec["steps"], start=1))
        recipe.meal_type = rec["meal_type"]
        recipe.diet_type = rec["diet_type"]
        recipe.allergy_information = []
        if rec.get("image_url"):
            recipe.image_url = rec["image_url"]
        recipe.preparation_time = rec["prep"]
        recipe.cooking_time = rec["cook"]
        recipe.servings = rec["servings"]
        recipe.calories = calories
        recipe.protein = protein
        recipe.carbohydrates = carbs
        recipe.fat = fat
        recipe.fiber = fiber
        db.flush()

        items = [
            {"name": entry[0], "quantity": entry[1] if len(entry) > 1 else None, "is_optional": bool(entry[2]) if len(entry) > 2 else False}
            for entry in rec["ingredients"]
        ]
        sync_recipe_ingredients(db, recipe, items=items, index=index)
        print(f"[OK] {action} Recipe: {recipe.name}")


def seed_demo_pantry(db) -> None:
    demo_user = db.query(User).filter(User.email == "user@mealplanner.com").first()
    if not demo_user:
        return
    if db.query(PantryItem).filter(PantryItem.user_id == demo_user.id).first():
        return
    for name in DEMO_PANTRY:
        food = db.query(Food).filter(Food.name == name).first()
        if food:
            db.add(PantryItem(user_id=demo_user.id, food_id=food.id))
    print(f"[OK] Seeded demo pantry: {', '.join(DEMO_PANTRY)}")


def seed_database():
    """Seed the database with users, ingredient catalog, structured recipes and a demo pantry."""
    Base.metadata.create_all(bind=engine)
    ensure_schema(engine)
    db = SessionLocal()
    try:
        seed_users(db)
        seed_ingredients(db)
        seed_recipes(db)
        seed_demo_pantry(db)
        db.commit()
        print("\n--> Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
