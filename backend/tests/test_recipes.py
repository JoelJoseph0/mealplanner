import pytest
from fastapi.testclient import TestClient


def test_recipe_filtering_and_crud(client: TestClient, auth_headers, admin_headers):
    """Test recipe filtering across meal_type, diet, calories, and search."""
    # 1. Admin creates a vegan breakfast recipe
    r1 = client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Berry Banana Oatmeal Bowl",
            "description": "Healthy fiber-rich breakfast",
            "ingredients": ["Oats", "Banana", "Berries"],
            "instructions": "Boil oats and top with sliced fruit.",
            "meal_type": "Breakfast",
            "diet_type": "Vegan",
            "allergy_information": [],
            "calories": 280.0,
            "protein": 7.0,
            "carbohydrates": 52.0,
            "fat": 3.0,
            "fiber": 6.0
        }
    )
    assert r1.status_code == 201

    # 2. Admin creates a non-veg dinner recipe
    r2 = client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Grilled Salmon with Asparagus",
            "description": "Omega-3 rich dinner",
            "ingredients": ["Salmon", "Asparagus", "Olive oil"],
            "instructions": "Pan sear salmon and grill asparagus.",
            "meal_type": "Dinner",
            "diet_type": "Non-Vegetarian",
            "allergy_information": ["Fish"],
            "calories": 510.0,
            "protein": 42.0,
            "carbohydrates": 8.0,
            "fat": 22.0,
            "fiber": 3.0
        }
    )
    assert r2.status_code == 201
    recipe_id = r2.json()["data"]["id"]

    # 3. Filter by diet_type=Vegan
    vegan_resp = client.get("/api/recipes?diet_type=Vegan", headers=auth_headers)
    assert vegan_resp.status_code == 200
    vegan_data = vegan_resp.json()["data"]
    assert any(r["name"] == "Berry Banana Oatmeal Bowl" for r in vegan_data)
    assert not any(r["name"] == "Grilled Salmon with Asparagus" for r in vegan_data)

    # 4. Filter by max_calories=300
    cal_resp = client.get("/api/recipes?max_calories=300", headers=auth_headers)
    assert cal_resp.status_code == 200
    assert all(r["calories"] <= 300 for r in cal_resp.json()["data"])

    # 5. Non-admin cannot delete
    non_admin_del = client.delete(f"/api/recipes/{recipe_id}", headers=auth_headers)
    assert non_admin_del.status_code == 403

    # 6. Admin can delete
    admin_del = client.delete(f"/api/recipes/{recipe_id}", headers=admin_headers)
    assert admin_del.status_code == 200
