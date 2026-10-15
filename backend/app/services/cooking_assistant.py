import hashlib
import json
import re
from typing import Any, AsyncIterator, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models.dietary_profile import DietaryProfile
from app.models.pantry_item import PantryItem
from app.models.recipe import Recipe
from app.models.recipe_guide import RecipeGuide
from app.models.recipe_ingredient import RecipeIngredient
from app.recommendation.filters import restricted_terms, term_variants
from app.services import llm_client

MAX_HISTORY = 6
MAX_QUESTION_CHARS = 500
MAX_STEPS = 12

GUIDE_SYSTEM_PROMPT = """You are a careful home-cooking coach for a meal planner app used mostly in India.
Expand the recipe you are given into a detailed, beginner-friendly cooking guide.
Use only the ingredients and quantities listed. Do not add new main ingredients.
Reply with JSON Lines only: one compact JSON object per line, no markdown, no commentary.

Line 1: {"type":"meta","difficulty":"Easy|Medium|Hard","equipment":["up to 6 short items"],"prep":["3 to 6 short mise-en-place tasks"],"serving_tip":"one sentence"}
Then one line per step, in order, 5 to 9 steps: {"type":"step","title":"2 to 5 words","do":"2 to 3 clear sentences with quantities and heat level","minutes":number or null,"look_for":"how to tell it is ready: colour, smell or texture","tip":"one practical tip or null","watch_out":"one common mistake or null"}
Last line: {"type":"tips","items":["up to 3 short storage, make-ahead or variation tips"]}"""

CHAT_SYSTEM_PROMPT = """You are Chef Assistant inside the Smart Meal Planner app, helping someone cook "{name}".
Answer questions about this recipe: ingredients, substitutions, techniques, timing, scaling, storage and serving.
Be concise (under 120 words), practical and kind. Use the recipe details provided; if they do not cover the question, use general cooking knowledge and say so.
Names marked "also called" are the same ingredient, so never suggest them as a substitute. Prefer the catalog's listed substitutes; if none are listed, suggest a genuinely different ingredient and say how it changes the dish.
If the person's allergies or intolerances conflict with an ingredient or your suggestion, say so clearly.
Never give medical advice or prescribe diets; for health conditions suggest asking a doctor or registered dietitian.
If asked about something unrelated to food and cooking, politely steer back to the recipe.
Reply in plain text without markdown headings."""


def source_hash(recipe: Recipe) -> str:
    payload = json.dumps(
        [recipe.name, recipe.ingredients, recipe.instructions, recipe.servings, recipe.meal_type],
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_recipe(db: Session, recipe_id: int) -> Optional[Recipe]:
    return (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredient_links).joinedload(RecipeIngredient.food))
        .filter(Recipe.id == recipe_id)
        .first()
    )


def _ingredient_lines(recipe: Recipe) -> List[str]:
    return [str(line) for line in (recipe.ingredients or [])]


def recipe_context(recipe: Recipe) -> str:
    lines = [
        f"Recipe: {recipe.name}",
        f"Meal type: {recipe.meal_type}. Diet: {recipe.diet_type}. Serves {recipe.servings}.",
        f"Time: {recipe.preparation_time} min prep, {recipe.cooking_time} min cooking.",
        f"Per serving: {round(recipe.calories)} kcal, {round(recipe.protein)} g protein, "
        f"{round(recipe.carbohydrates)} g carbs, {round(recipe.fat)} g fat.",
    ]
    if recipe.description:
        lines.append(f"Description: {recipe.description}")
    lines.append("Ingredients:")
    lines.extend(f"- {line}" for line in _ingredient_lines(recipe))
    lines.append("Method:")
    lines.append(str(recipe.instructions or "").strip())
    if recipe.allergy_information:
        lines.append("Contains: " + ", ".join(str(a) for a in recipe.allergy_information))
    notes = _catalog_notes(recipe)
    if notes:
        lines.append("Ingredient notes from the app's catalog:")
        lines.extend(notes)
    return "\n".join(lines)


def _catalog_notes(recipe: Recipe) -> List[str]:
    notes: List[str] = []
    for link in recipe.ingredient_links or []:
        food = link.food
        if food is None:
            continue
        aliases = [str(a) for a in (food.aliases or [])][:3]
        substitutes = [str(x) for x in (food.substitutes or [])][:3]
        if not aliases and not substitutes:
            continue
        parts = []
        if aliases:
            parts.append("also called " + ", ".join(aliases))
        parts.append("substitutes: " + (", ".join(substitutes) if substitutes else "none listed"))
        notes.append(f"- {food.name}: " + "; ".join(parts))
    return notes


def _step_texts(instructions: Optional[str]) -> List[str]:
    if not instructions:
        return []
    return [
        re.sub(r"^\d+[.)]\s*", "", line.strip())
        for line in str(instructions).split("\n")
        if line.strip()
    ]


