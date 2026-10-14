import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from app.models.food import Food
from app.utils.quantity import parse_quantity, compare_quantities, format_quantity

CATALOG = [
    ("Tomato", "Vegetables", [], False),
    ("Onion", "Vegetables", [], False),
    ("Rice", "Grains & Cereals", [], False),
    ("Paneer", "Dairy & Alternatives", [], False),
    ("Garlic", "Vegetables", [], False),
    ("Salt", "Spices & Seasonings", [], True),
]


@pytest.fixture
def foods(db_session):
    for name, category, aliases, staple in CATALOG:
        db_session.add(Food(name=name, category=category, aliases=aliases, substitutes=[], is_staple=staple, is_active=True))
    db_session.commit()
    return {f.name: f.id for f in db_session.query(Food).all()}


def _recipe(client, admin_headers, name, ingredients, meal_type="Lunch", calories=420.0):
    resp = client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": name,
            "description": name,
            "ingredients": ingredients,
            "instructions": "1. Cook and serve.",
            "meal_type": meal_type,
            "diet_type": "Vegan",
            "allergy_information": [],
            "calories": calories,
            "protein": 12.0,
            "carbohydrates": 60.0,
            "fat": 8.0,
            "fiber": 5.0,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]


def test_quantity_parsing_and_comparison():
    assert parse_quantity("2 kg") == (2000.0, "mass")
    assert parse_quantity("1 1/2 cups") == (360.0, "volume")
    assert parse_quantity("3") == (3.0, "count")
    assert parse_quantity("4 medium") == (4.0, "count")
    assert parse_quantity("6 cloves") == (6.0, "other:clove")
    assert parse_quantity("to taste") is None
    assert compare_quantities("1", "4") == (1.0, 4.0, "count")
    assert compare_quantities("500 g", "4") is None
    assert format_quantity(1500.0, "mass") == "1.5 kg"


def test_short_quantity_counts_as_missing_in_suggestions(client: TestClient, auth_headers, admin_headers, foods):
    _recipe(client, admin_headers, "Quantity Tomato Rice", ["Tomato - 4", "Rice - 1 cup"])
    client.post("/api/pantry", headers=auth_headers, json={"items": [{"name": "tomato", "quantity": "1"}, {"name": "rice"}]})

    data = client.post("/api/pantry/suggest", headers=auth_headers, json={"max_missing": 2}).json()["data"]
    match = next(r for r in data["results"] if r["recipe"]["name"] == "Quantity Tomato Rice")
    assert match["status"] == "almost"
    short = next(m for m in match["missing"] if m["name"] == "Tomato")
    assert short["short"] is True
    assert "need 4" in short["note"]

    client.put(
        f"/api/pantry/{next(i['id'] for i in client.get('/api/pantry', headers=auth_headers).json()['data'] if i['name'] == 'Tomato')}",
        headers=auth_headers,
        json={"quantity": "6"},
    )
    data = client.post("/api/pantry/suggest", headers=auth_headers, json={"max_missing": 2}).json()["data"]
    match = next(r for r in data["results"] if r["recipe"]["name"] == "Quantity Tomato Rice")
    assert match["status"] == "ready"


def test_consuming_ingredients_reduces_or_removes_pantry_items(client: TestClient, auth_headers, admin_headers, foods):
    recipe = _recipe(client, admin_headers, "Consume Test Dish", ["Tomato - 2", "Onion - 1", "Rice - 1 cup"])
    client.post(
        "/api/pantry",
        headers=auth_headers,
        json={"items": [{"name": "tomato", "quantity": "5"}, {"name": "onion"}, {"name": "rice"}]},
    )

    resp = client.post(
        "/api/pantry/consume",
        headers=auth_headers,
        json={"recipe_id": recipe["id"], "food_ids": [foods["Tomato"], foods["Onion"]]},
    )
    assert resp.status_code == 200
    result = resp.json()["data"]
    assert result["reduced"] == [{"name": "Tomato", "remaining": "3"}]
    assert result["removed"] == ["Onion"]

    names = sorted(i["name"] for i in client.get("/api/pantry", headers=auth_headers).json()["data"])
    assert names == ["Rice", "Tomato"]
    assert client.post("/api/pantry/consume", headers=auth_headers, json={"recipe_id": 999999, "food_ids": []}).status_code == 404


