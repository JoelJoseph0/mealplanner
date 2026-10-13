import pytest
from fastapi.testclient import TestClient


def test_get_user_profile(client: TestClient, auth_headers):
    """Test retrieving profile of current user."""
    response = client.get("/api/users/profile", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "testuser@example.com"


def test_update_user_profile(client: TestClient, auth_headers):
    """Test updating user profile metrics (weight, height, activity)."""
    response = client.put(
        "/api/users/profile",
        headers=auth_headers,
        json={
            "full_name": "Updated Test User",
            "age": 26,
            "gender": "male",
            "height": 178.0,
            "weight": 72.0,
            "activity_level": "active"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["full_name"] == "Updated Test User"
    assert data["data"]["dietary_profile"]["weight"] == 72.0


def test_get_and_update_preferences(client: TestClient, auth_headers):
    """Test retrieving and updating dietary preferences and allergy constraints."""
    get_resp = client.get("/api/users/preferences", headers=auth_headers)
    assert get_resp.status_code == 200

    put_resp = client.put(
        "/api/users/preferences",
        headers=auth_headers,
        json={
            "diet_type": "Vegan",
            "allergies": ["Peanuts", "Gluten", "Dairy"],
            "preferred_foods": ["Salad", "Oatmeal"],
            "avoided_foods": ["White Sugar", "Alcohol"],
            "daily_calories": 2100.0,
            "protein_target": 80.0
        }
    )
    assert put_resp.status_code == 200
    updated_data = put_resp.json()["data"]
    assert updated_data["diet_type"] == "Vegan"
    assert "Gluten" in updated_data["allergies"]
    assert updated_data["daily_calories"] == 2100.0