def _minutes_in(text: str) -> Optional[int]:
    match = re.search(r"(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:minutes?|mins?)\b", text, re.I)
    if not match:
        return None
    return int(match.group(2) or match.group(1))


def basic_guide(recipe: Recipe) -> Dict[str, Any]:
    """Guide built only from the stored recipe, used when the AI is off or still working."""
    steps = []
    for index, text in enumerate(_step_texts(recipe.instructions), start=1):
        steps.append({
            "title": f"Step {index}",
            "do": text,
            "minutes": _minutes_in(text),
            "look_for": None,
            "tip": None,
            "watch_out": None,
        })
    return {
        "ai": False,
        "difficulty": None,
        "equipment": [],
        "prep": [f"Gather: {line}" for line in _ingredient_lines(recipe)[:6]],
        "serving_tip": None,
        "steps": steps,
        "tips": [],
    }


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    cleaned = text.strip().strip("`").strip()
    if cleaned.lower().startswith("json"):
        cleaned = cleaned[4:].strip()
    if not cleaned.startswith("{"):
        start = cleaned.find("{")
        if start == -1:
            return None
        cleaned = cleaned[start:]
    end = cleaned.rfind("}")
    if end == -1:
        return None
    try:
        value = json.loads(cleaned[: end + 1])
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def _short(value: Any, limit: int) -> Optional[str]:
    if value is None:
        return None
    text = " ".join(str(value).split())
    if not text or text.lower() in ("null", "none", "n/a"):
        return None
    return text[:limit]


def _clean_step(raw: Dict[str, Any], index: int) -> Optional[Dict[str, Any]]:
    do = _short(raw.get("do") or raw.get("instruction") or raw.get("text"), 600)
    if not do:
        return None
    minutes = raw.get("minutes")
    try:
        minutes = int(minutes) if minutes not in (None, "", "null") else None
    except (TypeError, ValueError):
        minutes = _minutes_in(str(minutes))
    if minutes is not None and not 1 <= minutes <= 240:
        minutes = None
    return {
        "title": _short(raw.get("title"), 60) or f"Step {index}",
        "do": do,
        "minutes": minutes,
        "look_for": _short(raw.get("look_for"), 240),
        "tip": _short(raw.get("tip"), 240),
        "watch_out": _short(raw.get("watch_out"), 240),
    }


def _string_list(value: Any, limit: int, item_chars: int = 140) -> List[str]:
    if not isinstance(value, list):
        return []
    items = [_short(v, item_chars) for v in value]
    return [i for i in items if i][:limit]


def get_cached_guide(db: Session, recipe: Recipe) -> Optional[Dict[str, Any]]:
    row = db.query(RecipeGuide).filter(RecipeGuide.recipe_id == recipe.id).first()
    if row and row.source_hash == source_hash(recipe):
        return {**row.content, "ai": True, "cached": True, "model": row.model}
    return None


def save_guide(db: Session, recipe: Recipe, guide: Dict[str, Any]) -> None:
    content = {k: guide.get(k) for k in ("difficulty", "equipment", "prep", "serving_tip", "steps", "tips")}
    row = db.query(RecipeGuide).filter(RecipeGuide.recipe_id == recipe.id).first()
    if row:
        row.source_hash = source_hash(recipe)
        row.model = settings.OLLAMA_MODEL
        row.content = content
    else:
        db.add(RecipeGuide(recipe_id=recipe.id, source_hash=source_hash(recipe), model=settings.OLLAMA_MODEL, content=content))
    db.commit()


def clear_guide(db: Session, recipe_id: int) -> None:
    db.query(RecipeGuide).filter(RecipeGuide.recipe_id == recipe_id).delete()
    db.commit()


def personal_notes(db: Session, user_id: int, recipe: Recipe) -> Dict[str, Any]:
    """Deterministic, user-specific warnings. These never depend on the language model."""
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    haystack = " ".join(
        [recipe.name or ""]
        + _ingredient_lines(recipe)
        + [str(a) for a in (recipe.allergy_information or [])]
    ).lower()

    conflicts: List[str] = []
    if profile:
        for term in restricted_terms(profile):
            label = str(term).strip().lower()
            if label and label not in conflicts and any(v in haystack for v in term_variants(label)):
                conflicts.append(label)

    owned = {row[0] for row in db.query(PantryItem.food_id).filter(PantryItem.user_id == user_id).all()}
    missing = [
        link.food.name
        for link in recipe.ingredient_links
        if link.food is not None and not link.is_optional and not link.food.is_staple and link.food_id not in owned
    ]

    return {
        "allergen_conflicts": conflicts,
        "missing_ingredients": missing,
        "health_conditions": list(getattr(profile, "health_conditions", None) or []) if profile else [],
    }


