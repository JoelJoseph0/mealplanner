from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from fastapi import UploadFile, HTTPException, status
from app.models.food_image import FoodImage
from app.models.recognition import Recognition
from app.models.food import Food
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.pantry_item import PantryItem
from app.recommendation.pantry_matcher import match_recipe, rank_matches
from app.services.ingredient_service import load_catalog, get_user_pantry_context
from app.utils.ingredient_parser import IngredientIndex
from app.schemas.nutrition import NutritionResponse
from app.schemas.recipe import RecipeResponse
from app.utils.validators import validate_image_file
from app.utils.file_handler import save_upload_file
from app.computer_vision.preprocessing import preprocess_image
from app.computer_vision.prediction import predict_food


def _candidate_payload(candidates: List[Dict[str, Any]], index: IngredientIndex) -> List[Dict[str, Any]]:
    payload = []
    for candidate in candidates or []:
        food_id = index.resolve(candidate["name"])
        payload.append({
            "name": index.name_of(food_id) if food_id is not None else candidate["name"],
            "confidence": candidate["confidence"],
            "food_id": food_id,
        })
    return payload


def _recipes_using_ingredient(db: Session, user_id: int, food: Food, limit: int = 4) -> List[Dict[str, Any]]:
    recipes = (
        db.query(Recipe)
        .join(RecipeIngredient, RecipeIngredient.recipe_id == Recipe.id)
        .filter(RecipeIngredient.food_id == food.id)
        .options(joinedload(Recipe.ingredient_links).joinedload(RecipeIngredient.food))
        .all()
    )
    if not recipes:
        return []
    context = get_user_pantry_context(db, user_id)
    context.pantry_ids.add(food.id)
    ranked = rank_matches([match_recipe(r, context) for r in recipes])[:limit]
    results = []
    for match in ranked:
        payload = RecipeResponse.model_validate(match.recipe).model_dump()
        payload["pantry_match"] = match.to_dict()
        results.append(payload)
    return results


def _ensure_in_pantry(db: Session, user_id: int, food_id: int) -> bool:
    existing = (
        db.query(PantryItem)
        .filter(PantryItem.user_id == user_id, PantryItem.food_id == food_id)
        .first()
    )
    if existing:
        return False
    db.add(PantryItem(user_id=user_id, food_id=food_id))
    db.commit()
    return True


