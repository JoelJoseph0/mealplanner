import logging
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger("meal_planner")

FOOD_COLUMNS = {
    "aliases": "JSON NOT NULL DEFAULT '[]'",
    "substitutes": "JSON NOT NULL DEFAULT '[]'",
    "is_staple": "BOOLEAN NOT NULL DEFAULT FALSE",
}


def ensure_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "foods" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("foods")}
    missing = [(name, ddl) for name, ddl in FOOD_COLUMNS.items() if name not in existing]
    if not missing:
        return
    with engine.begin() as connection:
        for name, ddl in missing:
            connection.execute(text(f"ALTER TABLE foods ADD COLUMN {name} {ddl}"))
            logger.info(f"Added missing column foods.{name}")
