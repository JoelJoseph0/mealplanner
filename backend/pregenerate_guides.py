import argparse
import asyncio
import sys
import time

from app.database import SessionLocal
from app.models.recipe import Recipe
from app.services import cooking_assistant as assistant
from app.services import llm_client


async def generate_one(db, recipe) -> bool:
    guide = None
    async for event in assistant.stream_guide(recipe):
        if event["event"] == "done":
            guide = event["guide"]
    if not guide:
        return False
    assistant.save_guide(db, recipe, guide)
    return True


async def main(limit: int, refresh: bool, ids: list) -> int:
    status = await llm_client.get_status(force=True)
    if not status["available"]:
        print(f"Assistant not available: {status.get('reason', 'unknown reason')}")
        return 1

    db = SessionLocal()
    try:
        query = db.query(Recipe.id).order_by(Recipe.id)
        if ids:
            query = query.filter(Recipe.id.in_(ids))
        recipe_ids = [row[0] for row in query.all()]
        done = skipped = failed = 0
        started = time.time()
        for position, recipe_id in enumerate(recipe_ids, start=1):
            if limit and done >= limit:
                break
            recipe = assistant.load_recipe(db, recipe_id)
            if not refresh and assistant.get_cached_guide(db, recipe):
                skipped += 1
                continue
            began = time.time()
            try:
                ok = await generate_one(db, recipe)
            except llm_client.LLMUnavailable as error:
                print(f"[{position}/{len(recipe_ids)}] {recipe.name}: {error}")
                failed += 1
                continue
            if ok:
                done += 1
                print(f"[{position}/{len(recipe_ids)}] {recipe.name}: done in {time.time() - began:.0f}s")
            else:
                failed += 1
                print(f"[{position}/{len(recipe_ids)}] {recipe.name}: no usable steps returned")
        print(f"Finished in {time.time() - started:.0f}s: {done} generated, {skipped} already cached, {failed} failed.")
        return 0 if not failed else 2
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pre-generate cooking guides with the local language model.")
    parser.add_argument("--limit", type=int, default=0, help="Stop after generating this many guides")
    parser.add_argument("--refresh", action="store_true", help="Regenerate guides that are already cached")
    parser.add_argument("--ids", type=int, nargs="*", default=[], help="Only these recipe ids")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.limit, args.refresh, args.ids)))
