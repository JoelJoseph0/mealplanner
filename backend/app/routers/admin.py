import json
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, Depends, Query, status, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.models.food import Food
from app.models.nutrition import Nutrition
from app.models.recipe import Recipe
from app.models.recognition import Recognition
from app.models.meal_plan import MealPlan
from app.models.meal_history import MealHistory
from app.models.pantry_item import PantryItem
from app.schemas.user import UserResponse, AdminUserUpdate
from pydantic import BaseModel, Field
from app.schemas.food import FoodCreate, FoodUpdate, FoodWithNutritionResponse
from app.schemas.nutrition import NutritionCreate, NutritionUpdate, NutritionResponse
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse
from app.services.food_service import create_food, update_food, delete_food
from app.services.nutrition_service import create_nutrition, update_nutrition, delete_nutrition
from app.services.recipe_service import create_recipe, update_recipe, delete_recipe
from app.services.analytics_service import build_reports, recent_activity, model_summary
from app.utils.helpers import api_response
from app.utils.validators import validate_image_file
from app.utils.file_handler import save_upload_file

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard")
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Retrieve overarching system analytics and usage statistics."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_foods = db.query(func.count(Food.id)).filter(Food.is_active == True).scalar() or 0
    total_recipes = db.query(func.count(Recipe.id)).scalar() or 0
    total_recognitions = db.query(func.count(Recognition.id)).scalar() or 0
    total_meal_plans = db.query(func.count(MealPlan.id)).scalar() or 0

    # Most recognized foods
    most_recognized = (
        db.query(Recognition.predicted_name, func.count(Recognition.id).label("count"))
        .group_by(Recognition.predicted_name)
        .order_by(func.count(Recognition.id).desc())
        .limit(5)
        .all()
    )

    # Average recognition confidence
    avg_confidence = db.query(func.avg(Recognition.confidence)).scalar() or 0.0

    # User activity distribution (active vs inactive)
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    total_pantry_items = db.query(func.count(PantryItem.id)).scalar() or 0
    users_with_pantry = db.query(func.count(func.distinct(PantryItem.user_id))).scalar() or 0
    top_pantry = (
        db.query(Food.name, func.count(PantryItem.id).label("count"))
        .join(PantryItem, PantryItem.food_id == Food.id)
        .group_by(Food.name)
        .order_by(func.count(PantryItem.id).desc())
        .limit(5)
        .all()
    )

    return api_response(
        data={
            "statistics": {
                "total_users": total_users,
                "active_users": active_users,
                "total_foods": total_foods,
                "total_ingredients": total_foods,
                "total_recipes": total_recipes,
                "total_recognitions": total_recognitions,
                "total_meal_plans": total_meal_plans,
                "total_pantry_items": total_pantry_items,
                "users_with_pantry": users_with_pantry,
                "avg_recognition_confidence": round(float(avg_confidence), 3)
            },
            "top_recognized_foods": [
                {"food_name": item[0], "recognition_count": item[1]}
                for item in most_recognized
            ],
            "top_pantry_ingredients": [
                {"name": item[0], "count": item[1]}
                for item in top_pantry
            ],
            "recent_activity": recent_activity(db),
            "model": model_summary()
        },
        message="Dashboard analytics retrieved successfully"
    )


@router.get("/users")
def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List registered users with profile metadata."""
    users = db.query(User).offset(skip).limit(limit).all()
    return api_response(
        data=[UserResponse.model_validate(u) for u in users],
        message="Users list retrieved successfully"
    )


@router.delete("/users/{user_id}")
def delete_user_account(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Remove user account and cascaded records."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own active account"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    db.delete(user)
    db.commit()
    return api_response(message=f"User account {user_id} successfully deleted")


@router.put("/users/{user_id}")
def update_user_account(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Activate, deactivate or change the role of a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
    if user.id == admin.id and (payload.is_active is False or payload.role == "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate or demote your own account")
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role
    db.commit()
    db.refresh(user)
    return api_response(data=UserResponse.model_validate(user), message="User account updated")


class CategoryRename(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    new_name: str = Field(..., min_length=2, max_length=100)


@router.get("/categories")
def list_food_categories(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List ingredient categories with how many catalog items use each."""
    rows = (
        db.query(Food.category, func.count(Food.id))
        .group_by(Food.category)
        .order_by(Food.category)
        .all()
    )
    return api_response(
        data=[{"name": name, "count": count} for name, count in rows if name],
        message="Categories retrieved successfully"
    )