async def process_and_recognize_food(
    db: Session,
    user_id: int,
    file: UploadFile,
    add_to_pantry: bool = False
) -> Dict[str, Any]:
    """
    Complete end-to-end computer-vision pipeline:
    1. Validates image extension, MIME type, size, and Pillow integrity
    2. Securely saves the image with a UUID filename
    3. Preprocesses with OpenCV/Pillow to 224x224 normalized tensor
    4. Runs TensorFlow inference through ModelLoader singleton
    5. Checks confidence threshold
    6. Maps prediction to Food and Nutrition tables in PostgreSQL
    7. Stores FoodImage and Recognition records in database
    """
    # 1. Validate image
    image_bytes = await validate_image_file(file)

    # 2. Save image securely
    file_path, image_url = save_upload_file(image_bytes, file.filename or "food.jpg")

    # 3. Create FoodImage record
    food_image = FoodImage(
        user_id=user_id,
        file_path=file_path,
        original_filename=file.filename or "food.jpg"
    )
    db.add(food_image)
    db.flush()

    # 4. Preprocess image
    tensor = preprocess_image(image_bytes)

    # 5. Model Inference
    pred = predict_food(tensor)
    _, index = load_catalog(db)
    candidates = _candidate_payload(pred.get("candidates", []), index)

    # 6. Handle low-confidence predictions
    if pred.get("is_low_confidence"):
        recognition = Recognition(
            food_image_id=food_image.id,
            food_id=None,
            predicted_name="Unknown",
            confidence=pred["confidence"]
        )
        db.add(recognition)
        db.commit()
        db.refresh(recognition)

        return {
            "recognition_id": recognition.id,
            "food_id": None,
            "food_name": "Unknown Ingredient",
            "confidence": pred["confidence"],
            "image_url": image_url,
            "category": "Unclassified",
            "serving_size": "N/A",
            "message": pred["message"],
            "nutrition": None,
            "candidates": candidates,
            "in_pantry": False,
            "added_to_pantry": False,
            "recommended_recipes": []
        }

    predicted_name = pred["food_name"]
    confidence = pred["confidence"]

    # 7. Map to database Food entity
    resolved_id = index.resolve(predicted_name)
    food = db.query(Food).filter(Food.id == resolved_id).first() if resolved_id is not None else None
    food_id = food.id if food else None

    # 8. Record Recognition in database
    recognition = Recognition(
        food_image_id=food_image.id,
        food_id=food_id,
        predicted_name=predicted_name,
        confidence=confidence
    )
    db.add(recognition)
    db.commit()
    db.refresh(recognition)

    nutrition_data = None
    if food and food.nutrition:
        nutrition_data = NutritionResponse.model_validate(food.nutrition).model_dump()

    added_to_pantry = _ensure_in_pantry(db, user_id, food.id) if (food and add_to_pantry) else False
    in_pantry = bool(food) and db.query(PantryItem).filter(
        PantryItem.user_id == user_id, PantryItem.food_id == food.id
    ).first() is not None
    recommended_recipes = _recipes_using_ingredient(db, user_id, food) if food else []

    return {
        "recognition_id": recognition.id,
        "food_id": food_id,
        "food_name": food.name if food else predicted_name,
        "confidence": confidence,
        "image_url": image_url,
        "category": food.category if food else "Unclassified",
        "serving_size": food.nutrition.serving_size if food and food.nutrition else "100g",
        "message": "Ingredient successfully recognized",
        "nutrition": nutrition_data,
        "candidates": candidates,
        "in_pantry": in_pantry,
        "added_to_pantry": added_to_pantry,
        "recommended_recipes": recommended_recipes
    }


def get_user_recognition_history(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Retrieve all past recognition attempts for the authenticated user."""
    recognitions = (
        db.query(Recognition)
        .join(FoodImage, Recognition.food_image_id == FoodImage.id)
        .filter(FoodImage.user_id == user_id)
        .order_by(Recognition.created_at.desc())
        .all()
    )

    results = []
    for r in recognitions:
        results.append({
            "id": r.id,
            "food_image_id": r.food_image_id,
            "food_id": r.food_id,
            "predicted_name": r.predicted_name,
            "food_name": r.food.name if r.food else r.predicted_name,
            "confidence": r.confidence,
            "created_at": r.created_at,
            "image_url": f"/uploads/food_images/{r.food_image.file_path.split('/')[-1].split(chr(92))[-1]}" if r.food_image else None,
            "nutrition": NutritionResponse.model_validate(r.food.nutrition).model_dump() if (r.food and r.food.nutrition) else None
        })
    return results


def get_recognition_by_id(db: Session, recognition_id: int, user_id: int) -> Dict[str, Any]:
    """Retrieve single recognition item by ID for the authorized user."""
    recognition = (
        db.query(Recognition)
        .join(FoodImage, Recognition.food_image_id == FoodImage.id)
        .filter(Recognition.id == recognition_id, FoodImage.user_id == user_id)
        .first()
    )
    if not recognition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recognition with ID {recognition_id} not found"
        )

    return {
        "id": recognition.id,
        "food_image_id": recognition.food_image_id,
        "food_id": recognition.food_id,
        "predicted_name": recognition.predicted_name,
        "confidence": recognition.confidence,
        "created_at": recognition.created_at,
        "image_url": f"/uploads/food_images/{recognition.food_image.file_path.split('/')[-1].split(chr(92))[-1]}" if recognition.food_image else None,
        "nutrition": NutritionResponse.model_validate(recognition.food.nutrition).model_dump() if (recognition.food and recognition.food.nutrition) else None
    }
