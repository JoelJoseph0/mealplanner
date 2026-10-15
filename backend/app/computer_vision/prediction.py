from typing import Dict, Any, Optional
import numpy as np
from app.config import settings
from app.computer_vision.model_loader import get_model_loader

TOP_CANDIDATES = 3
AMBIGUITY_MARGIN = 0.15
AMBIGUITY_CEILING = 0.7


def calibrate(probabilities: np.ndarray, temperature: float) -> np.ndarray:
    """Temperature scaling on softmax outputs: softmax(log(p) / T)."""
    if not temperature or abs(temperature - 1.0) < 1e-6:
        return probabilities
    logits = np.log(np.clip(probabilities, 1e-12, 1.0)) / temperature
    logits -= logits.max(axis=-1, keepdims=True)
    exp = np.exp(logits)
    return exp / exp.sum(axis=-1, keepdims=True)


def averaged_probabilities(model, views: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    """Run every view in one batch, average the class probabilities, then calibrate."""
    outputs = model(views, training=False)
    probabilities = np.asarray(outputs, dtype=np.float64)
    if probabilities.ndim == 1:
        probabilities = probabilities[None, :]
    return calibrate(probabilities.mean(axis=0), temperature)


def predict_food(views: np.ndarray, threshold: Optional[float] = None) -> Dict[str, Any]:
    """
    Classify an ingredient from one or more preprocessed views of the same photo.
    Views are averaged (test-time augmentation) and confidences are temperature
    calibrated using the value fitted on the validation set during training.
    A prediction is rejected when the top confidence is under the threshold, and
    flagged as ambiguous when the top two classes are too close to call.
    """
    loader = get_model_loader()
    model = loader.get_model()
    class_names = loader.get_class_names()
    temperature = float(loader.get_metadata().get("temperature") or 1.0)
    cutoff = settings.CONFIDENCE_THRESHOLD if threshold is None else threshold

    probabilities = averaged_probabilities(model, views, temperature)
    ranked = [int(i) for i in np.argsort(probabilities)[::-1]]
    candidates = [
        {"name": class_names[i], "confidence": round(float(probabilities[i]), 3)}
        for i in ranked[:TOP_CANDIDATES]
        if i < len(class_names)
    ]

    top_index = ranked[0]
    confidence = float(probabilities[top_index])
    runner_up = float(probabilities[ranked[1]]) if len(ranked) > 1 else 0.0
    margin = confidence - runner_up
    is_ambiguous = confidence < AMBIGUITY_CEILING and margin < AMBIGUITY_MARGIN

    base = {
        "confidence": round(confidence, 3),
        "margin": round(margin, 3),
        "is_ambiguous": is_ambiguous,
        "candidates": candidates,
        "views": int(views.shape[0]),
        "temperature": round(temperature, 3),
    }

    if confidence < cutoff or top_index >= len(class_names):
        return {
            **base,
            "food_name": "Unknown",
            "is_low_confidence": True,
            "message": "We are not sure what this is. Pick the right ingredient from the suggestions or type it in.",
        }

    message = "Prediction successful"
    if is_ambiguous and len(candidates) > 1:
        message = f"This could be {candidates[0]['name']} or {candidates[1]['name']}. Please confirm which one."

    return {
        **base,
        "food_name": class_names[top_index],
        "is_low_confidence": False,
        "message": message,
    }
