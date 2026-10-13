import pytest
from fastapi.testclient import TestClient


def test_recommendations_strict_filters(client: TestClient, auth_headers, admin_headers):
    """
    Test recommendation rule engine:
    1. Allergy violations are STRICTLY filtered out, not just downvoted.
    2. Diet incompatibility (e.g. Non-Veg for Vegetarian user) is filtered out.
    """
    # Set user preferences: Vegetarian with Peanut allergy
    client.put(
        "/api/users/preferences",
        headers=auth_headers,
        json={
            "diet_type": "Vegetarian",
            "allergies": ["Peanuts"],
            "preferred_foods": ["Paneer", "Spinach"],
            "avoided_foods": []
        }
    )

    # Admin creates 3 test recipes:
    # A: Vegetarian, Safe (Spinach Paneer)
    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Palak Paneer Special",
            "description": "Cottage cheese cubes in spinach gravy",
            "ingredients": ["Paneer", "Spinach", "Spices"],
            "instructions": "Simmer spinach and add paneer.",
            "meal_type": "Lunch",
            "diet_type": "Vegetarian",
            "allergy_information": ["Dairy"],
            "calories": 420.0,
            "protein": 18.0,
            "carbohydrates": 12.0,
            "fat": 20.0,
            "fiber": 5.0
        }
    )

    # B: Vegetarian, but contains Peanut (Allergy conflict -> MUST be excluded)
    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Peanut Masala Chaat",
            "description": "Roasted spiced peanuts",
            "ingredients": ["Peanuts", "Onions", "Chaat masala"],
            "instructions": "Mix peanuts with spices.",
            "meal_type": "Snack",
            "diet_type": "Vegetarian",
            "allergy_information": ["Peanuts"],
            "calories": 300.0,
            "protein": 14.0,
            "carbohydrates": 15.0,
            "fat": 22.0,
            "fiber": 4.0
        }
    )

    # C: Non-Vegetarian (Diet conflict -> MUST be excluded for Vegetarian)
    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Butter Chicken Delight",
            "description": "Creamy chicken curry",
            "ingredients": ["Chicken", "Butter", "Cream", "Tomatoes"],
            "instructions": "Cook chicken in makhani gravy.",
            "meal_type": "Dinner",
            "diet_type": "Non-Vegetarian",
            "allergy_information": ["Dairy"],
            "calories": 550.0,
            "protein": 36.0,
            "carbohydrates": 14.0,
            "fat": 28.0,
            "fiber": 2.0
        }
    )

    # Request recommendations
    rec_resp = client.post(
        "/api/recommendations",
        headers=auth_headers,
        json={"meal_type": "Lunch"}
    )
    assert rec_resp.status_code == 200
    recs = rec_resp.json()["data"]["recommendations"]

    # Verify Palak Paneer is included with positive preference score
    rec_names = [r["recipe"]["name"] for r in recs]
    assert "Palak Paneer Special" in rec_names

    # Verify Peanut recipe was STRICTLY excluded
    assert not any("Peanut" in name for name in rec_names)

    # Verify Non-Veg was STRICTLY excluded
    assert not any("Butter Chicken" in name for name in rec_names)


def test_recommendations_diet_compatibility_hierarchy(client: TestClient, auth_headers, admin_headers):
    """
    Test diet compatibility enforcement:
    - Vegan user must NEVER be recommended Vegetarian (with Dairy/Honey), Eggetarian, or Non-Vegetarian dishes.
    """
    # Create distinct diet recipes
    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Hierarchy Tofu Stir Fry",
            "description": "Pure vegan tofu dish",
            "ingredients": ["Tofu", "Broccoli", "Soy Sauce"],
            "instructions": "Stir fry tofu and vegetables.",
            "meal_type": "Dinner",
            "diet_type": "Vegan",
            "allergy_information": ["Soy"],
            "calories": 350.0,
            "protein": 20.0,
            "carbohydrates": 25.0,
            "fat": 12.0,
            "fiber": 6.0
        }
    )

    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Hierarchy Paneer Butter Masala",
            "description": "Vegetarian curry with dairy butter and cream",
            "ingredients": ["Paneer", "Butter", "Cream", "Tomato"],
            "instructions": "Cook paneer in rich tomato sauce.",
            "meal_type": "Dinner",
            "diet_type": "Vegetarian",
            "allergy_information": ["Dairy"],
            "calories": 480.0,
            "protein": 16.0,
            "carbohydrates": 20.0,
            "fat": 30.0,
            "fiber": 4.0
        }
    )

    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Hierarchy Mutton Rogan Josh",
            "description": "Kashmiri slow-cooked mutton curry",
            "ingredients": ["Mutton", "Yogurt", "Kashmiri Chili"],
            "instructions": "Slow cook mutton with aromatic spices.",
            "meal_type": "Dinner",
            "diet_type": "Non-Vegetarian",
            "allergy_information": ["Dairy"],
            "calories": 600.0,
            "protein": 42.0,
            "carbohydrates": 10.0,
            "fat": 38.0,
            "fiber": 2.0
        }
    )

    # Set user preference to Vegan
    client.put(
        "/api/users/preferences",
        headers=auth_headers,
        json={
            "diet_type": "Vegan",
            "allergies": [],
            "preferred_foods": [],
            "avoided_foods": []
        }
    )

    rec_resp = client.post(
        "/api/recommendations",
        headers=auth_headers,
        json={"meal_type": "Dinner", "limit": 20}
    )
    assert rec_resp.status_code == 200
    recs = rec_resp.json()["data"]["recommendations"]

    for item in recs:
        recipe_diet = item["recipe"]["diet_type"]
        assert recipe_diet.lower() == "vegan", f"Vegan user received non-vegan recipe: {item['recipe']['name']} ({recipe_diet})"


