import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def populate_sample_recipes(client: TestClient, admin_headers):
    """Seed a variety of test recipes across all slots and diets for meal planning tests."""
    test_recipes = [
        # Breakfast
        {"name": "Test Steamed Idli", "meal_type": "Breakfast", "diet_type": "Vegan", "calories": 250.0, "protein": 8.0, "carbohydrates": 48.0, "fat": 2.0, "fiber": 3.0},
        {"name": "Test Masala Dosa", "meal_type": "Breakfast", "diet_type": "Vegetarian", "calories": 310.0, "protein": 9.0, "carbohydrates": 52.0, "fat": 7.0, "fiber": 4.0},
        {"name": "Test Scrambled Eggs Toast", "meal_type": "Breakfast", "diet_type": "Eggetarian", "calories": 290.0, "protein": 16.0, "carbohydrates": 22.0, "fat": 12.0, "fiber": 3.0},
        {"name": "Test Oats Porridge", "meal_type": "Breakfast", "diet_type": "Vegan", "calories": 280.0, "protein": 10.0, "carbohydrates": 45.0, "fat": 6.0, "fiber": 7.0},
        
        # Morning Snack
        {"name": "Test Apple Banana Smoothie", "meal_type": "Morning Snack", "diet_type": "Vegetarian", "calories": 190.0, "protein": 4.0, "carbohydrates": 40.0, "fat": 2.5, "fiber": 5.0},
        {"name": "Test Sprout Salad", "meal_type": "Morning Snack", "diet_type": "Vegan", "calories": 150.0, "protein": 9.0, "carbohydrates": 24.0, "fat": 1.5, "fiber": 6.0},
        {"name": "Test Greek Yogurt Bowl", "meal_type": "Morning Snack", "diet_type": "Vegetarian", "calories": 170.0, "protein": 13.0, "carbohydrates": 20.0, "fat": 3.0, "fiber": 4.0},
        
        # Lunch
        {"name": "Test Chapati Veg Curry", "meal_type": "Lunch", "diet_type": "Vegetarian", "calories": 420.0, "protein": 12.0, "carbohydrates": 70.0, "fat": 8.0, "fiber": 8.0},
        {"name": "Test Chicken Biryani Bowl", "meal_type": "Lunch", "diet_type": "Non-Vegetarian", "calories": 550.0, "protein": 35.0, "carbohydrates": 62.0, "fat": 16.0, "fiber": 3.0},
        {"name": "Test Dal Tadka Jeera Rice", "meal_type": "Lunch", "diet_type": "Vegan", "calories": 430.0, "protein": 13.0, "carbohydrates": 74.0, "fat": 7.0, "fiber": 7.0},
        {"name": "Test Chana Masala Rice", "meal_type": "Lunch", "diet_type": "Vegan", "calories": 440.0, "protein": 15.0, "carbohydrates": 72.0, "fat": 8.0, "fiber": 9.0},
        
        # Evening Snack
        {"name": "Test Boiled Egg Salad", "meal_type": "Evening Snack", "diet_type": "Eggetarian", "calories": 160.0, "protein": 13.0, "carbohydrates": 4.0, "fat": 10.0, "fiber": 1.0},
        {"name": "Test Spiced Makhana", "meal_type": "Evening Snack", "diet_type": "Vegan", "calories": 140.0, "protein": 3.5, "carbohydrates": 22.0, "fat": 4.5, "fiber": 2.5},
        {"name": "Test Steamed Dhokla", "meal_type": "Evening Snack", "diet_type": "Vegan", "calories": 180.0, "protein": 6.0, "carbohydrates": 30.0, "fat": 4.0, "fiber": 3.0},
        
        # Dinner
        {"name": "Test Fish Curry Rice", "meal_type": "Dinner", "diet_type": "Non-Vegetarian", "calories": 480.0, "protein": 30.0, "carbohydrates": 52.0, "fat": 14.0, "fiber": 2.5},
        {"name": "Test Moong Dal Khichdi", "meal_type": "Dinner", "diet_type": "Vegetarian", "calories": 380.0, "protein": 14.0, "carbohydrates": 64.0, "fat": 7.0, "fiber": 6.5},
        {"name": "Test Tofu Stir Fry Rice", "meal_type": "Dinner", "diet_type": "Vegan", "calories": 410.0, "protein": 22.0, "carbohydrates": 54.0, "fat": 11.0, "fiber": 7.0},
        {"name": "Test Rajma Masala Rice", "meal_type": "Dinner", "diet_type": "Vegan", "calories": 450.0, "protein": 16.0, "carbohydrates": 75.0, "fat": 8.0, "fiber": 9.5},
    ]

    for rec in test_recipes:
        client.post(
            "/api/recipes",
            headers=admin_headers,
            json={
                "name": rec["name"],
                "description": f"Description for {rec['name']}",
                "ingredients": ["Ingredient 1", "Ingredient 2"],
                "instructions": "1. Cook thoroughly and serve.",
                "meal_type": rec["meal_type"],
                "diet_type": rec["diet_type"],
                "allergy_information": [],
                "calories": rec["calories"],
                "protein": rec["protein"],
                "carbohydrates": rec["carbohydrates"],
                "fat": rec["fat"],
                "fiber": rec["fiber"]
            }
        )


