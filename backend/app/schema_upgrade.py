import logging
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger("meal_planner")

ADDED_COLUMNS = {
    "foods": {
        "aliases": "JSON NOT NULL DEFAULT '[]'",
        "substitutes": "JSON NOT NULL DEFAULT '[]'",
        "is_staple": "BOOLEAN NOT NULL DEFAULT FALSE",
    },
    "meal_plans": {
        "locked": "BOOLEAN NOT NULL DEFAULT FALSE",
        "completed": "BOOLEAN NOT NULL DEFAULT FALSE",
        "history_id": "INTEGER",
        "skipped": "BOOLEAN NOT NULL DEFAULT FALSE",
    },
    "dietary_profiles": {
        "goal": "VARCHAR(30) NOT NULL DEFAULT 'maintain'",
        "intolerances": "JSON NOT NULL DEFAULT '[]'",
        "health_conditions": "JSON NOT NULL DEFAULT '[]'",
        "reminders": "JSON NOT NULL DEFAULT '{}'",
    },
    "meal_histories": {
        "action": "VARCHAR(20) NOT NULL DEFAULT 'cooked'",
    },
}


def ensure_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    for table, columns in ADDED_COLUMNS.items():
        if table not in tables:
            continue
        existing = {column["name"] for column in inspector.get_columns(table)}
        missing = [(name, ddl) for name, ddl in columns.items() if name not in existing]
        if not missing:
            continue
        with engine.begin() as connection:
            for name, ddl in missing:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                logger.info(f"Added missing column {table}.{name}")