@router.put("/categories")
def rename_food_category(
    payload: CategoryRename,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Rename a category, or merge it into another by giving an existing name."""
    old_name = payload.name.strip()
    new_name = " ".join(payload.new_name.split())
    updated = (
        db.query(Food)
        .filter(Food.category == old_name)
        .update({Food.category: new_name}, synchronize_session=False)
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Category '{old_name}' not found")
    db.commit()
    return api_response(data={"updated": updated, "name": new_name}, message=f"Moved {updated} ingredient{'s' if updated != 1 else ''} to {new_name}")


EVALUATION_REPORT = Path(__file__).resolve().parent.parent.parent / "ml" / "evaluation" / "report.json"


@router.get("/model-evaluation")
def model_evaluation(admin: User = Depends(require_admin)):
    """Return the latest test-set evaluation: accuracy, per-class precision, recall, F1 and the confusion matrix."""
    if not EVALUATION_REPORT.exists():
        return api_response(data={"available": False, "model": model_summary()}, message="No evaluation report yet")
    with open(EVALUATION_REPORT, "r", encoding="utf-8") as f:
        report = json.load(f)
    per_class = [
        {
            "name": name,
            "precision": round(values.get("precision", 0.0), 4),
            "recall": round(values.get("recall", 0.0), 4),
            "f1": round(values.get("f1-score", 0.0), 4),
            "support": int(values.get("support", 0)),
        }
        for name, values in (report.get("classification_report") or {}).items()
        if isinstance(values, dict) and name not in ("accuracy", "macro avg", "weighted avg")
    ]
    return api_response(
        data={
            "available": True,
            "accuracy": report.get("accuracy"),
            "top3_accuracy": report.get("top3_accuracy"),
            "precision_macro": report.get("precision_macro"),
            "recall_macro": report.get("recall_macro"),
            "f1_macro": report.get("f1_macro"),
            "precision_weighted": report.get("precision_weighted"),
            "recall_weighted": report.get("recall_weighted"),
            "f1_weighted": report.get("f1_weighted"),
            "test_images": report.get("test_images"),
            "class_names": report.get("class_names") or [row["name"] for row in per_class],
            "confusion_matrix": report.get("confusion_matrix"),
            "most_confused": report.get("most_confused") or [],
            "evaluated_at": report.get("evaluated_at"),
            "per_class": per_class,
            "model": model_summary(),
        },
        message="Model evaluation retrieved successfully"
    )


# Food management endpoints under admin prefix
@router.post("/foods", status_code=status.HTTP_201_CREATED)
def admin_create_food(
    food_in: FoodCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    new_food = create_food(db, food_in)
    return api_response(
        data=FoodWithNutritionResponse.model_validate(new_food),
        message="Food item created successfully"
    )


@router.put("/foods/{food_id}")
def admin_update_food(
    food_id: int,
    food_in: FoodUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    updated = update_food(db, food_id, food_in)
    return api_response(
        data=FoodWithNutritionResponse.model_validate(updated),
        message="Food item updated successfully"
    )


@router.delete("/foods/{food_id}")
def admin_delete_food(
    food_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    delete_food(db, food_id)
    return api_response(message=f"Food item {food_id} deleted successfully")


# Nutrition management endpoints under admin prefix
@router.post("/nutrition", status_code=status.HTTP_201_CREATED)
def admin_create_nutrition(
    nutrition_in: NutritionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    new_nutrition = create_nutrition(db, nutrition_in)
    return api_response(
        data=NutritionResponse.model_validate(new_nutrition),
        message="Nutrition record created successfully"
    )


@router.put("/nutrition/{nutrition_id}")
def admin_update_nutrition(
    nutrition_id: int,
    nutrition_in: NutritionUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    updated = update_nutrition(db, nutrition_id, nutrition_in)
    return api_response(
        data=NutritionResponse.model_validate(updated),
        message="Nutrition record updated successfully"
    )


@router.delete("/nutrition/{nutrition_id}")
def admin_delete_nutrition(
    nutrition_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    delete_nutrition(db, nutrition_id)
    return api_response(message=f"Nutrition record {nutrition_id} deleted successfully")


# Recipe management endpoints under admin prefix
@router.post("/recipes", status_code=status.HTTP_201_CREATED)
def admin_create_recipe(
    recipe_in: RecipeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    new_recipe = create_recipe(db, recipe_in)
    return api_response(
        data=RecipeResponse.model_validate(new_recipe),
        message="Recipe created successfully"
    )


@router.put("/recipes/{recipe_id}")
def admin_update_recipe(
    recipe_id: int,
    recipe_in: RecipeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    updated = update_recipe(db, recipe_id, recipe_in)
    return api_response(
        data=RecipeResponse.model_validate(updated),
        message="Recipe updated successfully"
    )


@router.delete("/recipes/{recipe_id}")
def admin_delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    delete_recipe(db, recipe_id)
    return api_response(message=f"Recipe {recipe_id} deleted successfully")


@router.post("/upload-image", status_code=status.HTTP_201_CREATED)
async def upload_recipe_image(
    file: UploadFile = File(..., description="Recipe photo (JPG, PNG or WebP, up to 10 MB)"),
    admin: User = Depends(require_admin)
):
    """Validate and store a recipe photo, returning the URL to save on the recipe."""
    image_bytes = await validate_image_file(file)
    _, image_url = save_upload_file(image_bytes, file.filename or "recipe.jpg")
    return api_response(data={"image_url": image_url}, message="Image uploaded successfully")


@router.get("/reports")
def get_admin_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Generate consolidated system report on dietary distribution, user feedback, and CV precision."""
    return api_response(
        data=build_reports(db),
        message="Consolidated report generated successfully"
    )
