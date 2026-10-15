import json
import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.services import cooking_assistant as assistant
from app.services import llm_client


def _recipe(client, admin_headers, name="Chef Bowl", ingredients=None, instructions=None):
    resp = client.post(
        "/api/recipes",
        headers=admin_headers,
        json={
            "name": name,
            "description": "A test bowl",
            "ingredients": ingredients or ["Rice - 1 cup", "Peanut - 50 g"],
            "instructions": instructions or "1. Rinse the rice.\n2. Cook for 15 minutes.\n3. Top with peanuts and serve.",
            "meal_type": "Lunch",
            "diet_type": "Vegetarian",
            "allergy_information": [],
            "calories": 400.0,
            "protein": 12.0,
            "carbohydrates": 60.0,
            "fat": 8.0,
            "fiber": 5.0,
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]


def _events(response):
    return [json.loads(line[6:]) for line in response.text.split("\n\n") if line.startswith("data: ")]


@pytest.fixture
def available(monkeypatch):
    async def status(force=False):
        return {"enabled": True, "available": True, "model": "test-model", "loaded": True}

    monkeypatch.setattr(llm_client, "get_status", status)


GUIDE_LINES = [
    '{"type":"meta","difficulty":"easy","equipment":["pot","strainer"],"prep":["Rinse the rice","Measure the peanuts"],"serving_tip":"Serve warm."}',
    '```json',
    '{"type":"step","title":"Rinse rice","do":"Rinse 1 cup of rice until the water runs clear.","minutes":null,"look_for":"Clear water","tip":"Soak 10 min","watch_out":null}',
    'not json at all',
    '{"type":"step","title":"Cook","do":"Simmer the rice covered on low heat.","minutes":15,"look_for":"Fluffy grains","tip":null,"watch_out":"Do not lift the lid"}',
    '{"type":"tips","items":["Keeps 2 days in the fridge"]}',
]


def _fake_chunks(lines, size=17):
    text = "\n".join(lines) + "\n"
    return [text[i:i + size] for i in range(0, len(text), size)]


def test_status_reports_unreachable_ollama(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "OLLAMA_URL", "http://127.0.0.1:9")
    llm_client._status_cache.update({"at": 0.0, "value": None})
    data = client.get("/api/assistant/status", headers=auth_headers).json()["data"]
    assert data["available"] is False
    assert "reason" in data
    llm_client._status_cache.update({"at": 0.0, "value": None})


def test_status_requires_login(client: TestClient):
    assert client.get("/api/assistant/status").status_code == 401


def test_guide_falls_back_to_stored_steps_with_personal_notes(client: TestClient, auth_headers, admin_headers):
    recipe = _recipe(client, admin_headers)
    data = client.get(f"/api/assistant/recipes/{recipe['id']}/guide", headers=auth_headers).json()["data"]
    guide = data["guide"]
    assert guide["ai"] is False
    assert [s["do"] for s in guide["steps"]][:2] == ["Rinse the rice.", "Cook for 15 minutes."]
    assert guide["steps"][1]["minutes"] == 15
    assert "peanuts" in data["personal"]["allergen_conflicts"]
    assert client.get("/api/assistant/recipes/999999/guide", headers=auth_headers).status_code == 404


def test_guide_streams_parses_and_caches(client: TestClient, auth_headers, admin_headers, available, monkeypatch):
    calls = {"count": 0}

    async def fake_stream(messages, **options):
        calls["count"] += 1
        assert messages[0]["role"] == "system"
        assert "Chef Bowl" in messages[1]["content"]
        for chunk in _fake_chunks(GUIDE_LINES):
            yield chunk

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    recipe = _recipe(client, admin_headers)

    first = _events(client.post(f"/api/assistant/recipes/{recipe['id']}/guide/stream", headers=auth_headers))
    kinds = [e["event"] for e in first]
    assert kinds == ["meta", "step", "step", "tips", "done"]
    done = first[-1]["guide"]
    assert done["difficulty"] == "Easy"
    assert [s["title"] for s in done["steps"]] == ["Rinse rice", "Cook"]
    assert done["steps"][1]["minutes"] == 15
    assert done["steps"][1]["tip"] is None

    cached = client.get(f"/api/assistant/recipes/{recipe['id']}/guide", headers=auth_headers).json()["data"]["guide"]
    assert cached["ai"] is True and cached["cached"] is True
    assert len(cached["steps"]) == 2

    second = _events(client.post(f"/api/assistant/recipes/{recipe['id']}/guide/stream", headers=auth_headers))
    assert [e["event"] for e in second] == ["done"]
    assert calls["count"] == 1

    refreshed = _events(client.post(f"/api/assistant/recipes/{recipe['id']}/guide/stream?refresh=true", headers=auth_headers))
    assert refreshed[-1]["event"] == "done"
    assert calls["count"] == 2


def test_cached_guide_is_invalidated_when_recipe_changes(client: TestClient, auth_headers, admin_headers, available, monkeypatch):
    async def fake_stream(messages, **options):
        for chunk in _fake_chunks(GUIDE_LINES):
            yield chunk

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    recipe = _recipe(client, admin_headers, name="Edited Bowl")
    client.post(f"/api/assistant/recipes/{recipe['id']}/guide/stream", headers=auth_headers)
    assert client.get(f"/api/assistant/recipes/{recipe['id']}/guide", headers=auth_headers).json()["data"]["guide"]["ai"] is True

    client.put(f"/api/admin/recipes/{recipe['id']}", headers=admin_headers, json={"instructions": "1. Cook it differently."})
    after = client.get(f"/api/assistant/recipes/{recipe['id']}/guide", headers=auth_headers).json()["data"]["guide"]
    assert after["ai"] is False


def test_guide_reports_unavailable_model(client: TestClient, auth_headers, admin_headers, monkeypatch):
    async def status(force=False):
        return {"enabled": True, "available": False, "model": "x", "loaded": False, "reason": "Ollama is not reachable"}

    monkeypatch.setattr(llm_client, "get_status", status)
    recipe = _recipe(client, admin_headers, name="Offline Bowl")
    events = _events(client.post(f"/api/assistant/recipes/{recipe['id']}/guide/stream", headers=auth_headers))
    assert events == [{"event": "unavailable", "reason": "Ollama is not reachable"}]


def test_guide_without_usable_steps_is_not_cached(client: TestClient, auth_headers, admin_headers, available, monkeypatch):
    async def fake_stream(messages, **options):
        yield "I'm sorry, I cannot help with that."

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    recipe = _recipe(client, admin_headers, name="Garbled Bowl")
    events = _events(client.post(f"/api/assistant/recipes/{recipe['id']}/guide/stream", headers=auth_headers))
    assert events == []
    assert client.get(f"/api/assistant/recipes/{recipe['id']}/guide", headers=auth_headers).json()["data"]["guide"]["ai"] is False


def test_ask_streams_answer_with_user_and_step_context(client: TestClient, auth_headers, admin_headers, available, monkeypatch):
    seen = {}

    async def fake_stream(messages, **options):
        seen["messages"] = messages
        seen["options"] = options
        for word in ["Use ", "cashews ", "instead."]:
            yield word

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    recipe = _recipe(client, admin_headers, name="Ask Bowl")
    response = client.post(
        f"/api/assistant/recipes/{recipe['id']}/ask",
        headers=auth_headers,
        json={
            "question": "What can I use instead of peanuts?",
            "history": [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello!"}],
            "current_step": 1,
        },
    )
    events = _events(response)
    assert "".join(e["text"] for e in events if e["event"] == "token") == "Use cashews instead."
    assert events[-1] == {"event": "done"}

    system_text = " ".join(m["content"] for m in seen["messages"] if m["role"] == "system")
    assert "Ask Bowl" in system_text
    assert "Peanuts" in system_text
    assert "currently on step 2 of 3" in system_text
    assert seen["messages"][-1] == {"role": "user", "content": "What can I use instead of peanuts?"}
    assert [m["role"] for m in seen["messages"] if m["role"] != "system"] == ["user", "assistant", "user"]
    assert seen["messages"][-3]["content"] == "Hi"


def test_ask_validates_input_and_unknown_recipe(client: TestClient, auth_headers, admin_headers, available):
    recipe = _recipe(client, admin_headers, name="Validate Bowl")
    assert client.post(f"/api/assistant/recipes/{recipe['id']}/ask", headers=auth_headers, json={"question": "?"}).status_code == 422
    too_long = client.post(f"/api/assistant/recipes/{recipe['id']}/ask", headers=auth_headers, json={"question": "x" * 600})
    assert too_long.status_code == 422
    assert client.post("/api/assistant/recipes/999999/ask", headers=auth_headers, json={"question": "hello there"}).status_code == 404
    assert client.post(f"/api/assistant/recipes/{recipe['id']}/ask", json={"question": "hello there"}).status_code == 401


def test_ask_reports_model_failure(client: TestClient, auth_headers, admin_headers, available, monkeypatch):
    async def failing(messages, **options):
        raise llm_client.LLMUnavailable("The assistant took too long to answer")
        yield ""

    monkeypatch.setattr(llm_client, "stream_chat", failing)
    recipe = _recipe(client, admin_headers, name="Slow Bowl")
    events = _events(client.post(f"/api/assistant/recipes/{recipe['id']}/ask", headers=auth_headers, json={"question": "How long?"}))
    assert events == [{"event": "unavailable", "reason": "The assistant took too long to answer"}]


def test_prime_runs_a_one_token_request_with_the_stable_prefix(client: TestClient, auth_headers, admin_headers, available, monkeypatch):
    seen = []

    async def fake_stream(messages, **options):
        seen.append((messages, options))
        yield "ok"

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    recipe = _recipe(client, admin_headers, name="Prime Bowl")
    response = client.post(f"/api/assistant/recipes/{recipe['id']}/prime", headers=auth_headers)
    assert response.status_code == 202
    assert len(seen) == 1
    primed, options = seen[0]
    assert options["max_tokens"] == 1

    asked = {}

    async def capture(messages, **opts):
        asked["messages"] = messages
        yield "fine"

    monkeypatch.setattr(llm_client, "stream_chat", capture)
    client.post(f"/api/assistant/recipes/{recipe['id']}/ask", headers=auth_headers, json={"question": "How long?", "current_step": 0})
    shared = [m for m in primed if m["role"] == "system"]
    assert asked["messages"][: len(shared)] == shared


def test_only_admin_can_clear_cached_guides(client: TestClient, auth_headers, admin_headers, available, monkeypatch):
    async def fake_stream(messages, **options):
        for chunk in _fake_chunks(GUIDE_LINES):
            yield chunk

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    recipe = _recipe(client, admin_headers, name="Reset Bowl")
    client.post(f"/api/assistant/recipes/{recipe['id']}/guide/stream", headers=auth_headers)
    assert client.delete(f"/api/assistant/recipes/{recipe['id']}/guide", headers=auth_headers).status_code == 403
    assert client.delete(f"/api/assistant/recipes/{recipe['id']}/guide", headers=admin_headers).status_code == 200
    assert client.get(f"/api/assistant/recipes/{recipe['id']}/guide", headers=auth_headers).json()["data"]["guide"]["ai"] is False


def test_json_extraction_is_tolerant():
    assert assistant._extract_json('```json {"a": 1}```') == {"a": 1}
    assert assistant._extract_json('Sure! {"a": 1} hope that helps') == {"a": 1}
    assert assistant._extract_json("no json here") is None
    assert assistant._extract_json("{broken") is None