def user_context(db: Session, user_id: int) -> str:
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()
    if not profile:
        return "No dietary profile."
    parts = [f"Diet: {profile.diet_type or 'None'}."]
    if profile.allergies:
        parts.append("Allergies: " + ", ".join(profile.allergies) + ".")
    intolerances = getattr(profile, "intolerances", None) or []
    if intolerances:
        parts.append("Intolerances: " + ", ".join(intolerances) + ".")
    if profile.avoided_foods:
        parts.append("Avoids: " + ", ".join(profile.avoided_foods) + ".")
    owned = (
        db.query(PantryItem)
        .options(joinedload(PantryItem.food))
        .filter(PantryItem.user_id == user_id)
        .limit(40)
        .all()
    )
    names = [item.food.name for item in owned if item.food]
    if names:
        parts.append("Has at home: " + ", ".join(names) + ".")
    return " ".join(parts)


async def stream_guide(recipe: Recipe) -> AsyncIterator[Dict[str, Any]]:
    """
    Ask the model for a JSON-lines guide and emit events as each line completes:
    {"event": "meta", ...}, {"event": "step", "index": n, ...}, {"event": "tips", ...}
    followed by {"event": "done", "guide": {...}} once at least one step was produced.
    """
    messages = [
        {"role": "system", "content": GUIDE_SYSTEM_PROMPT},
        {"role": "user", "content": recipe_context(recipe)},
    ]
    guide: Dict[str, Any] = {"ai": True, "difficulty": None, "equipment": [], "prep": [], "serving_tip": None, "steps": [], "tips": []}
    buffer = ""

    def consume(line: str) -> Optional[Dict[str, Any]]:
        data = _extract_json(line)
        if not data:
            return None
        kind = str(data.get("type") or "").lower()
        if kind == "meta" or ("steps" not in data and ("prep" in data or "equipment" in data) and kind != "step"):
            difficulty = _short(data.get("difficulty"), 12)
            guide["difficulty"] = difficulty.title() if difficulty else None
            guide["equipment"] = _string_list(data.get("equipment"), 6, 60)
            guide["prep"] = _string_list(data.get("prep"), 6)
            guide["serving_tip"] = _short(data.get("serving_tip"), 240)
            return {"event": "meta", **{k: guide[k] for k in ("difficulty", "equipment", "prep", "serving_tip")}}
        if kind == "tips" or "items" in data:
            guide["tips"] = _string_list(data.get("items"), 3, 200)
            return {"event": "tips", "tips": guide["tips"]}
        if kind == "step" or "do" in data or "instruction" in data:
            if len(guide["steps"]) >= MAX_STEPS:
                return None
            step = _clean_step(data, len(guide["steps"]) + 1)
            if not step:
                return None
            guide["steps"].append(step)
            return {"event": "step", "index": len(guide["steps"]) - 1, "step": step}
        return None

    async for piece in llm_client.stream_chat(messages, temperature=0.3, max_tokens=1100):
        buffer += piece
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            event = consume(line)
            if event:
                yield event
    if buffer.strip():
        event = consume(buffer)
        if event:
            yield event

    if guide["steps"]:
        yield {"event": "done", "guide": guide}


def chat_messages(
    db: Session,
    user_id: int,
    recipe: Recipe,
    question: str,
    history: List[Dict[str, str]],
    current_step: Optional[int] = None,
) -> List[Dict[str, str]]:
    """
    Build the chat prompt with the stable parts first (instructions, recipe, person),
    then anything that changes between questions. Ollama reuses the already-processed
    prefix, so follow-up questions and a primed chat start answering much sooner.
    """
    context = recipe_context(recipe) + "\nAbout the person cooking: " + user_context(db, user_id)
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT.format(name=recipe.name)},
        {"role": "system", "content": context},
    ]
    if current_step is not None:
        steps = _step_texts(recipe.instructions)
        if 0 <= current_step < len(steps):
            messages.append({
                "role": "system",
                "content": f"The cook is currently on step {current_step + 1} of {len(steps)}: {steps[current_step]}",
            })
    for turn in history[-MAX_HISTORY:]:
        role = "assistant" if turn.get("role") == "assistant" else "user"
        content = str(turn.get("content", ""))[:1200]
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": question.strip()[:MAX_QUESTION_CHARS]})
    return messages


async def prime_chat(db: Session, user_id: int, recipe: Recipe) -> None:
    """Process the recipe prompt ahead of the first question by asking for a single token."""
    messages = chat_messages(db, user_id, recipe, "Hello", [])
    async for _ in llm_client.stream_chat(messages, temperature=0.0, max_tokens=1):
        break


async def stream_answer(
    db: Session,
    user_id: int,
    recipe: Recipe,
    question: str,
    history: List[Dict[str, str]],
    current_step: Optional[int] = None,
) -> AsyncIterator[str]:
    messages = chat_messages(db, user_id, recipe, question, history, current_step)
    async for piece in llm_client.stream_chat(messages, temperature=0.5, max_tokens=420):
        yield piece
