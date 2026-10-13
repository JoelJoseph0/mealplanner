import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import numpy as np
import tensorflow as tf
from ml.evaluation.metrics import calculate_evaluation_metrics
from ml.evaluation.confusion_matrix import generate_confusion_matrix
from ml.training.train import (
    CLASS_NAMES_FILE,
    META_FILE,
    MODEL_FILE,
    ensure_class_folders,
    load_split,
    _has_image_files,
    _count_images,
)

TEST_DIR = BASE_DIR / "ml" / "dataset" / "test"
EVALUATION_DIR = BASE_DIR / "ml" / "evaluation"
REPORT_FILE = EVALUATION_DIR / "report.json"
CONFUSION_MATRIX_FILE = EVALUATION_DIR / "confusion_matrix.png"


def _load_class_names():
    if META_FILE.exists():
        with open(META_FILE, "r", encoding="utf-8") as f:
            meta = json.load(f)
        if meta.get("class_names"):
            return meta["class_names"], meta
    with open(CLASS_NAMES_FILE, "r", encoding="utf-8") as f:
        return json.load(f), {}


def evaluate_model(batch_size: int = 32):
    if not MODEL_FILE.exists():
        print(f"Error: trained model {MODEL_FILE} not found. Run ml/training/train.py first.")
        return None
    if not _has_image_files(TEST_DIR):
        print("Error: no test images in ml/dataset/test/<Ingredient Name>/. Run ml/training/prepare_dataset.py first.")
        return None

    class_names, meta = _load_class_names()
    ensure_class_folders(TEST_DIR, class_names)

    print(f"--> Loading model from {MODEL_FILE}...")
    model = tf.keras.models.load_model(str(MODEL_FILE))

    test_ds = load_split(TEST_DIR, class_names, batch_size, shuffle=False, label_mode="int")
    y_true = np.concatenate([labels.numpy() for _, labels in test_ds]).astype(int)
    probabilities = model.predict(test_ds, verbose=0)
    y_pred = np.argmax(probabilities, axis=1).astype(int)
    top3 = np.argsort(probabilities, axis=1)[:, -3:]
    top3_accuracy = float(np.mean([truth in row for truth, row in zip(y_true, top3)]))

    metrics = calculate_evaluation_metrics(y_true.tolist(), y_pred.tolist(), class_names)
    metrics["top3_accuracy"] = round(top3_accuracy, 4)
    metrics["test_images"] = int(len(y_true))

    generate_confusion_matrix(y_true.tolist(), y_pred.tolist(), class_names, save_path=str(CONFUSION_MATRIX_FILE))

    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    if meta:
        meta.update({
            "test_images": _count_images(TEST_DIR),
            "test_accuracy": metrics["accuracy"],
            "test_top3_accuracy": metrics["top3_accuracy"],
            "test_f1_macro": metrics["f1_macro"],
        })
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

    print("\n" + "=" * 50)
    print("MODEL EVALUATION SUMMARY")
    print("=" * 50)
    print(f"Test images:        {metrics['test_images']}")
    print(f"Accuracy:           {metrics['accuracy'] * 100:.2f}%")
    print(f"Top-3 Accuracy:     {metrics['top3_accuracy'] * 100:.2f}%")
    print(f"Precision (Macro):  {metrics['precision_macro'] * 100:.2f}%")
    print(f"Recall (Macro):     {metrics['recall_macro'] * 100:.2f}%")
    print(f"F1-Score (Macro):   {metrics['f1_macro'] * 100:.2f}%")
    print("=" * 50)
    return metrics


if __name__ == "__main__":
    evaluate_model()
