import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from app.models.dietary_profile import DietaryProfile
from app.models.meal_history import MealHistory
from app.models.user import User
from app.recommendation.filters import filter_recipes
from app.utils.helpers import calculate_daily_targets


def _recipe(client, admin_headers, name, ingredients, meal_type="Lunch", calories=420.0, protein=12.0, diet="Vegan"):
    resp = client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": name,
            "description": name,
            "ingredients": ingredients,
            "instructions": "1. Cook and serve.",
            "meal_type": meal_type,
            "diet_type": diet,
            "allergy_information": [],
            "calories": calories,
            "protein": protein,
            "carbohydrates": 60.0,
            "fat": 8.0,
            "fiber": 5.0,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]


@pytest.fixture
def plan_recipes(client, admin_headers):
    ids = []
    for meal_type in ("Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner"):
        for n in range(3):
            ids.append(_recipe(client, admin_headers, f"Req {meal_type} {n}", ["Rice"], meal_type=meal_type, calories=300.0 + n * 20)["id"])
    return ids


def test_goal_changes_calorie_and_protein_targets():
    maintain = calculate_daily_targets(70, 175, 25, "male", "moderate", "maintain")
    lose = calculate_daily_targets(70, 175, 25, "male", "moderate", "lose")
    muscle = calculate_daily_targets(70, 175, 25, "male", "moderate", "muscle")
    assert lose["daily_calories"] == pytest.approx(maintain["daily_calories"] - 500, abs=1)
    assert muscle["daily_calories"] > maintain["daily_calories"]
    assert muscle["protein_target"] > maintain["protein_target"]
    tiny_maintain = calculate_daily_targets(40, 150, 70, "female", "sedentary", "maintain")
    tiny_lose = calculate_daily_targets(40, 150, 70, "female", "sedentary", "lose")
    assert tiny_lose["daily_calories"] == tiny_maintain["daily_calories"]