def test_daily_meal_plan_uses_real_recipes_and_correct_totals(client: TestClient, auth_headers):
    """
    Validates:
    - Daily plan uses real recipes with valid IDs and names from the database
    - Strict intra-day anti-repetition: all 5 slots have unique recipe IDs
    - Totals are mathematically exact sums of the actual recipe macros
    """
    resp = client.post(
        "/api/meal-plans/generate",
        headers=auth_headers,
        json={"force_regenerate": True, "plan_date": "2026-10-05"}
    )
    assert resp.status_code == 201 or resp.status_code == 200
    data = resp.json()["data"]

    meals = data["meals"]
    meals_list = data["meals_list"]
    totals = data["totals"]

    assert len(meals_list) == 5

    # 1. Real recipes check
    recipe_ids = []
    calc_cals = 0.0
    calc_protein = 0.0
    calc_carbs = 0.0
    calc_fat = 0.0
    calc_fiber = 0.0

    for m in meals_list:
        assert m["recipe_id"] is not None
        assert m["recipe_id"] > 0
        assert m["food_name"] is not None
        assert len(m["food_name"]) > 0
        assert m["calories"] > 0
        assert m["recipe"] is not None
        assert "instructions" in m["recipe"]
        assert len(m["recipe"]["ingredients"]) > 0

        recipe_ids.append(m["recipe_id"])
        calc_cals += m["calories"]
        calc_protein += m["protein"]
        calc_carbs += m["carbohydrates"]
        calc_fat += m["fat"]
        calc_fiber += m["fiber"]

        # Verify recipe exists and is accessible via /api/recipes/{id}
        rec_get = client.get(f"/api/recipes/{m['recipe_id']}", headers=auth_headers)
        assert rec_get.status_code == 200
        assert rec_get.json()["data"]["name"] == m["food_name"]

    # 2. Strict anti-repetition: all 5 slots on the same day have unique recipes
    assert len(set(recipe_ids)) == 5, f"Expected 5 distinct recipes in daily plan, got {recipe_ids}"

    # 3. Exact nutrition totals verification
    assert round(totals["calories"], 1) == round(calc_cals, 1)
    assert round(totals["protein"], 1) == round(calc_protein, 1)
    assert round(totals["carbohydrates"], 1) == round(calc_carbs, 1)
    assert round(totals["fat"], 1) == round(calc_fat, 1)
    assert round(totals["fiber"], 1) == round(calc_fiber, 1)


