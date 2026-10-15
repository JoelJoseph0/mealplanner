from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.dietary_profile import DietaryProfile
from app.schemas.meal_plan import (
    MealPlanGenerateRequest,
    MealPlanWeekGenerateRequest,
)
from app.schemas.recipe import RecipeResponse
from app.services.meal_planner_service import (
    get_daily_meal_plan,
    generate_daily_meal_plan,
    get_weekly_meal_plan,
    generate_weekly_meal_plan,
    swap_meal,
    set_meal_locked,
    set_meal_completed,
    set_meal_skipped,
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/meal-plans", tags=["Meal Plans"])

MEAL_TIMES = {
    "Breakfast": "08:30 AM",
    "Morning Snack": "11:00 AM",
    "Lunch": "01:30 PM",
    "Evening Snack": "05:00 PM",
    "Dinner": "08:00 PM",
}


class LockRequest(BaseModel):
    locked: bool = True


class SkipRequest(BaseModel):
    skipped: bool = True


class CompleteRequest(BaseModel):
    completed: bool = True


class SwapRequest(BaseModel):
    use_pantry: bool = False


def _serialize_item(item) -> dict:
    rec = item.recipe
    servings = item.servings or 1
    return {
        "id": item.id,
        "plan_date": item.plan_date,
        "meal_type": item.meal_type,
        "meal_time": MEAL_TIMES.get(item.meal_type, "12:00 PM"),
        "food_name": rec.name,
        "recipe_id": item.recipe_id,
        "servings": servings,
        "created_at": item.created_at,
        "image": rec.image_url,
        "calories": round((rec.calories or 0.0) * servings, 1),
        "protein": round((rec.protein or 0.0) * servings, 1),
        "carbohydrates": round((rec.carbohydrates or 0.0) * servings, 1),
        "fat": round((rec.fat or 0.0) * servings, 1),
        "fiber": round((rec.fiber or 0.0) * servings, 1),
        "completed": bool(item.completed),
        "skipped": bool(getattr(item, "skipped", False)),
        "locked": bool(item.locked),
        "recipe": RecipeResponse.model_validate(rec),
    }


def _serialize_daily_plan(plan_dict: dict, user_profile: Optional[DietaryProfile] = None) -> dict:
    serialized_meals = {}
    meals_list = []

    for slot, item in plan_dict["meals"].items():
        if item is not None and item.recipe is not None:
            meal_data = _serialize_item(item)
            serialized_meals[slot] = meal_data
            meals_list.append(meal_data)
        else:
            serialized_meals[slot] = None

    target = {
        "calories": user_profile.daily_calories if (user_profile and user_profile.daily_calories) else 2000.0,
        "protein": user_profile.protein_target if (user_profile and user_profile.protein_target) else 75.0,
        "carbohydrates": user_profile.carbohydrate_target if (user_profile and user_profile.carbohydrate_target) else 250.0,
        "fat": user_profile.fat_target if (user_profile and user_profile.fat_target) else 65.0,
    }

    return {
        "date": plan_dict["date"],
        "meals": serialized_meals,
        "meals_list": meals_list,
        "totals": plan_dict["totals"],
        "target": target,
        "generated": bool(plan_dict.get("generated", bool(meals_list))),
    }


def _serialize_week(plan: dict, profile: Optional[DietaryProfile]) -> dict:
    serialized_days = {day: _serialize_daily_plan(day_plan, profile) for day, day_plan in plan["days"].items()}
    return {
        "start_date": plan["start_date"],
        "end_date": plan["end_date"],
        "days": serialized_days,
        "weekly_average_calories": plan["weekly_average_calories"],
        "weekly_totals": plan.get("weekly_totals", {}),
        "generated": any(day["generated"] for day in serialized_days.values()),
    }


def _profile(db: Session, user_id: int) -> Optional[DietaryProfile]:
    return db.query(DietaryProfile).filter(DietaryProfile.user_id == user_id).first()


@router.get("/daily")
def get_daily_plan(
    target_date: Optional[str] = Query(None, description="Plan date (YYYY-MM-DD or ISO string), defaults to today"),
    date: Optional[str] = Query(None, description="Plan date alias"),
    timezone: Optional[str] = Query(None, description="User client timezone, e.g. Asia/Kolkata or America/New_York"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve the stored daily plan. A plan is only created when the user generates one."""
    plan = get_daily_meal_plan(db, current_user.id, target_date=target_date or date, user_tz=timezone)
    return api_response(
        data=_serialize_daily_plan(plan, _profile(db, current_user.id)),
        message="Daily meal plan retrieved successfully"
    )


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
@router.post("/generate")
def create_daily_plan(
    request: Optional[MealPlanGenerateRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or refresh the 5-meal daily plan; locked meals are kept when refreshing."""
    plan = generate_daily_meal_plan(
        db,
        current_user.id,
        target_date=request.plan_date if request else None,
        user_tz=request.timezone if request else None,
        force_regenerate=request.force_regenerate if request else True,
        use_pantry=request.use_pantry if request else False
    )
    return api_response(
        data=_serialize_daily_plan(plan, _profile(db, current_user.id)),
        message="Daily meal plan generated successfully"
    )


@router.get("/weekly")
def get_weekly_plan(
    start_date: Optional[str] = Query(None, description="Start date (Monday or YYYY-MM-DD), defaults to current week"),
    timezone: Optional[str] = Query(None, description="User client timezone, e.g. Asia/Kolkata or America/New_York"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve the stored 7-day plan. Days stay empty until the user generates a plan."""
    plan = get_weekly_meal_plan(db, current_user.id, start_date=start_date, user_tz=timezone)
    return api_response(
        data=_serialize_week(plan, _profile(db, current_user.id)),
        message="Weekly meal plan retrieved successfully"
    )


@router.post("/generate-week")
def create_weekly_plan(
    request: MealPlanWeekGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or refresh the 7-day plan without unnecessary repetition; locked meals are kept."""
    plan = generate_weekly_meal_plan(
        db,
        current_user.id,
        start_date=request.start_date,
        user_tz=request.timezone,
        force_regenerate=request.force_regenerate,
        use_pantry=request.use_pantry
    )
    return api_response(
        data=_serialize_week(plan, _profile(db, current_user.id)),
        message="Weekly meal plan generated successfully"
    )


@router.post("/{plan_id}/swap")
def swap_planned_meal(
    plan_id: int,
    request: Optional[SwapRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Replace one planned meal with another suitable recipe for the same slot."""
    item = swap_meal(db, current_user.id, plan_id, use_pantry=request.use_pantry if request else False)
    return api_response(data=_serialize_item(item), message="Meal swapped successfully")


@router.put("/{plan_id}/lock")
def lock_planned_meal(
    plan_id: int,
    request: LockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lock a meal so regenerating the plan keeps it."""
    item = set_meal_locked(db, current_user.id, plan_id, request.locked)
    return api_response(data=_serialize_item(item), message="Meal lock updated")


@router.put("/{plan_id}/complete")
def complete_planned_meal(
    plan_id: int,
    request: CompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a planned meal as eaten; it is added to (or removed from) the meal history."""
    item = set_meal_completed(db, current_user.id, plan_id, request.completed)
    return api_response(data=_serialize_item(item), message="Meal completion updated")


@router.put("/{plan_id}/skip")
def skip_planned_meal(
    plan_id: int,
    request: SkipRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a planned meal as skipped so it is recorded and ranked lower in future plans."""
    item = set_meal_skipped(db, current_user.id, plan_id, request.skipped)
    return api_response(data=_serialize_item(item), message="Meal skip updated")
