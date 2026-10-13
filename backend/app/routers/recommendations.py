from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.recommendation import RecommendationRequest
from app.schemas.recipe import RecipeResponse
from app.services.recommendation_service import get_recommendations_for_user
from app.utils.helpers import api_response

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("")
def get_recommendations(
    request: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate personalized recipe recommendations using rule-based filtering
    (zero allergen tolerance, diet type adherence, avoided foods removal)
    and multi-factor scoring (calories, protein, user preferences, recognized food match).
    """
    result = get_recommendations_for_user(db, current_user.id, request)

    # Format recommendations for API serialization
    formatted_recs = []
    for item in result["recommendations"]:
        formatted_recs.append({
            "recipe": RecipeResponse.model_validate(item["recipe"]),
            "score": item["score"],
            "match_reasons": item["match_reasons"],
            "diet_compatible": item["diet_compatible"],
            "allergy_safe": item["allergy_safe"],
            "pantry_coverage": item.get("pantry_coverage")
        })

    return api_response(
        data={
            "total_evaluated": result["total_evaluated"],
            "recommendations": formatted_recs
        },
        message="Recommendations generated successfully"
    )
