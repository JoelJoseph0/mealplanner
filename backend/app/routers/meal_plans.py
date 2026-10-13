from datetime import date
from typing import Optional, Union, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.dietary_profile import DietaryProfile
from app.schemas.meal_plan import (
    DailyMealPlanResponse,
    WeeklyMealPlanResponse,
    MealPlanGenerateRequest,
    MealPlanWeekGenerateRequest,
    MealPlanItemResponse
)
from app.schemas.recipe import RecipeResponse
from app.services.meal_planner_service import (
    get_daily_meal_plan,
    generate_daily_meal_plan,
    get_weekly_meal_plan,
    generate_weekly_meal_plan
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/meal-plans", tags=["Meal Plans"])


def _serialize_daily_plan(plan_dict: dict, user_profile: Optional[DietaryProfile] = None) -> dict:
    serialized_meals = {}
    meals_list = []
    
    meal_times = {
        "Breakfast": "08:30 AM",
        "Morning Snack": "11:00 AM",
        "Lunch": "01:30 PM",
        "Evening Snack": "05:00 PM",
        "Dinner": "08:00 PM",
    }

    for slot, item in plan_dict["meals"].items():
        if item is not None and item.recipe is not None:
            recipe_val = RecipeResponse.model_validate(item.recipe)
            servings = item.servings or 1
            rec = item.recipe
            meal_data = {
                "id": item.id,
                "plan_date": item.plan_date,
                "meal_type": item.meal_type,
                "meal_time": meal_times.get(item.meal_type, "12:00 PM"),
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
                "completed": False,
                "recipe": recipe_val
            }
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
        "target": target
    }


@router.get("/daily")
def get_daily_plan(
    target_date: Optional[str] = Query(None, description="Plan date (YYYY-MM-DD or ISO string), defaults to today"),
    date: Optional[str] = Query(None, description="Plan date alias"),
    timezone: Optional[str] = Query(None, description="User client timezone, e.g. Asia/Kolkata or America/New_York"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve daily meal plan with nutritional macro totals from actual recipes."""
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == current_user.id).first()
    plan = get_daily_meal_plan(db, current_user.id, target_date=target_date or date, user_tz=timezone)
    return api_response(
        data=_serialize_daily_plan(plan, profile),
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
    """Generate or regenerate personalized 5-meal daily plan using real recipes."""
    plan_date = request.plan_date if request else None
    timezone = request.timezone if request else None
    force_regenerate = request.force_regenerate if request else True
    use_pantry = request.use_pantry if request else False
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == current_user.id).first()
    plan = generate_daily_meal_plan(
        db,
        current_user.id,
        target_date=plan_date,
        user_tz=timezone,
        force_regenerate=force_regenerate,
        use_pantry=use_pantry
    )
    return api_response(
        data=_serialize_daily_plan(plan, profile),
        message="Daily meal plan generated successfully"
    )


@router.get("/weekly")
def get_weekly_plan(
    start_date: Optional[str] = Query(None, description="Start date (Monday or YYYY-MM-DD), defaults to current week"),
    timezone: Optional[str] = Query(None, description="User client timezone, e.g. Asia/Kolkata or America/New_York"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve weekly 7-day meal plan with exact nutritional summary from actual recipes."""
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == current_user.id).first()
    plan = get_weekly_meal_plan(db, current_user.id, start_date=start_date, user_tz=timezone)
    serialized_days = {day: _serialize_daily_plan(day_plan, profile) for day, day_plan in plan["days"].items()}

    return api_response(
        data={
            "start_date": plan["start_date"],
            "end_date": plan["end_date"],
            "days": serialized_days,
            "weekly_average_calories": plan["weekly_average_calories"],
            "weekly_totals": plan.get("weekly_totals", {})
        },
        message="Weekly meal plan retrieved successfully"
    )


@router.post("/generate-week")
def create_weekly_plan(
    request: MealPlanWeekGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate or regenerate complete 7-day balanced weekly meal plan without unnecessary repetition."""
    profile = db.query(DietaryProfile).filter(DietaryProfile.user_id == current_user.id).first()
    plan = generate_weekly_meal_plan(
        db,
        current_user.id,
        start_date=request.start_date,
        user_tz=request.timezone,
        force_regenerate=request.force_regenerate,
        use_pantry=request.use_pantry
    )
    serialized_days = {day: _serialize_daily_plan(day_plan, profile) for day, day_plan in plan["days"].items()}

    return api_response(
        data={
            "start_date": plan["start_date"],
            "end_date": plan["end_date"],
            "days": serialized_days,
            "weekly_average_calories": plan["weekly_average_calories"],
            "weekly_totals": plan.get("weekly_totals", {})
        },
        message="Weekly meal plan generated successfully"
    )