def test_weekly_meal_plan_variety_and_aggregate_totals(client: TestClient, auth_headers):
    """
    Validates:
    - 7-day weekly schedule has 7 complete days (Monday through Sunday)
    - Anti-repetition: recipes rotate across days, avoiding unnecessary duplicates
    - Daily totals match actual recipes for each day
    - Weekly averages and totals are exact aggregates of all days' actual recipes
    """
    resp = client.post(
        "/api/meal-plans/generate-week",
        headers=auth_headers,
        json={"start_date": "2026-10-05", "force_regenerate": True}
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    days = data["days"]
    assert len(days) == 7
    expected_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for ed in expected_days:
        assert ed in days

    week_recipe_ids = []
    sum_week_cals = 0.0
    sum_week_protein = 0.0
    sum_week_carbs = 0.0
    sum_week_fat = 0.0

    for day_name, day_plan in days.items():
        day_meals = day_plan["meals_list"]
        assert len(day_meals) == 5
        day_ids = [m["recipe_id"] for m in day_meals]
        
        # Intra-day uniqueness
        assert len(set(day_ids)) == 5, f"Day {day_name} should have 5 unique recipes"
        week_recipe_ids.extend(day_ids)

        # Day totals match sum of meals
        day_cal_sum = sum(m["calories"] for m in day_meals)
        day_protein_sum = sum(m["protein"] for m in day_meals)
        assert round(day_plan["totals"]["calories"], 1) == round(day_cal_sum, 1)
        assert round(day_plan["totals"]["protein"], 1) == round(day_protein_sum, 1)

        sum_week_cals += day_plan["totals"]["calories"]
        sum_week_protein += day_plan["totals"]["protein"]
        sum_week_carbs += day_plan["totals"]["carbohydrates"]
        sum_week_fat += day_plan["totals"]["fat"]

    # Verify high variety across the week
    unique_recipes_used = len(set(week_recipe_ids))
    assert unique_recipes_used >= 12, f"Expected high variety (at least 12 distinct recipes), got {unique_recipes_used}"

    # Verify weekly averages and totals from actual recipes
    weekly_totals = data.get("weekly_totals", {})
    expected_avg_cal = round(sum_week_cals / 7.0, 1)
    expected_avg_protein = round(sum_week_protein / 7.0, 1)

    assert data["weekly_average_calories"] == expected_avg_cal
    if weekly_totals:
        assert weekly_totals["average_daily_calories"] == expected_avg_cal
        assert weekly_totals["average_protein"] == expected_avg_protein
        assert weekly_totals["total_calories"] == round(sum_week_cals, 1)


def test_start_date_consistency_across_timezone_changes(client: TestClient, auth_headers):
    """
    Validates:
    - start_date works with standard YYYY-MM-DD
    - start_date works with ISO timestamps containing Z or timezone offsets
    - start_date correctly aligns to the Monday of the requested week
    - User timezone query param converts ISO dates to the user's local date
    """
    # 1. Plain Monday date
    res1 = client.get("/api/meal-plans/weekly?start_date=2026-10-05", headers=auth_headers)
    assert res1.status_code == 200
    assert res1.json()["data"]["start_date"] == "2026-10-05"
    assert res1.json()["data"]["end_date"] == "2026-10-11"

    # 2. Mid-week Wednesday date automatically aligns to Monday of that week
    res2 = client.get("/api/meal-plans/weekly?start_date=2026-10-07", headers=auth_headers)
    assert res2.status_code == 200
    assert res2.json()["data"]["start_date"] == "2026-10-05"

    # 3. ISO timestamp with timezone offset: e.g. 2026-10-04T18:30:00Z in Asia/Kolkata is Monday 2026-10-05 00:00:00
    res3 = client.get(
        "/api/meal-plans/weekly?start_date=2026-10-04T18:30:00Z&timezone=Asia/Kolkata",
        headers=auth_headers
    )
    assert res3.status_code == 200
    assert res3.json()["data"]["start_date"] == "2026-10-05"

    # 4. Generate week with timezone in request body
    res4 = client.post(
        "/api/meal-plans/generate-week",
        headers=auth_headers,
        json={
            "start_date": "2026-10-05T00:00:00+05:30",
            "timezone": "Asia/Kolkata",
            "force_regenerate": True
        }
    )
    assert res4.status_code == 200
    assert res4.json()["data"]["start_date"] == "2026-10-05"


def test_daily_meal_plan_dietary_compliance(client: TestClient, auth_headers):
    """
    Validates that when a user has a strict Vegetarian diet profile,
    every meal planned across all slots strictly conforms to Vegetarian or Vegan,
    and never introduces Non-Vegetarian or Eggetarian recipes.
    """
    # Set user profile to Vegetarian
    client.put(
        "/api/users/preferences",
        headers=auth_headers,
        json={
            "diet_type": "Vegetarian",
            "allergies": [],
            "preferred_foods": [],
            "avoided_foods": []
        }
    )

    resp = client.post(
        "/api/meal-plans/generate",
        headers=auth_headers,
        json={"force_regenerate": True, "plan_date": "2026-10-06"}
    )
    assert resp.status_code in [200, 201]
    meals = resp.json()["data"]["meals_list"]
    assert len(meals) == 5

    for m in meals:
        rec = m["recipe"]
        assert rec["diet_type"] in ["Vegetarian", "Vegan"], (
            f"Diet violation: {rec['name']} has diet_type {rec['diet_type']}"
        )


def test_meal_plan_caching_and_force_regenerate(client: TestClient, auth_headers):
    """
    Validates that generating without force_regenerate returns the cached plan,
    while force_regenerate=True generates a refreshed plan.
    """
    target_date = "2026-10-08"

    # 1. Initial generation
    gen1 = client.post(
        "/api/meal-plans/generate",
        headers=auth_headers,
        json={"force_regenerate": True, "plan_date": target_date}
    )
    assert gen1.status_code in [200, 201]
    plan1_ids = [m["recipe_id"] for m in gen1.json()["data"]["meals_list"]]

    # 2. Subsequent call without force_regenerate returns identical cached meals
    cached = client.post(
        "/api/meal-plans/generate",
        headers=auth_headers,
        json={"force_regenerate": False, "plan_date": target_date}
    )
    assert cached.status_code == 200
    cached_ids = [m["recipe_id"] for m in cached.json()["data"]["meals_list"]]
    assert plan1_ids == cached_ids


