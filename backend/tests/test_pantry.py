import pytest
from fastapi.testclient import TestClient
from app.models.food import Food
from app.utils.ingredient_parser import IngredientIndex, parse_ingredient_line


CATALOG = [
    ("Tomato", "Vegetables", ["tomatoes", "thakkali"], [], False),
    ("Onion", "Vegetables", ["onions"], [], False),
    ("Papaya", "Fruits", ["ripe papaya"], [], False),
    ("Lime", "Fruits", ["lime juice"], ["Lemon"], False),
    ("Lemon", "Fruits", ["lemon juice"], ["Lime"], False),
    ("Rice", "Grains & Cereals", ["basmati rice"], [], False),
    ("Chicken", "Poultry & Meat", ["chicken breast"], [], False),
    ("Peanuts", "Nuts & Seeds", ["groundnut"], [], False),
    ("Paneer", "Dairy & Alternatives", ["cottage cheese"], [], False),
    ("Garlic", "Vegetables", [], [], False),
    ("Ginger", "Vegetables", [], [], False),
    ("Cucumber", "Vegetables", [], [], False),
    ("Salt", "Spices & Seasonings", [], [], True),
    ("Cooking Oil", "Oils & Fats", ["oil"], [], True),
]


@pytest.fixture
def catalog(db_session):
    for name, category, aliases, substitutes, staple in CATALOG:
        db_session.add(Food(
            name=name,
            category=category,
            aliases=aliases,
            substitutes=substitutes,
            is_staple=staple,
            is_active=True
        ))
    db_session.commit()
    return {f.name: f.id for f in db_session.query(Food).all()}


def _create_recipe(client, admin_headers, name, ingredients, diet="Vegan", meal_type="Lunch", allergies=None):
    resp = client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": name,
            "description": f"{name} description",
            "ingredients": ingredients,
            "instructions": "1. Prepare everything. 2. Cook and serve.",
            "meal_type": meal_type,
            "diet_type": diet,
            "allergy_information": allergies or [],
            "calories": 400.0,
            "protein": 12.0,
            "carbohydrates": 60.0,
            "fat": 10.0,
            "fiber": 4.0
        }
    )
    assert resp.status_code == 201
    return resp.json()["data"]


@pytest.fixture
def recipes(client, admin_headers, catalog):
    return {
        "tomato_rice": _create_recipe(client, admin_headers, "Test Tomato Rice", ["Rice - 1 cup", "3 tomatoes", "Onion", "Salt to taste", "Oil - 1 tbsp"]),
        "papaya_lime": _create_recipe(client, admin_headers, "Test Papaya Lime Bowl", ["Papaya", "Lime"], meal_type="Morning Snack"),
        "chicken": _create_recipe(client, admin_headers, "Test Chicken Fry", ["Chicken", "Onion", "Garlic"], diet="Non-Vegetarian"),
        "peanut": _create_recipe(client, admin_headers, "Test Peanut Salad", ["Peanuts", "Tomato", "Onion"], allergies=["Peanuts"]),
        "feast": _create_recipe(client, admin_headers, "Test Big Feast", ["Tomato", "Paneer", "Garlic", "Ginger", "Cucumber", "Lemon"], diet="Vegetarian"),
    }


def test_parse_ingredient_line_extracts_quantity_and_optional():
    assert parse_ingredient_line("2 medium Tomatoes") == ("Tomatoes", "2 medium", False)
    assert parse_ingredient_line("Coriander Leaves - 2 tbsp (optional)") == ("Coriander Leaves", "2 tbsp", True)
    assert parse_ingredient_line("Salt to taste") == ("Salt to taste", None, False)


def test_ingredient_index_resolves_aliases_plurals_and_quantities():
    class Item:
        def __init__(self, id, name, aliases):
            self.id, self.name, self.aliases = id, name, aliases

    index = IngredientIndex([
        Item(1, "Tomato", ["thakkali"]),
        Item(2, "Raw Papaya", ["green papaya"]),
        Item(3, "Papaya", []),
        Item(4, "Garlic", []),
    ])
    assert index.resolve("Tomatoes") == 1
    assert index.resolve("thakkali") == 1
    assert index.resolve("3 ripe tomatoes, chopped") == 1
    assert index.resolve("raw papaya") == 2
    assert index.resolve("papaya") == 3
    assert index.resolve("2 cloves garlic") == 4
    assert index.resolve("dragon fruit") is None


