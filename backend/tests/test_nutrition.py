import pytest
from fastapi.testclient import TestClient


def test_nutrition_crud(client: TestClient, auth_headers, admin_headers):
    """Test full lifecycle of nutrition records and authorization."""
    # 1. Create a food item first
    food_resp = client.post(
        "/api/foods",
        headers=admin_headers,
        json={"name": "Oatmeal", "category": "Breakfast"}
    )
    food_id = food_resp.json()["data"]["id"]

    # 2. Regular user cannot add nutrition
    non_admin_resp = client.post(
        "/api/nutrition",
        headers=auth_headers,
        json={"food_id": food_id, "calories": 150.0, "protein": 5.0}
    )
    assert non_admin_resp.status_code == 403

    # 3. Admin creates nutrition
    admin_create = client.post(
        "/api/nutrition",
        headers=admin_headers,
        json={
            "food_id": food_id,
            "serving_size": "1 cup (150g)",
            "calories": 150.0,
            "protein": 5.0,
            "carbohydrates": 27.0,
            "fat": 2.5,
            "fiber": 4.0,
            "sugar": 1.0
        }
    )
    assert admin_create.status_code == 201
    nutrition_id = admin_create.json()["data"]["id"]

    # 4. User can read nutrition
    read_resp = client.get(f"/api/nutrition/{food_id}", headers=auth_headers)
    assert read_resp.status_code == 200
    assert read_resp.json()["data"]["calories"] == 150.0

    # 5. Admin updates nutrition
    update_resp = client.put(
        f"/api/nutrition/{nutrition_id}",
        headers=admin_headers,
        json={"calories": 155.0, "fiber": 4.5}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["calories"] == 155.0

    # 6. Admin deletes nutrition
    delete_resp = client.delete(f"/api/nutrition/{nutrition_id}", headers=admin_headers)
    assert delete_resp.status_code == 200
