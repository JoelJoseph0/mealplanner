from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.nutrition import NutritionResponse


class RecognitionBase(BaseModel):
    predicted_name: str
    confidence: float


class PredictionCandidate(BaseModel):
    name: str
    confidence: float
    food_id: Optional[int] = None


class PredictionResult(BaseModel):
    recognition_id: Optional[int] = None
    food_id: Optional[int] = None
    food_name: str
    confidence: float
    image_url: Optional[str] = None
    message: Optional[str] = None
    nutrition: Optional[NutritionResponse] = None
    candidates: List[PredictionCandidate] = Field(default_factory=list)
    in_pantry: bool = False
    added_to_pantry: bool = False


class RecognitionResponse(BaseModel):
    id: int
    food_image_id: int
    food_id: Optional[int] = None
    predicted_name: str
    confidence: float
    created_at: datetime
    image_url: Optional[str] = None
    nutrition: Optional[NutritionResponse] = None

    model_config = ConfigDict(from_attributes=True)