def test_recipe_creation_links_structured_ingredients(client, admin_headers, auth_headers, recipes, catalog):
    data = recipes["tomato_rice"]
    names = [item["name"] for item in data["ingredient_items"]]
    assert names == ["Rice", "Tomato", "Onion", "Salt", "Cooking Oil"]
    staples = {item["name"] for item in data["ingredient_items"] if item["is_staple"]}
    assert staples == {"Salt", "Cooking Oil"}
    rice = next(i for i in data["ingredient_items"] if i["name"] == "Rice")
    assert rice["quantity"] == "1 cup"

    by_ingredient = client.get("/api/recipes", headers=auth_headers, params={"ingredient": "thakkali"})
    assert by_ingredient.status_code == 200
    returned = {r["name"] for r in by_ingredient.json()["data"]}
    assert "Test Tomato Rice" in returned
    assert "Test Papaya Lime Bowl" not in returned


def test_recipe_allergens_are_derived_from_ingredients(client, admin_headers, catalog):
    data = _create_recipe(client, admin_headers, "Test Paneer Bowl", ["Paneer", "Tomato"], diet="Vegetarian")
    assert "Dairy (Milk)" in data["allergy_information"]


def test_ingredient_search_matches_names_and_aliases(client, auth_headers, catalog):
    resp = client.get("/api/ingredients", headers=auth_headers, params={"search": "thakk"})
    assert resp.status_code == 200
    results = resp.json()["data"]
    assert results[0]["name"] == "Tomato"
    assert results[0]["matched_alias"] == "thakkali"

    categories = client.get("/api/ingredients/categories", headers=auth_headers).json()["data"]
    assert "Vegetables" in categories


def test_add_pantry_items_by_name(client, auth_headers, catalog):
    resp = client.post(
        "/api/pantry",
        headers=auth_headers,
        json={"names": ["tomatoes, papaya", "dragon fruit"]}
    )
    assert resp.status_code == 201
    result = resp.json()["data"]
    assert sorted(i["name"] for i in result["added"]) == ["Papaya", "Tomato"]
    assert [u["input"] for u in result["unrecognized"]] == ["dragon fruit"]

    listing = client.get("/api/pantry", headers=auth_headers).json()["data"]
    assert sorted(i["name"] for i in listing) == ["Papaya", "Tomato"]


def test_adding_existing_item_updates_quantity_and_expiry(client, auth_headers, catalog):
    client.post("/api/pantry", headers=auth_headers, json={"names": ["Tomato"]})
    resp = client.post(
        "/api/pantry",
        headers=auth_headers,
        json={"items": [{"name": "tomato", "quantity": "1 kg", "expiry_date": "2000-01-01"}]}
    )
    result = resp.json()["data"]
    assert result["added"] == []
    assert result["updated"][0]["quantity"] == "1 kg"
    assert result["updated"][0]["expires_soon"] is True


def test_empty_add_request_is_rejected(client, auth_headers, catalog):
    resp = client.post("/api/pantry", headers=auth_headers, json={"names": []})
    assert resp.status_code == 422