def test_preferences_store_goal_intolerances_and_conditions(client: TestClient, auth_headers):
    client.put("/api/users/preferences", headers=auth_headers, json={"goal": "muscle"})
    before = client.get("/api/users/preferences", headers=auth_headers).json()["data"]
    resp = client.put(
        "/api/users/preferences",
        headers=auth_headers,
        json={"goal": "lose", "intolerances": ["Lactose"], "health_conditions": ["Diabetes"]},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["goal"] == "lose"
    assert data["intolerances"] == ["Lactose"]
    assert data["health_conditions"] == ["Diabetes"]
    assert data["daily_calories"] < before["daily_calories"]

    bad = client.put("/api/users/preferences", headers=auth_headers, json={"goal": "fly"})
    assert bad.status_code == 422


def test_intolerance_filters_recipes(client: TestClient, admin_headers, test_user, db_session):
    _recipe(client, admin_headers, "Paneer Curd Bowl", ["Paneer", "Curd"], diet="Vegetarian")
    _recipe(client, admin_headers, "Plain Rice Bowl", ["Rice"], diet="Vegetarian")
    profile = db_session.query(DietaryProfile).filter(DietaryProfile.user_id == test_user.id).first()
    profile.intolerances = ["Lactose intolerance"]
    db_session.commit()
    from app.models.recipe import Recipe
    names = {r.name for r in filter_recipes(db_session.query(Recipe).all(), profile)}
    assert "Plain Rice Bowl" in names
    assert "Paneer Curd Bowl" not in names


def test_change_password_flow(client: TestClient, auth_headers):
    wrong = client.post(
        "/api/users/change-password",
        headers=auth_headers,
        json={"current_password": "nope", "new_password": "NewPass123"},
    )
    assert wrong.status_code == 400

    weak = client.post(
        "/api/users/change-password",
        headers=auth_headers,
        json={"current_password": "UserPassword123!", "new_password": "abcdefgh"},
    )
    assert weak.status_code == 400

    ok = client.post(
        "/api/users/change-password",
        headers=auth_headers,
        json={"current_password": "UserPassword123!", "new_password": "NewPass123"},
    )
    assert ok.status_code == 200

    login = client.post("/api/auth/login", json={"email": "testuser@example.com", "password": "NewPass123"})
    assert login.status_code == 200
    old = client.post("/api/auth/login", json={"email": "testuser@example.com", "password": "UserPassword123!"})
    assert old.status_code == 401


def test_reminder_settings_round_trip(client: TestClient, auth_headers):
    defaults = client.get("/api/users/reminders", headers=auth_headers).json()["data"]
    assert defaults["enabled"] is False
    assert defaults["slots"]["Lunch"]["time"] == "13:30"

    saved = client.put(
        "/api/users/reminders",
        headers=auth_headers,
        json={"enabled": True, "lead_minutes": 30, "slots": {"Lunch": {"enabled": False, "time": "12:45"}}},
    ).json()["data"]
    assert saved["enabled"] is True
    assert saved["lead_minutes"] == 30
    assert saved["slots"]["Lunch"] == {"enabled": False, "time": "12:45"}
    assert saved["slots"]["Dinner"]["enabled"] is True

    bad = client.put("/api/users/reminders", headers=auth_headers, json={"enabled": True, "slots": {"Lunch": {"time": "25:00"}}})
    assert bad.status_code == 422


def test_skip_records_history_and_complete_clears_skip(client: TestClient, auth_headers, plan_recipes):
    plan = client.post("/api/meal-plans/generate", headers=auth_headers, json={"plan_date": "2026-12-10", "force_regenerate": True}).json()["data"]
    lunch = plan["meals"]["Lunch"]

    skipped = client.put(f"/api/meal-plans/{lunch['id']}/skip", headers=auth_headers, json={"skipped": True}).json()["data"]
    assert skipped["skipped"] is True
    history = client.get("/api/history", params={"action": "skipped"}, headers=auth_headers).json()["data"]
    assert any(h["recipe_id"] == lunch["recipe_id"] and h["action"] == "skipped" for h in history)

    done = client.put(f"/api/meal-plans/{lunch['id']}/complete", headers=auth_headers, json={"completed": True}).json()["data"]
    assert done["completed"] is True
    assert done["skipped"] is False
    assert client.get("/api/history", params={"action": "skipped"}, headers=auth_headers).json()["data"] == []


def test_recipe_views_are_logged_once_per_day_and_hidden_from_history(client: TestClient, auth_headers, admin_headers):
    recipe = _recipe(client, admin_headers, "Viewed Dal", ["Dal"])
    first = client.post("/api/history/viewed", headers=auth_headers, json={"recipe_id": recipe["id"]}).json()["data"]
    second = client.post("/api/history/viewed", headers=auth_headers, json={"recipe_id": recipe["id"]}).json()["data"]
    assert first["id"] == second["id"]
    assert client.get("/api/history", headers=auth_headers).json()["data"] == []
    viewed = client.get("/api/history", params={"action": "viewed"}, headers=auth_headers).json()["data"]
    assert len(viewed) == 1
    missing = client.post("/api/history/viewed", headers=auth_headers, json={"recipe_id": 999999})
    assert missing.status_code == 404


def test_variety_lowers_recently_eaten_recipes(client: TestClient, auth_headers, admin_headers, test_user, db_session):
    a = _recipe(client, admin_headers, "Variety Bowl A", ["Rice"], calories=650)
    b = _recipe(client, admin_headers, "Variety Bowl B", ["Rice"], calories=650)
    for _ in range(2):
        db_session.add(MealHistory(user_id=test_user.id, recipe_id=a["id"], meal_type="Lunch", action="cooked"))
    db_session.commit()
    recs = client.post("/api/recommendations", headers=auth_headers, json={"meal_type": "Lunch", "limit": 10, "use_pantry": False}).json()["data"]
    items = recs["recommendations"]
    scores = {item["recipe"]["id"]: item for item in items}
    assert scores[b["id"]]["score"] > scores[a["id"]]["score"]
    assert any("variety" in reason.lower() for reason in scores[a["id"]]["match_reasons"])


def test_user_insights(client: TestClient, auth_headers, admin_headers, test_user, db_session):
    recipe = _recipe(client, admin_headers, "Insight Curry", ["Rice"], calories=500)
    db_session.add(MealHistory(user_id=test_user.id, recipe_id=recipe["id"], meal_type="Lunch", action="cooked", rating=4))
    db_session.add(MealHistory(user_id=test_user.id, recipe_id=recipe["id"], meal_type="Dinner", action="skipped"))
    db_session.commit()
    data = client.get("/api/history/insights", headers=auth_headers).json()["data"]
    assert len(data["trend"]) == 14
    assert data["trend"][-1]["calories"] == 500
    assert data["actions"]["cooked"] == 1
    assert data["actions"]["skipped"] == 1
    assert data["top_recipes"][0]["name"] == "Insight Curry"
    assert data["averages"]["calories"] == 500
    assert data["targets"]["calories"] > 0


def test_admin_can_deactivate_and_promote_users(client: TestClient, admin_headers, auth_headers, test_user, test_admin):
    promoted = client.put(f"/api/admin/users/{test_user.id}", headers=admin_headers, json={"role": "admin"}).json()["data"]
    assert promoted["role"] == "admin"
    client.put(f"/api/admin/users/{test_user.id}", headers=admin_headers, json={"role": "user"})

    off = client.put(f"/api/admin/users/{test_user.id}", headers=admin_headers, json={"is_active": False})
    assert off.status_code == 200
    blocked = client.post("/api/auth/login", json={"email": "testuser@example.com", "password": "UserPassword123!"})
    assert blocked.status_code in (401, 403)

    self_demote = client.put(f"/api/admin/users/{test_admin.id}", headers=admin_headers, json={"is_active": False})
    assert self_demote.status_code == 400
    forbidden = client.put(f"/api/admin/users/{test_admin.id}", headers=auth_headers, json={"role": "user"})
    assert forbidden.status_code in (401, 403)


def test_admin_category_management(client: TestClient, admin_headers):
    client.post("/api/foods", headers=admin_headers, json={"name": "Kohlrabi", "category": "Exotic Veg"})
    categories = client.get("/api/admin/categories", headers=admin_headers).json()["data"]
    assert {"name": "Exotic Veg", "count": 1} in categories

    renamed = client.put("/api/admin/categories", headers=admin_headers, json={"name": "Exotic Veg", "new_name": "Vegetables"})
    assert renamed.status_code == 200
    names = {c["name"] for c in client.get("/api/admin/categories", headers=admin_headers).json()["data"]}
    assert "Exotic Veg" not in names

    missing = client.put("/api/admin/categories", headers=admin_headers, json={"name": "Nope", "new_name": "Other"})
    assert missing.status_code == 404


def test_admin_model_evaluation_report(client: TestClient, admin_headers, auth_headers):
    data = client.get("/api/admin/model-evaluation", headers=admin_headers).json()["data"]
    if data["available"]:
        assert 0 <= data["accuracy"] <= 1
        assert data["per_class"] and {"precision", "recall", "f1", "support"} <= set(data["per_class"][0])
        if data["confusion_matrix"]:
            assert len(data["confusion_matrix"]) == len(data["class_names"])
    assert client.get("/api/admin/model-evaluation", headers=auth_headers).status_code == 403


def _image_bytes():
    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 40, 40)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_user_can_delete_scans(client: TestClient, auth_headers):
    for _ in range(2):
        resp = client.post(
            "/api/recognition/predict",
            headers=auth_headers,
            files={"file": ("tomato.png", _image_bytes(), "image/png")},
        )
        assert resp.status_code == 200
    history = client.get("/api/recognition/history", headers=auth_headers).json()["data"]
    assert len(history) == 2

    one = client.delete(f"/api/recognition/{history[0]['id']}", headers=auth_headers)
    assert one.status_code == 200
    assert len(client.get("/api/recognition/history", headers=auth_headers).json()["data"]) == 1

    cleared = client.delete("/api/recognition/history", headers=auth_headers).json()["data"]
    assert cleared["removed"] == 1
    assert client.get("/api/recognition/history", headers=auth_headers).json()["data"] == []
    assert client.delete("/api/recognition/123456", headers=auth_headers).status_code == 404
