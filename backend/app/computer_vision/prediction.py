from typing import Dict, Any
import numpy as np
from app.config import settings
from app.computer_vision.model_loader import get_model_loader

TOP_CANDIDATES = 3


def predict_food(preprocessed_image: np.ndarray) -> Dict[str, Any]:
    """
    Execute model inference on preprocessed image batch and return classification result.
    Applies confidence threshold validation.
    """
    loader = get_model_loader()
    model = loader.get_model()
    class_names = loader.get_class_names()

    # Model inference
    predictions = model.predict(preprocessed_image, verbose=0)
    probabilities = predictions[0]

    ranked_indices = [int(i) for i in np.argsort(probabilities)[::-1][:TOP_CANDIDATES]]
    candidates = [
        {"name": class_names[i], "confidence": round(float(probabilities[i]), 3)}
        for i in ranked_indices
        if i < len(class_names)
    ]

    top_index = int(np.argmax(probabilities))
    confidence = float(probabilities[top_index])

    # Check against configurable threshold
    if confidence < settings.CONFIDENCE_THRESHOLD:
        return {
            "food_name": "Unknown",
            "confidence": round(confidence, 3),
            "is_low_confidence": True,
            "candidates": candidates,
            "message": "Prediction confidence is too low. Pick the right ingredient from the suggestions or type it in."
        }

    predicted_food_name = class_names[top_index] if top_index < len(class_names) else "Unknown"

    return {
        "food_name": predicted_food_name,
        "confidence": round(confidence, 3),
        "is_low_confidence": False,
        "candidates": candidates,
        "message": "Prediction successful"
    }