def test_suggest_ready_recipes_with_staples_and_substitutes(client, auth_headers, recipes):
    resp = client.post(
        "/api/pantry/suggest",
        headers=auth_headers,
        json={"ingredients": ["tomato", "onion", "rice", "papaya", "lemon"]}
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    by_name = {r["recipe"]["name"]: r for r in data["results"]}

    assert by_name["Test Tomato Rice"]["status"] == "ready"
    assert by_name["Test Tomato Rice"]["missing"] == []
    assert set(by_name["Test Tomato Rice"]["staples"]) == {"Salt", "Cooking Oil"}

    papaya = by_name["Test Papaya Lime Bowl"]
    assert papaya["status"] == "ready"
    assert papaya["substitutions"] == [{"missing": "Lime", "use": "Lemon"}]

    assert "Test Chicken Fry" not in by_name
    assert "Test Peanut Salad" not in by_name
    assert "Test Big Feast" not in by_name
    assert data["ready_count"] >= 2


def test_suggest_almost_recipes_list_missing_items_and_shopping_list(client, auth_headers, recipes):
    resp = client.post(
        "/api/pantry/suggest",
        headers=auth_headers,
        json={"ingredients": ["tomato"], "max_missing": 2}
    )
    data = resp.json()["data"]
    tomato_rice = next(r for r in data["results"] if r["recipe"]["name"] == "Test Tomato Rice")
    assert tomato_rice["status"] == "almost"
    assert sorted(m["name"] for m in tomato_rice["missing"]) == ["Onion", "Rice"]
    assert tomato_rice["match_percent"] == 33
    assert {"Onion", "Rice"} <= {item["name"] for item in data["shopping_list"]}

    strict = client.post(
        "/api/pantry/suggest",
        headers=auth_headers,
        json={"ingredients": ["tomato"], "max_missing": 0}
    ).json()["data"]
    assert all(r["status"] == "ready" for r in strict["results"])


def test_suggest_reports_unrecognized_ingredients(client, auth_headers, recipes):
    data = client.post(
        "/api/pantry/suggest",
        headers=auth_headers,
        json={"ingredients": ["tomato", "unobtainium"]}
    ).json()["data"]
    assert data["unrecognized"][0]["input"] == "unobtainium"
    assert data["pantry"] == ["Tomato"]


def test_suggest_falls_back_to_saved_pantry(client, auth_headers, recipes):
    client.post("/api/pantry", headers=auth_headers, json={"names": ["tomato", "onion", "rice"]})
    data = client.post("/api/pantry/suggest", headers=auth_headers, json={}).json()["data"]
    assert sorted(data["pantry"]) == ["Onion", "Rice", "Tomato"]
    ready = [r["recipe"]["name"] for r in data["results"] if r["status"] == "ready"]
    assert "Test Tomato Rice" in ready


def test_recommendations_reward_pantry_coverage(client, auth_headers, recipes):
    client.post("/api/pantry", headers=auth_headers, json={"names": ["tomato", "onion", "rice"]})
    recs = client.post(
        "/api/recommendations",
        headers=auth_headers,
        json={"meal_type": "Lunch", "limit": 10}
    ).json()["data"]["recommendations"]
    tomato_rice = next(r for r in recs if r["recipe"]["name"] == "Test Tomato Rice")
    assert tomato_rice["pantry_coverage"] == 100
    assert any("pantry" in reason for reason in tomato_rice["match_reasons"])


def test_update_remove_and_clear_pantry(client, auth_headers, catalog):
    added = client.post("/api/pantry", headers=auth_headers, json={"names": ["tomato", "onion"]}).json()["data"]["added"]
    tomato = next(i for i in added if i["name"] == "Tomato")

    updated = client.put(
        f"/api/pantry/{tomato['id']}",
        headers=auth_headers,
        json={"quantity": "500 g", "expiry_date": "2099-01-01"}
    ).json()["data"]
    assert updated["quantity"] == "500 g"
    assert updated["expires_soon"] is False

    cleared_expiry = client.put(
        f"/api/pantry/{tomato['id']}",
        headers=auth_headers,
        json={"clear_expiry": True}
    ).json()["data"]
    assert cleared_expiry["expiry_date"] is None

    assert client.delete(f"/api/pantry/{tomato['id']}", headers=auth_headers).status_code == 200
    assert [i["name"] for i in client.get("/api/pantry", headers=auth_headers).json()["data"]] == ["Onion"]

    cleared = client.delete("/api/pantry", headers=auth_headers).json()["data"]
    assert cleared["removed"] == 1
    assert client.get("/api/pantry", headers=auth_headers).json()["data"] == []


def test_users_cannot_touch_each_others_pantry(client, auth_headers, admin_headers, catalog):
    added = client.post("/api/pantry", headers=admin_headers, json={"names": ["papaya"]}).json()["data"]["added"]
    item_id = added[0]["id"]

    assert client.delete(f"/api/pantry/{item_id}", headers=auth_headers).status_code == 404
    assert client.get("/api/pantry", headers=auth_headers).json()["data"] == []


def test_pantry_requires_authentication(client):
    assert client.get("/api/pantry").status_code == 401
