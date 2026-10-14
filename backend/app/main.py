import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import Base, engine
from app.schema_upgrade import ensure_schema
from app.routers import (
    auth_router,
    users_router,
    foods_router,
    ingredients_router,
    pantry_router,
    shopping_router,
    recognition_router,
    nutrition_router,
    recipes_router,
    recommendations_router,
    meal_plans_router,
    history_router,
    admin_router,
)
from app.computer_vision.model_loader import get_model_loader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("meal_planner")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for application startup and shutdown tasks."""
    logger.info("Initializing Smart Meal Planner backend...")

    # Ensure database schema exists
    try:
        Base.metadata.create_all(bind=engine)
        ensure_schema(engine)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Ensure upload directory exists
    settings.upload_dir_path.mkdir(parents=True, exist_ok=True)

    # Preload computer-vision model in background
    try:
        loader = get_model_loader()
        logger.info(f"Loaded CV model with {len(loader.get_class_names())} ingredient classes.")
    except Exception as e:
        logger.warning(f"Note on CV model preload: {e}")

    yield

    logger.info("Shutting down Smart Meal Planner backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=(
        "Production-style backend REST API for Smart Meal Planner Using Computer Vision. "
        "Tell it which ingredients you have (typed or scanned with the camera) and it finds recipes "
        "you can cook, lists what is missing, and plans balanced meals around your pantry. "
        "Built with FastAPI, PostgreSQL, SQLAlchemy, Alembic, and TensorFlow."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# ---------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Static Files for Uploaded Food Images
# ---------------------------------------------------------
upload_dir = str(settings.upload_dir_path.resolve())
app.mount("/uploads/food_images", StaticFiles(directory=upload_dir), name="uploads")

# ---------------------------------------------------------
# Centralized Exception Handlers
# ---------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail if isinstance(exc.detail, str) else "HTTP Exception",
            "data": None
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"{field}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error: " + "; ".join(error_messages),
            "data": [
                {"loc": list(err.get("loc", [])), "msg": err.get("msg", "Invalid value"), "type": err.get("type")}
                for err in exc.errors()
            ]
        }
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "A database error occurred. Please contact the administrator.",
            "data": None
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "data": None
        }
    )

# ---------------------------------------------------------
# Health Check Endpoint
# ---------------------------------------------------------
@app.get("/health", tags=["Health"])
def health_check():
    """Service health inspection endpoint."""
    return {"status": "healthy"}


# ---------------------------------------------------------
# Include API Routers under /api
# ---------------------------------------------------------
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(foods_router, prefix="/api")
app.include_router(ingredients_router, prefix="/api")
app.include_router(pantry_router, prefix="/api")
app.include_router(shopping_router, prefix="/api")
app.include_router(recognition_router, prefix="/api")
app.include_router(nutrition_router, prefix="/api")
app.include_router(recipes_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")
app.include_router(meal_plans_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
