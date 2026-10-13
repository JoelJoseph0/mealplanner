from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.recognition_service import (
    process_and_recognize_food,
    get_user_recognition_history,
    get_recognition_by_id
)
from app.utils.helpers import api_response

router = APIRouter(prefix="/recognition", tags=["Recognition"])


@router.post("/predict")
async def predict_food_image(
    file: UploadFile = File(..., description="Ingredient image file (JPG, PNG, WebP <= 10MB)"),
    add_to_pantry: bool = Form(False, description="Save the recognised ingredient straight into the pantry"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts an uploaded ingredient photo, validates format/MIME/integrity, runs
    TensorFlow computer-vision inference, records result, and returns nutrition plus recipes using it.
    """
    result = await process_and_recognize_food(db, current_user.id, file, add_to_pantry=add_to_pantry)
    return api_response(
        data=result,
        message=result.get("message", "Prediction completed successfully")
    )


@router.get("/history")
def recognition_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all past food recognition predictions performed by current user."""
    history = get_user_recognition_history(db, current_user.id)
    return api_response(
        data=history,
        message="Recognition history retrieved successfully"
    )


@router.get("/{recognition_id}")
def single_recognition(
    recognition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details of a specific past recognition item."""
    item = get_recognition_by_id(db, recognition_id, current_user.id)
    return api_response(
        data=item,
        message="Recognition details retrieved successfully"
    )
