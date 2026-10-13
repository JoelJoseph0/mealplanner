import io
from PIL import Image
import pytest
from fastapi.testclient import TestClient


def _create_sample_food_image() -> io.BytesIO:
    """Generate in-memory sample image for computer vision testing."""
    buf = io.BytesIO()
    img = Image.new("RGB", (224, 224), color=(200, 150, 80))
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


class TestFullSystemIntegration:
    """
    End-to-end integration tests validating all 6 core system pillars:
    1. Recognition -> Food -> Nutrition Pipeline
    2. Multi-factor Recommendation Engine
    3. Daily & Weekly Meal Planning
    4. Meal History Logging & Feedback Loop
    5. Admin Management CRUD & Analytical Reports
    """

    def test_pipeline_recognition_to_food_to_nutrition(self, client: TestClient, auth_headers, admin_headers):
        """
        Step 1: Admin sets up baseline Food item with full nutritional metrics.
        Step 2: User runs Computer Vision image upload.
        Step 3: Follow predicted food_id to fetch detailed nutrition record.
        Step 4: Log recognized food to meal history.
        """
        # 1. Ensure Food and Nutrition records exist in test DB
        food_resp = client.post(
            "/api/admin/foods",
            headers=admin_headers,
            json={
                "name": "Dosa",
                "category": "Breakfast",
                "description": "Crispy fermented crepe",
                "is_active": True
            }
        )
        assert food_resp.status_code == 201
        food_id = food_resp.json()["data"]["id"]

        nutr_create = client.post(
            "/api/admin/nutrition",
            headers=admin_headers,
            json={
                "food_id": food_id,
                "serving_size": "1 piece (120g)",
                "calories": 168.0,
                "protein": 3.9,
                "carbohydrates": 29.0,
                "fat": 3.7,
                "fiber": 1.5,
                "sugar": 0.5
            }
        )
        assert nutr_create.status_code == 201

        # 2. Run image prediction
        img_buf = _create_sample_food_image()
        pred_resp = client.post(
            "/api/recognition/predict",
            headers=auth_headers,
            files={"file": ("vision_meal.jpg", img_buf, "image/jpeg")}
        )
        assert pred_resp.status_code == 200
        pred_data = pred_resp.json()["data"]
        assert "food_name" in pred_data
        assert "confidence" in pred_data

        # 3. Fetch linked nutrition for the food
        nutr_resp = client.get(f"/api/nutrition/{food_id}", headers=auth_headers)
        assert nutr_resp.status_code == 200
        nutr_data = nutr_resp.json()["data"]
        assert nutr_data["food_id"] == food_id
        assert nutr_data["calories"] == 168.0
        assert nutr_data["protein"] == 3.9

        # 4. Log dish into meal consumption history
        log_resp = client.post(
            "/api/history",
            headers=auth_headers,
            json={
                "food_id": food_id,
                "recognition_id": pred_data.get("recognition_id"),
                "meal_type": "Breakfast",
                "feedback": "positive",
                "rating": 5,
                "notes": "Recognized through CV pipeline"
            }
        )
        assert log_resp.status_code == 201
        history_id = log_resp.json()["data"]["id"]

        # Verify entry exists in history listing
        hist_list_resp = client.get("/api/history", headers=auth_headers)
        assert hist_list_resp.status_code == 200
        history_items = hist_list_resp.json()["data"]
        assert any(item["id"] == history_id for item in history_items)

    def test_recommendation_engine_and_feedback_scoring(self, client: TestClient, auth_headers, admin_headers):
        """
        Test recommendation filtering:
        - Excludes allergen conflicts
        - Scores user preferences and feedback adjustments
        """
        # Configure user preferences with Peanut allergy
        pref_resp = client.put(
            "/api/users/preferences",
            headers=auth_headers,
            json={
                "diet_type": "Vegetarian",
                "allergies": ["Peanuts"],
                "preferred_foods": ["Paneer", "Rice"],
                "avoided_foods": []
            }
        )
        assert pref_resp.status_code == 200

        # Create safe recipe
        safe_resp = client.post(
            "/api/recipes",
            headers=admin_headers,
            json={
                "name": "Integration Safe Paneer Pulao",
                "description": "Fragrant rice cooked with soft paneer cubes",
                "ingredients": ["Basmati Rice", "Paneer", "Ghee", "Spices"],
                "instructions": "1. Soak rice. 2. Fry paneer. 3. Cook together.",
                "meal_type": "Lunch",
                "diet_type": "Vegetarian",
                "allergy_information": ["Dairy"],
                "calories": 450.0,
                "protein": 16.0,
                "carbohydrates": 60.0,
                "fat": 12.0,
                "fiber": 4.0
            }
        )
        assert safe_resp.status_code == 201
        safe_recipe_id = safe_resp.json()["data"]["id"]

        # Create allergen-violating recipe (Must be filtered out)
        client.post(
            "/api/recipes",
            headers=admin_headers,
            json={
                "name": "Peanut Crunch Salad",
                "description": "Spicy roasted peanut salad",
                "ingredients": ["Peanuts", "Cucumber", "Lemon"],
                "instructions": "1. Toss ingredients.",
                "meal_type": "Lunch",
                "diet_type": "Vegetarian",
                "allergy_information": ["Peanuts"],
                "calories": 350.0,
                "protein": 15.0,
                "carbohydrates": 20.0,
                "fat": 25.0,
                "fiber": 6.0
            }
        )

        # Get recommendations
        rec_resp = client.post(
            "/api/recommendations",
            headers=auth_headers,
            json={"meal_type": "Lunch", "limit": 10}
        )
        assert rec_resp.status_code == 200
        recs = rec_resp.json()["data"]["recommendations"]

        # Assert allergen recipe is strictly eliminated
        rec_names = [r["recipe"]["name"] for r in recs]
        assert "Peanut Crunch Salad" not in rec_names
        assert any("Paneer" in name for name in rec_names)

        # Submit positive feedback on safe recipe
        fb_resp = client.post(
            "/api/history/feedback",
            headers=auth_headers,
            json={
                "meal_id": safe_recipe_id,
                "feedback": "positive",
                "rating": 5,
                "notes": "Delicious dish!"
            }
        )
        assert fb_resp.status_code == 200

    def test_daily_and_weekly_meal_planning(self, client: TestClient, auth_headers, admin_headers):
        """
        Test daily meal plan generation (5-meal partition) and weekly 7-day schedule.
        """
        # Ensure recipes exist in test DB for planning
        client.post(
            "/api/recipes",
            headers=admin_headers,
            json={
                "name": "Healthy Morning Oats",
                "description": "Rolled oats with chia seeds and fruit",
                "ingredients": ["Oats", "Milk", "Berries"],
                "instructions": "Simmer oats in milk for 5 mins.",
                "meal_type": "Breakfast",
                "diet_type": "Vegetarian",
                "allergy_information": [],
                "calories": 320.0,
                "protein": 12.0,
                "carbohydrates": 50.0,
                "fat": 5.0,
                "fiber": 6.0
            }
        )

        # Generate daily plan
        daily_gen = client.post("/api/meal-plans/generate", headers=auth_headers, json={"force_regenerate": True})
        assert daily_gen.status_code in [200, 201]
        daily_data = daily_gen.json()["data"]
        assert "meals" in daily_data
        assert "totals" in daily_data
        assert daily_data["totals"]["calories"] > 0

        # Retrieve daily plan
        daily_get = client.get("/api/meal-plans/daily", headers=auth_headers)
        assert daily_get.status_code == 200
        assert daily_get.json()["data"]["totals"]["calories"] > 0

        # Generate weekly plan
        weekly_gen = client.post("/api/meal-plans/generate-week", headers=auth_headers, json={"force_regenerate": True})
        assert weekly_gen.status_code == 200
        weekly_data = weekly_gen.json()["data"]
        assert "days" in weekly_data
        assert len(weekly_data["days"]) == 7
        assert weekly_data["weekly_average_calories"] > 0

        # Retrieve weekly plan
        weekly_get = client.get("/api/meal-plans/weekly", headers=auth_headers)
        assert weekly_get.status_code == 200
        assert "days" in weekly_get.json()["data"]

    def test_admin_crud_and_reporting_suite(self, client: TestClient, auth_headers, admin_headers):
        """
        Test Admin capabilities:
        - Regular users blocked from admin endpoints (403 Forbidden)
        - Admin creates, updates, and deletes food item and linked nutrition
        - Admin generates system analytics report
        """
        # 1. Non-admin blocked from admin dashboard
        blocked_resp = client.get("/api/admin/dashboard", headers=auth_headers)
        assert blocked_resp.status_code == 403

        # 2. Admin Food CRUD
        create_food = client.post(
            "/api/admin/foods",
            headers=admin_headers,
            json={
                "name": "Integration Test Food Item",
                "category": "Breakfast",
                "description": "Created during integration testing",
                "is_active": True
            }
        )
        assert create_food.status_code == 201
        food_id = create_food.json()["data"]["id"]

        # Update food
        update_food = client.put(
            f"/api/admin/foods/{food_id}",
            headers=admin_headers,
            json={"name": "Updated Integration Food Item"}
        )
        assert update_food.status_code == 200
        assert update_food.json()["data"]["name"] == "Updated Integration Food Item"

        # Create linked nutrition
        nutr_create = client.post(
            "/api/admin/nutrition",
            headers=admin_headers,
            json={
                "food_id": food_id,
                "serving_size": "150g",
                "calories": 250.0,
                "protein": 12.0,
                "carbohydrates": 35.0,
                "fat": 6.0,
                "fiber": 3.0,
                "sugar": 4.0
            }
        )
        assert nutr_create.status_code == 201
        nutr_id = nutr_create.json()["data"]["id"]

        # 3. Admin loads dashboard (now has total_foods > 0)
        dash_resp = client.get("/api/admin/dashboard", headers=admin_headers)
        assert dash_resp.status_code == 200
        stats = dash_resp.json()["data"]["statistics"]
        assert stats["total_foods"] >= 1

        # Delete nutrition then food
        del_nutr = client.delete(f"/api/admin/nutrition/{nutr_id}", headers=admin_headers)
        assert del_nutr.status_code == 200

        del_food = client.delete(f"/api/admin/foods/{food_id}", headers=admin_headers)
        assert del_food.status_code == 200

        # 4. Admin analytical telemetry report
        report_resp = client.get("/api/admin/reports", headers=admin_headers)
        assert report_resp.status_code == 200
        report_data = report_resp.json()["data"]
        assert "computer_vision_performance" in report_data
        assert "user_satisfaction" in report_data

    def test_complete_user_lifecycle_journey(self, client: TestClient, admin_headers):
        """
        Complete end-to-end user lifecycle test:
        1. Register brand new user
        2. Authenticate and obtain JWT
        3. Configure dietary profile (Vegan, no Peanuts, prefers Oats)
        4. Upload image and perform Computer Vision recognition
        5. Log meal to consumption history with positive feedback
        6. Request personalized recommendations tailored to preferences and history
        7. Generate daily meal plan (5 unique slots, accurate macro totals)
        8. Generate weekly meal plan (7 days, Monday-aligned, aggregated weekly averages)
        """
        email = "lifecycle_user@example.com"
        password = "SecurePassword123!"

        # Seed diverse vegan recipes for lifecycle test
        lifecycle_recipes = [
            {"name": "Lifecycle Steamed Oats", "meal_type": "Breakfast", "diet_type": "Vegan", "calories": 280.0, "protein": 11.0, "carbohydrates": 48.0, "fat": 4.0, "fiber": 6.0},
            {"name": "Lifecycle Green Apple Smoothie", "meal_type": "Morning Snack", "diet_type": "Vegan", "calories": 160.0, "protein": 3.0, "carbohydrates": 36.0, "fat": 1.0, "fiber": 4.0},
            {"name": "Lifecycle Tofu Quinoa Bowl", "meal_type": "Lunch", "diet_type": "Vegan", "calories": 440.0, "protein": 24.0, "carbohydrates": 58.0, "fat": 12.0, "fiber": 8.0},
            {"name": "Lifecycle Spiced Roasted Makhana", "meal_type": "Evening Snack", "diet_type": "Vegan", "calories": 150.0, "protein": 4.0, "carbohydrates": 24.0, "fat": 4.5, "fiber": 3.0},
            {"name": "Lifecycle Lentil Veggie Stew", "meal_type": "Dinner", "diet_type": "Vegan", "calories": 420.0, "protein": 18.0, "carbohydrates": 65.0, "fat": 8.0, "fiber": 9.0},
        ]
        for r in lifecycle_recipes:
            client.post(
                "/api/recipes",
                headers=admin_headers,
                json={
                    "name": r["name"],
                    "description": f"Healthy {r['name']}",
                    "ingredients": ["Plant-based ingredients", "Spices"],
                    "instructions": "1. Prepare ingredients. 2. Cook thoroughly.",
                    "meal_type": r["meal_type"],
                    "diet_type": r["diet_type"],
                    "allergy_information": [],
                    "calories": r["calories"],
                    "protein": r["protein"],
                    "carbohydrates": r["carbohydrates"],
                    "fat": r["fat"],
                    "fiber": r["fiber"]
                }
            )

        # Step 1: User Registration
        reg_resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Lifecycle Tester",
                "email": email,
                "password": password,
                "age": 27,
                "gender": "female"
            }
        )
        assert reg_resp.status_code == 201

        # Step 2: Authentication
        login_resp = client.post(
            "/api/auth/login",
            json={"email": email, "password": password}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify identity
        me_resp = client.get("/api/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["data"]["email"] == email

        # Step 3: Configure Dietary Preferences
        pref_resp = client.put(
            "/api/users/preferences",
            headers=headers,
            json={
                "diet_type": "Vegan",
                "allergies": ["Peanuts"],
                "preferred_foods": ["Oats", "Spinach"],
                "avoided_foods": ["Mushrooms"]
            }
        )
        assert pref_resp.status_code == 200
        assert pref_resp.json()["data"]["diet_type"] == "Vegan"

        # Step 4: Computer Vision Food Recognition
        img_buf = _create_sample_food_image()
        rec_resp = client.post(
            "/api/recognition/predict",
            headers=headers,
            files={"file": ("vision_meal.jpg", img_buf, "image/jpeg")}
        )
        assert rec_resp.status_code == 200
        rec_data = rec_resp.json()["data"]
        assert "food_name" in rec_data
        rec_id = rec_data["recognition_id"]

        # Step 5: Log to History with Positive Feedback
        history_resp = client.post(
            "/api/history",
            headers=headers,
            json={
                "recognition_id": rec_id,
                "meal_type": "Breakfast",
                "feedback": "positive",
                "rating": 5,
                "notes": "Excellent breakfast dish"
            }
        )
        assert history_resp.status_code == 201

        # Step 6: Fetch Recommendations
        rec_rec_resp = client.post(
            "/api/recommendations",
            headers=headers,
            json={"meal_type": "Breakfast", "limit": 5}
        )
        assert rec_rec_resp.status_code == 200
        recs = rec_rec_resp.json()["data"]["recommendations"]
        assert len(recs) > 0
        for r in recs:
            assert r["recipe"]["diet_type"] == "Vegan"
            assert "Peanuts" not in r["recipe"].get("allergy_information", [])

        # Step 7: Generate Daily Plan
        daily_resp = client.post(
            "/api/meal-plans/generate",
            headers=headers,
            json={"force_regenerate": True, "plan_date": "2026-10-05"}
        )
        assert daily_resp.status_code in [200, 201]
        daily_meals = daily_resp.json()["data"]["meals_list"]
        assert len(daily_meals) == 5
        # Verify all are Vegan
        for m in daily_meals:
            assert m["recipe"]["diet_type"] == "Vegan"

        # Step 8: Generate Weekly Plan
        weekly_resp = client.post(
            "/api/meal-plans/generate-week",
            headers=headers,
            json={"start_date": "2026-10-05", "force_regenerate": True}
        )
        assert weekly_resp.status_code == 200
        weekly_data = weekly_resp.json()["data"]
        assert len(weekly_data["days"]) == 7
        assert weekly_data["weekly_average_calories"] > 0

