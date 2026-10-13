from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.ingredient_service import search_ingredients, list_categories
from app.utils.helpers import api_response

router = APIRouter(prefix="/ingredients", tags=["Ingredients"])


@router.get("")
def find_ingredients(
    search: Optional[str] = Query(None, description="Name or alias to search, e.g. tomato or thakkali"),
    category: Optional[str] = Query(None, description="Restrict to one ingredient category"),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = search_ingredients(db, query=search, category=category, limit=limit)
    return api_response(data=results, message="Ingredients retrieved successfully")


@router.get("/categories")
def ingredient_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return api_response(data=list_categories(db), message="Ingredient categories retrieved successfully")
