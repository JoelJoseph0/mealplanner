import os
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Meal Planner Using Computer Vision"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/smart_meal_planner"
    SECRET_KEY: str = "CHANGE_THIS_SECRET_KEY_SUPER_SECRET_JWT_KEY_MCA_2026_MEAL_PLANNER"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    FRONTEND_URL: str = "http://localhost:5173"
    MAX_UPLOAD_SIZE: int = 10485760  # 10 MB in bytes
    UPLOAD_DIR: str = "uploads/food_images"
    CONFIDENCE_THRESHOLD: float = 0.45
    MODEL_PATH: str = "ml/models/food_classifier.keras"
    MODEL_META_PATH: str = "ml/models/model_meta.json"

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def anchor_sqlite_path(cls, value: str) -> str:
        prefix = "sqlite:///"
        if not value.startswith(prefix) or value == "sqlite:///:memory:":
            return value
        raw_path = value[len(prefix):]
        if not raw_path or Path(raw_path).is_absolute():
            return value
        return prefix + (BASE_DIR / raw_path).resolve().as_posix()

    @property
    def upload_dir_path(self) -> Path:
        path = BASE_DIR / self.UPLOAD_DIR
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def model_file_path(self) -> Path:
        return BASE_DIR / self.MODEL_PATH

    @property
    def model_meta_path(self) -> Path:
        return BASE_DIR / self.MODEL_META_PATH


settings = Settings()
