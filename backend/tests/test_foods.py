import pytest
from fastapi.testclient import TestClient


def test_list_and_get_foods(client: TestClient, auth_headers, admin_headers):
    """Test public/authenticated food browsing and retrieval."""
    # First create a food item via admin
    create_resp = client.post(
        "/api/foods",
        headers=admin_headers,
        json={
            "name": "Masala Dosa",
            "category": "Breakfast",
            "description": "Crisp crepe filled with spiced potato masala."
        }
    )
    assert create_resp.status_code == 201
    food_id = create_resp.json()["data"]["id"]

    # Regular user can list foods
    list_resp = client.get("/api/foods", headers=auth_headers)
    assert list_resp.status_code == 200
    assert any(f["name"] == "Masala Dosa" for f in list_resp.json()["data"])

    # Regular user can get by id
    get_resp = client.get(f"/api/foods/{food_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["name"] == "Masala Dosa"


def test_food_admin_permissions(client: TestClient, auth_headers, admin_headers):
    """Test that regular users cannot mutate food, while admin can."""
    payload = {
        "name": "Upma",
        "category": "Breakfast",
        "description": "Semolina porridge with mustard seeds."
    }

    # Regular user attempt -> 403
    forbidden_resp = client.post("/api/foods", headers=auth_headers, json=payload)
    assert forbidden_resp.status_code == 403

    # Admin attempt -> 201
    admin_resp = client.post("/api/foods", headers=admin_headers, json=payload)
    assert admin_resp.status_code == 201
    food_id = admin_resp.json()["data"]["id"]

    # Admin update -> 200
    update_resp = client.put(
        f"/api/foods/{food_id}",
        headers=admin_headers,
        json={"description": "Updated delicious semolina dish."}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["description"] == "Updated delicious semolina dish."

    # Admin delete -> 200
    delete_resp = client.delete(f"/api/foods/{food_id}", headers=admin_headers)
    assert delete_resp.status_code == 200
