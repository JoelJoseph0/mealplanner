import asyncio
import json
from typing import AsyncIterator, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.services import cooking_assistant as assistant
from app.services import llm_client
from app.utils.helpers import api_response

router = APIRouter(prefix="/assistant", tags=["Cooking Assistant"])

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}


class ChatTurn(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=1500)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=assistant.MAX_QUESTION_CHARS)
    history: List[ChatTurn] = Field(default_factory=list, max_length=20)
    current_step: Optional[int] = Field(None, ge=0, le=60)


def _sse(payload: Dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _recipe_or_404(db: Session, recipe_id: int):
    recipe = assistant.load_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recipe {recipe_id} not found")
    return recipe


@router.get("/status")
async def assistant_status(background: BackgroundTasks, warm: bool = Query(False), current_user: User = Depends(get_current_user)):
    info = await llm_client.get_status()
    if warm and info["available"] and not info["loaded"]:
        background.add_task(llm_client.warm_up)
    return api_response(data=info, message="Assistant status retrieved")


@router.get("/recipes/{recipe_id}/guide")
def get_guide(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return the cached AI guide when one exists, otherwise the guide built from the stored steps."""
    recipe = _recipe_or_404(db, recipe_id)
    cached = assistant.get_cached_guide(db, recipe)
    guide = cached or {**assistant.basic_guide(recipe), "cached": False}
    return api_response(
        data={"guide": guide, "personal": assistant.personal_notes(db, current_user.id, recipe)},
        message="Cooking guide retrieved"
    )


@router.post("/recipes/{recipe_id}/guide/stream")
async def stream_guide(
    recipe_id: int,
    refresh: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate the detailed guide with the local language model, streaming each step as it is ready."""
    recipe = _recipe_or_404(db, recipe_id)
    if refresh:
        assistant.clear_guide(db, recipe.id)

    async def events() -> AsyncIterator[str]:
        cached = assistant.get_cached_guide(db, recipe)
        if cached:
            yield _sse({"event": "done", "guide": cached})
            return
        info = await llm_client.get_status()
        if not info["available"]:
            yield _sse({"event": "unavailable", "reason": info.get("reason", "The assistant is not available")})
            return
        try:
            async for event in assistant.stream_guide(recipe):
                if event["event"] == "done":
                    assistant.save_guide(db, recipe, event["guide"])
                yield _sse(event)
        except llm_client.LLMUnavailable as error:
            yield _sse({"event": "unavailable", "reason": str(error)})
        except asyncio.CancelledError:
            raise
        except Exception:
            yield _sse({"event": "error", "reason": "The assistant could not finish the guide"})

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)


@router.post("/recipes/{recipe_id}/ask")
async def ask_about_recipe(
    recipe_id: int,
    request: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Answer a question about a recipe, streaming the reply as it is written."""
    recipe = _recipe_or_404(db, recipe_id)
    history = [turn.model_dump() for turn in request.history]

    async def events() -> AsyncIterator[str]:
        info = await llm_client.get_status()
        if not info["available"]:
            yield _sse({"event": "unavailable", "reason": info.get("reason", "The assistant is not available")})
            return
        try:
            async for piece in assistant.stream_answer(
                db, current_user.id, recipe, request.question, history, request.current_step
            ):
                yield _sse({"event": "token", "text": piece})
            yield _sse({"event": "done"})
        except llm_client.LLMUnavailable as error:
            yield _sse({"event": "unavailable", "reason": str(error)})
        except asyncio.CancelledError:
            raise
        except Exception:
            yield _sse({"event": "error", "reason": "The assistant could not answer that"})

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)


@router.post("/recipes/{recipe_id}/prime", status_code=status.HTTP_202_ACCEPTED)
async def prime_chat(
    recipe_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pre-process the recipe prompt so the first question gets a quick answer."""
    recipe = _recipe_or_404(db, recipe_id)
    info = await llm_client.get_status()
    if not info["available"]:
        return api_response(data={"primed": False}, message="Assistant not available")

    async def prime() -> None:
        try:
            await assistant.prime_chat(db, current_user.id, recipe)
        except Exception:
            return

    background.add_task(prime)
    return api_response(data={"primed": True}, message="Priming started")


@router.delete("/recipes/{recipe_id}/guide")
def reset_guide(
    recipe_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin: discard the cached guide so the next cook regenerates it."""
    recipe = _recipe_or_404(db, recipe_id)
    assistant.clear_guide(db, recipe.id)
    return api_response(message="Cached guide cleared")