def test_shopping_list_lifecycle(client: TestClient, auth_headers, admin_headers, foods):
    recipe = _recipe(client, admin_headers, "Shopping Test Dish", ["Tomato - 3", "Paneer - 100 g", "Garlic - 4 cloves", "Salt"])
    client.post("/api/pantry", headers=auth_headers, json={"names": ["Garlic"]})

    added = client.post("/api/shopping/from-recipe", headers=auth_headers, json={"recipe_id": recipe["id"]})
    assert added.status_code == 201
    assert added.json()["data"]["added"] == 2

    items = client.get("/api/shopping", headers=auth_headers).json()["data"]
    assert sorted(i["name"] for i in items) == ["Paneer", "Tomato"]

    again = client.post("/api/shopping/from-recipe", headers=auth_headers, json={"recipe_id": recipe["id"]}).json()["data"]
    assert again["added"] == 0

    manual = client.post("/api/shopping", headers=auth_headers, json={"names": ["onion", "dragon fruit"]}).json()["data"]
    assert manual["added"] == 1
    assert manual["unrecognized"][0]["input"] == "dragon fruit"

    tomato = next(i for i in items if i["name"] == "Tomato")
    ticked = client.put(f"/api/shopping/{tomato['id']}", headers=auth_headers, json={"is_checked": True})
    assert ticked.json()["data"]["is_checked"] is True

    done = client.post("/api/shopping/checkout", headers=auth_headers).json()["data"]
    assert done["moved"] == 1
    assert "Tomato" in [i["name"] for i in client.get("/api/pantry", headers=auth_headers).json()["data"]]
    assert sorted(i["name"] for i in client.get("/api/shopping", headers=auth_headers).json()["data"]) == ["Onion", "Paneer"]

    cleared = client.delete("/api/shopping", headers=auth_headers).json()["data"]
    assert cleared["removed"] == 2


def test_shopping_list_from_meal_plan(client: TestClient, auth_headers, admin_headers, foods):
    for meal_type in ("Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"):
        _recipe(client, admin_headers, f"Plan Dish {meal_type}", ["Tomato - 2", "Paneer - 50 g"], meal_type=meal_type, calories=300.0)
    client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": "2026-11-02", "force_regenerate": True})

    resp = client.post("/api/shopping/from-plan", headers=auth_headers, json={"start_date": "2026-11-02", "days": 7})
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["meals_considered"] >= 5
    names = {i["name"] for i in client.get("/api/shopping", headers=auth_headers).json()["data"]}
    assert {"Tomato", "Paneer"} <= names


def test_recipe_ratings_feed_feedback_and_recommendations(client: TestClient, auth_headers, admin_headers):
    liked = _recipe(client, admin_headers, "Rated Liked Dish", ["Rice"])
    disliked = _recipe(client, admin_headers, "Rated Disliked Dish", ["Rice"])

    assert client.put(f"/api/recipes/{liked['id']}/rating", headers=auth_headers, json={"feedback": "positive"}).status_code == 200
    assert client.put(f"/api/recipes/{disliked['id']}/rating", headers=auth_headers, json={"feedback": "negative"}).status_code == 200
    assert client.put(f"/api/recipes/{liked['id']}/rating", headers=auth_headers, json={"feedback": "loved"}).status_code == 400
    assert client.put("/api/recipes/999999/rating", headers=auth_headers, json={"feedback": "positive"}).status_code == 404

    ratings = client.get("/api/recipes/ratings", headers=auth_headers).json()["data"]
    assert ratings[str(liked["id"])] == "positive"
    assert ratings[str(disliked["id"])] == "negative"

    recs = client.post("/api/recommendations", headers=auth_headers, json={"limit": 50}).json()["data"]["recommendations"]
    scores = {r["recipe"]["name"]: r["score"] for r in recs}
    assert scores["Rated Liked Dish"] > scores["Rated Disliked Dish"]

    cleared = client.put(f"/api/recipes/{liked['id']}/rating", headers=auth_headers, json={"feedback": None})
    assert cleared.json()["data"]["feedback"] is None
    assert str(liked["id"]) not in client.get("/api/recipes/ratings", headers=auth_headers).json()["data"]


@pytest.fixture
def plan_recipes(client, admin_headers):
    ids = []
    for meal_type in ("Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"):
        for n in range(3):
            ids.append(_recipe(client, admin_headers, f"Flow {meal_type} {n}", ["Rice"], meal_type=meal_type, calories=300.0 + n * 20)["id"])
    return ids


def test_plan_is_not_created_until_requested(client: TestClient, auth_headers, plan_recipes):
    daily = client.get("/api/meal-plans/daily", params={"target_date": "2026-12-01"}, headers=auth_headers).json()["data"]
    assert daily["generated"] is False
    assert daily["meals_list"] == []
    assert daily["totals"]["calories"] == 0

    weekly = client.get("/api/meal-plans/weekly", params={"start_date": "2026-12-01"}, headers=auth_headers).json()["data"]
    assert weekly["generated"] is False
    assert len(weekly["days"]) == 7

    created = client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": "2026-12-01"}).json()["data"]
    assert created["generated"] is True
    assert len(created["meals_list"]) == 5
    again = client.get("/api/meal-plans/daily", params={"target_date": "2026-12-01"}, headers=auth_headers).json()["data"]
    assert again["generated"] is True


