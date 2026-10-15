import asyncio
import json
import logging
import time
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger("meal_planner")

_generation_lock = asyncio.Semaphore(1)
_status_cache: Dict[str, Any] = {"at": 0.0, "value": None}
STATUS_TTL_SECONDS = 15.0


class LLMUnavailable(Exception):
    pass


def _client(timeout: Optional[float] = None) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.OLLAMA_URL.rstrip("/"),
        timeout=httpx.Timeout(timeout or settings.OLLAMA_TIMEOUT, connect=3.0),
    )


async def get_status(force: bool = False) -> Dict[str, Any]:
    now = time.monotonic()
    if not force and _status_cache["value"] and now - _status_cache["at"] < STATUS_TTL_SECONDS:
        return _status_cache["value"]

    status: Dict[str, Any] = {"enabled": settings.ASSISTANT_ENABLED, "available": False, "model": settings.OLLAMA_MODEL, "loaded": False}
    if settings.ASSISTANT_ENABLED:
        try:
            async with _client(4.0) as client:
                tags = await client.get("/api/tags")
                tags.raise_for_status()
                names = {item.get("name") for item in tags.json().get("models", [])}
                status["available"] = settings.OLLAMA_MODEL in names
                if not status["available"]:
                    status["reason"] = f"Model {settings.OLLAMA_MODEL} is not installed in Ollama"
                else:
                    running = await client.get("/api/ps")
                    status["loaded"] = settings.OLLAMA_MODEL in {m.get("name") for m in running.json().get("models", [])}
        except Exception:
            status["reason"] = "Ollama is not reachable"
    else:
        status["reason"] = "Assistant is turned off"

    _status_cache.update({"at": now, "value": status})
    return status


async def warm_up() -> None:
    try:
        async with _client(180.0) as client:
            await client.post(
                "/api/generate",
                json={"model": settings.OLLAMA_MODEL, "prompt": "", "keep_alive": settings.OLLAMA_KEEP_ALIVE},
            )
        _status_cache["at"] = 0.0
    except Exception as error:
        logger.warning(f"Could not warm up the assistant model: {error}")


async def stream_chat(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.4,
    max_tokens: int = 600,
    json_mode: bool = False,
) -> AsyncIterator[str]:
    """
    Yield the assistant's reply token by token from Ollama's /api/chat.
    Generation is serialised so concurrent users queue instead of thrashing the CPU.
    """
    payload: Dict[str, Any] = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": settings.OLLAMA_NUM_CTX,
        },
    }
    if json_mode:
        payload["format"] = "json"

    async with _generation_lock:
        try:
            async with _client() as client:
                async with client.stream("POST", "/api/chat", json=payload) as response:
                    if response.status_code != 200:
                        body = (await response.aread()).decode("utf-8", "ignore")[:200]
                        raise LLMUnavailable(f"Ollama returned {response.status_code}: {body}")
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if chunk.get("error"):
                            raise LLMUnavailable(str(chunk["error"]))
                        content = (chunk.get("message") or {}).get("content")
                        if content:
                            yield content
                        if chunk.get("done"):
                            break
        except (httpx.ConnectError, httpx.ConnectTimeout) as error:
            _status_cache["at"] = 0.0
            raise LLMUnavailable("Ollama is not reachable") from error
        except httpx.ReadTimeout as error:
            raise LLMUnavailable("The assistant took too long to answer") from error


async def complete_chat(messages: List[Dict[str, str]], **options: Any) -> str:
    parts: List[str] = []
    async for piece in stream_chat(messages, **options):
        parts.append(piece)
    return "".join(parts)
