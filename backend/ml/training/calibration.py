from typing import Tuple
import numpy as np
import tensorflow as tf

CROP_FRACTION = 0.8


def collect_predictions(model: tf.keras.Model, dataset, use_tta: bool = True) -> Tuple[np.ndarray, np.ndarray]:
    """
    Return (probabilities, integer labels) for a batched dataset.
    With TTA each batch is also scored mirrored and centre-cropped, matching the
    three views the web app averages at inference time.
    """
    probabilities, labels = [], []
    for images, targets in dataset:
        views = [model(images, training=False)]
        if use_tta:
            views.append(model(tf.image.flip_left_right(images), training=False))
            size = tf.shape(images)[1:3]
            cropped = tf.image.central_crop(images, CROP_FRACTION)
            views.append(model(tf.image.resize(cropped, size, method="area"), training=False))
        probabilities.append(tf.reduce_mean(tf.stack(views), axis=0).numpy())
        targets = targets.numpy()
        labels.append(targets.argmax(axis=1) if targets.ndim == 2 else targets)
    return np.concatenate(probabilities).astype(np.float64), np.concatenate(labels).astype(int)


def apply_temperature(probabilities: np.ndarray, temperature: float) -> np.ndarray:
    logits = np.log(np.clip(probabilities, 1e-12, 1.0)) / temperature
    logits -= logits.max(axis=1, keepdims=True)
    exp = np.exp(logits)
    return exp / exp.sum(axis=1, keepdims=True)


def negative_log_likelihood(probabilities: np.ndarray, labels: np.ndarray) -> float:
    picked = probabilities[np.arange(len(labels)), labels]
    return float(-np.mean(np.log(np.clip(picked, 1e-12, 1.0))))


def fit_temperature(probabilities: np.ndarray, labels: np.ndarray) -> float:
    """Pick the temperature that minimises validation negative log-likelihood."""
    grid = np.concatenate([np.linspace(0.3, 1.0, 36), np.linspace(1.05, 3.0, 40)])
    losses = [negative_log_likelihood(apply_temperature(probabilities, t), labels) for t in grid]
    return float(grid[int(np.argmin(losses))])


def expected_calibration_error(probabilities: np.ndarray, labels: np.ndarray, bins: int = 10) -> float:
    """Average gap between confidence and accuracy across equal-width confidence bins."""
    confidences = probabilities.max(axis=1)
    correct = (probabilities.argmax(axis=1) == labels).astype(float)
    edges = np.linspace(0.0, 1.0, bins + 1)
    error = 0.0
    for low, high in zip(edges[:-1], edges[1:]):
        mask = (confidences > low) & (confidences <= high)
        if mask.any():
            error += mask.mean() * abs(correct[mask].mean() - confidences[mask].mean())
    return float(error)