def test_locked_meal_survives_regeneration_and_swap_changes_recipe(client: TestClient, auth_headers, plan_recipes):
    plan = client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": "2026-12-02", "force_regenerate": True}).json()["data"]
    lunch = plan["meals"]["Lunch"]

    locked = client.put(f"/api/meal-plans/{lunch['id']}/lock", headers=auth_headers, json={"locked": True})
    assert locked.json()["data"]["locked"] is True
    assert client.post(f"/api/meal-plans/{lunch['id']}/swap", headers=auth_headers, json={}).status_code == 400

    for _ in range(3):
        refreshed = client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": "2026-12-02", "force_regenerate": True}).json()["data"]
        assert refreshed["meals"]["Lunch"]["recipe_id"] == lunch["recipe_id"]
        assert refreshed["meals"]["Lunch"]["locked"] is True
        assert len(refreshed["meals_list"]) == 5

    client.put(f"/api/meal-plans/{lunch['id']}/lock", headers=auth_headers, json={"locked": False})
    swapped = client.post(f"/api/meal-plans/{lunch['id']}/swap", headers=auth_headers, json={}).json()["data"]
    assert swapped["recipe_id"] != lunch["recipe_id"]
    day_ids = [m["recipe_id"] for m in client.get("/api/meal-plans/daily", params={"target_date": "2026-12-02"}, headers=auth_headers).json()["data"]["meals_list"]]
    assert len(set(day_ids)) == len(day_ids)


def test_completing_a_planned_meal_logs_history(client: TestClient, auth_headers, plan_recipes):
    plan = client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": "2026-12-03", "force_regenerate": True}).json()["data"]
    breakfast = plan["meals"]["Breakfast"]
    before = len(client.get("/api/history", headers=auth_headers).json()["data"])

    done = client.put(f"/api/meal-plans/{breakfast['id']}/complete", headers=auth_headers, json={"completed": True})
    assert done.json()["data"]["completed"] is True
    history = client.get("/api/history", headers=auth_headers).json()["data"]
    assert len(history) == before + 1
    assert any(h["recipe_id"] == breakfast["recipe_id"] for h in history)

    persisted = client.get("/api/meal-plans/daily", params={"target_date": "2026-12-03"}, headers=auth_headers).json()["data"]
    assert persisted["meals"]["Breakfast"]["completed"] is True

    client.put(f"/api/meal-plans/{breakfast['id']}/complete", headers=auth_headers, json={"completed": False})
    assert len(client.get("/api/history", headers=auth_headers).json()["data"]) == before


def test_disliked_recipes_are_left_out_of_new_plans(client: TestClient, auth_headers, plan_recipes):
    client.put(f"/api/recipes/{plan_recipes[0]}/rating", headers=auth_headers, json={"feedback": "negative"})
    for day in ("2026-12-07", "2026-12-08", "2026-12-09"):
        data = client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": day, "force_regenerate": True}).json()["data"]
        assert plan_recipes[0] not in [m["recipe_id"] for m in data["meals_list"]]


def test_portions_are_sized_toward_slot_calorie_target(client: TestClient, auth_headers, admin_headers):
    for meal_type, calories in (("Breakfast", 200.0), ("Morning Snack", 90.0), ("Lunch", 330.0), ("Evening Snack", 60.0), ("Dinner", 200.0)):
        _recipe(client, admin_headers, f"Portion {meal_type}", ["Rice"], meal_type=meal_type, calories=calories)
    client.put("/api/users/preferences", headers=auth_headers, json={"daily_calories": 2000.0})
    data = client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": "2026-12-10", "force_regenerate": True}).json()["data"]
    assert data["meals"]["Lunch"]["servings"] == 2
    assert 1500 < data["totals"]["calories"] <= 2200


def test_admin_uploads_recipe_image_and_edits_ingredient_with_nutrition(client: TestClient, auth_headers, admin_headers):
    buffer = io.BytesIO()
    Image.new("RGB", (40, 40), (200, 60, 30)).save(buffer, format="JPEG")
    buffer.seek(0)

    denied = client.post("/api/admin/upload-image", headers=auth_headers, files={"file": ("dish.jpg", buffer, "image/jpeg")})
    assert denied.status_code == 403
    buffer.seek(0)
    ok = client.post("/api/admin/upload-image", headers=admin_headers, files={"file": ("dish.jpg", buffer, "image/jpeg")})
    assert ok.status_code == 201
    assert ok.json()["data"]["image_url"].startswith("/uploads/food_images/")

    created = client.post(
        "/api/admin/foods",
        headers=admin_headers,
        json={
            "name": "Merged Editor Ingredient",
            "category": "Vegetables",
            "aliases": ["merged alias"],
            "nutrition": {"serving_size": "100g", "calories": 42.0, "protein": 1.5, "carbohydrates": 8.0, "fat": 0.3, "fiber": 2.0, "sugar": 3.0},
        },
    )
    assert created.status_code == 201
    food = created.json()["data"]
    assert food["nutrition"]["calories"] == 42.0

    updated = client.put(
        f"/api/admin/foods/{food['id']}",
        headers=admin_headers,
        json={"nutrition": {"serving_size": "100g", "calories": 55.0, "protein": 2.0, "carbohydrates": 9.0, "fat": 0.4, "fiber": 2.5, "sugar": 3.5}},
    )
    assert updated.json()["data"]["nutrition"]["calories"] == 55.0
