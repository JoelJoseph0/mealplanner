from fastapi.testclient import TestClient
from app.models.food import Food
from app.utils.helpers import calculate_daily_targets


def test_activity_level_labels_change_daily_targets():
    base = dict(weight=70.0, height=175.0, age=25, gender="male")
    sedentary = calculate_daily_targets(activity_level="Sedentary", **base)["daily_calories"]
    moderate_label = calculate_daily_targets(activity_level="Moderately Active", **base)["daily_calories"]
    moderate_key = calculate_daily_targets(activity_level="moderate", **base)["daily_calories"]
    very_active_label = calculate_daily_targets(activity_level="Very Active", **base)["daily_calories"]
    extra_active_label = calculate_daily_targets(activity_level="Extra Active", **base)["daily_calories"]

    assert sedentary < moderate_label < very_active_label < extra_active_label
    assert moderate_label == moderate_key


def test_profile_update_with_ui_activity_label_recalculates_targets(client: TestClient, auth_headers):
    low = client.put(
        "/api/users/profile",
        headers=auth_headers,
        json={"age": 30, "gender": "Female", "height": 165, "weight": 60, "activity_level": "Sedentary"},
    )
    assert low.status_code == 200
    low_calories = client.get("/api/users/preferences", headers=auth_headers).json()["data"]["daily_calories"]

    high = client.put(
        "/api/users/profile",
        headers=auth_headers,
        json={"activity_level": "Extra Active"},
    )
    assert high.status_code == 200
    high_calories = client.get("/api/users/preferences", headers=auth_headers).json()["data"]["daily_calories"]

    assert high_calories > low_calories


def test_admin_reports_are_computed_from_real_data(client: TestClient, admin_headers, auth_headers, db_session):
    db_session.add(Food(name="Report Tomato", category="Vegetables", aliases=[], substitutes=[], is_staple=False, is_active=True))
    db_session.commit()
    client.post("/api/pantry", headers=auth_headers, json={"names": ["Report Tomato"]})

    resp = client.get("/api/admin/reports", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]

    vision = data["computer_vision_performance"]
    assert {"total_inferences", "confidence_distribution", "most_recognized_ingredients", "model"} <= set(vision)
    assert len(vision["confidence_distribution"]) == 4
    assert data["pantry"]["total_items"] >= 1
    assert any(item["name"] == "Report Tomato" for item in data["pantry"]["top_ingredients"])
    assert len(data["monthly_activity"]) == 6
    assert sum(month["pantry_additions"] for month in data["monthly_activity"]) >= 1


def test_admin_dashboard_lists_recent_activity_and_counts_active_ingredients(
    client: TestClient, admin_headers, auth_headers, db_session
):
    db_session.add(Food(name="Active Spinach", category="Vegetables", aliases=[], substitutes=[], is_staple=False, is_active=True))
    db_session.add(Food(name="Retired Dish", category="Others", aliases=[], substitutes=[], is_staple=False, is_active=False))
    db_session.commit()
    client.post("/api/pantry", headers=auth_headers, json={"names": ["Active Spinach"]})

    resp = client.get("/api/admin/dashboard", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]

    active_count = db_session.query(Food).filter(Food.is_active == True).count()
    assert data["statistics"]["total_foods"] == active_count
    assert any(event["action"] == "Pantry Updated" and "Active Spinach" in event["detail"] for event in data["recent_activity"])
    assert "trained" in data["model"]