def test_recommendations_preferred_foods_boost(client: TestClient, auth_headers, admin_headers):
    """
    Test that recipes containing preferred foods receive a score bonus and match reasoning.
    """
    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Crispy Avocado Sourdough",
            "description": "Fresh avocado mash on toast",
            "ingredients": ["Avocado", "Sourdough Bread", "Lemon Juice"],
            "instructions": "Mash avocado and spread on toasted bread.",
            "meal_type": "Breakfast",
            "diet_type": "Vegan",
            "allergy_information": ["Gluten"],
            "calories": 320.0,
            "protein": 8.0,
            "carbohydrates": 35.0,
            "fat": 16.0,
            "fiber": 9.0
        }
    )

    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Plain Lemon Sourdough",
            "description": "Toast with lemon",
            "ingredients": ["Sourdough Bread", "Lemon Juice"],
            "instructions": "Toast bread and drizzle lemon.",
            "meal_type": "Breakfast",
            "diet_type": "Vegan",
            "allergy_information": ["Gluten"],
            "calories": 320.0,
            "protein": 8.0,
            "carbohydrates": 35.0,
            "fat": 16.0,
            "fiber": 9.0
        }
    )

    # Update preferences with "Avocado"
    client.put(
        "/api/users/preferences",
        headers=auth_headers,
        json={
            "diet_type": "Vegan",
            "allergies": [],
            "preferred_foods": ["Avocado"],
            "avoided_foods": []
        }
    )

    rec_resp = client.post(
        "/api/recommendations",
        headers=auth_headers,
        json={"meal_type": "Breakfast", "limit": 10}
    )
    assert rec_resp.status_code == 200
    recs = rec_resp.json()["data"]["recommendations"]

    avocado_rec = next((r for r in recs if r["recipe"]["name"] == "Crispy Avocado Sourdough"), None)
    plain_rec = next((r for r in recs if r["recipe"]["name"] == "Plain Lemon Sourdough"), None)
    assert avocado_rec is not None
    assert plain_rec is not None
    assert any("avocado" in reason.lower() for reason in avocado_rec["match_reasons"])
    assert avocado_rec["score"] > plain_rec["score"]
    assert 0 <= avocado_rec["score"] <= 100


def test_recommendations_avoided_foods_exclusion(client: TestClient, auth_headers, admin_headers):
    """
    Test that recipes containing avoided foods are strictly filtered out.
    """
    client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": "Mushroom Garlic Risotto",
            "description": "Arborio rice cooked with wild button mushrooms",
            "ingredients": ["Mushroom", "Arborio Rice", "Garlic", "Olive Oil"],
            "instructions": "Sauté mushrooms and cook arborio rice.",
            "meal_type": "Dinner",
            "diet_type": "Vegan",
            "allergy_information": [],
            "calories": 420.0,
            "protein": 10.0,
            "carbohydrates": 65.0,
            "fat": 9.0,
            "fiber": 4.0
        }
    )

    # User dislikes Mushrooms
    client.put(
        "/api/users/preferences",
        headers=auth_headers,
        json={
            "diet_type": "Vegan",
            "allergies": [],
            "preferred_foods": [],
            "avoided_foods": ["Mushroom"]
        }
    )

    rec_resp = client.post(
        "/api/recommendations",
        headers=auth_headers,
        json={"meal_type": "Dinner", "limit": 20}
    )
    assert rec_resp.status_code == 200
    recs = rec_resp.json()["data"]["recommendations"]

    rec_names = [r["recipe"]["name"] for r in recs]
    assert "Mushroom Garlic Risotto" not in rec_names
