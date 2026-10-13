from typing import List, Optional
from pydantic import BaseModel
from app.schemas.recipe import RecipeResponse


class RecommendationRequest(BaseModel):
    meal_type: Optional[str] = None
    recognized_food_name: Optional[str] = None
    recognized_food_id: Optional[int] = None
    target_calories: Optional[float] = None
    use_pantry: bool = True
    limit: Optional[int] = 5


class RecipeRecommendationItem(BaseModel):
    recipe: RecipeResponse
    score: float
    match_reasons: List[str]
    diet_compatible: bool
    allergy_safe: bool
    pantry_coverage: Optional[int] = None


class RecommendationResponse(BaseModel):
    total_evaluated: int
    recommendations: List[RecipeRecommendationItem]
