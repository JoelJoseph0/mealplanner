import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import numpy as np
import tensorflow as tf
from ml.evaluation.metrics import calculate_evaluation_metrics
from ml.evaluation.confusion_matrix import generate_confusion_matrix
from ml.training.calibration import apply_temperature, collect_predictions, expected_calibration_error
from ml.training.train import (
    CANDIDATES_DIR,
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


def _load_meta(meta_file: Path):
    if meta_file.exists():
        with open(meta_file, "r", encoding="utf-8") as f:
            meta = json.load(f)
        if meta.get("class_names"):
            return meta["class_names"], meta
    with open(CLASS_NAMES_FILE, "r", encoding="utf-8") as f:
        return json.load(f), {}


def _accuracy(probabilities: np.ndarray, labels: np.ndarray) -> float:
    return float((probabilities.argmax(axis=1) == labels).mean())


def evaluate_model(batch_size: int = 32, candidate: str = None, use_tta: bool = True):
    model_dir = CANDIDATES_DIR / candidate if candidate else MODEL_FILE.parent
    model_file = model_dir / MODEL_FILE.name
    meta_file = model_dir / META_FILE.name
    report_file = model_dir / "report.json" if candidate else REPORT_FILE
    matrix_file = model_dir / "confusion_matrix.png" if candidate else CONFUSION_MATRIX_FILE

    if not model_file.exists():
        print(f"Error: trained model {model_file} not found. Run ml/training/train.py first.")
        return None
    if not _has_image_files(TEST_DIR):
        print("Error: no test images in ml/dataset/test/<Ingredient Name>/. Run ml/training/prepare_dataset.py first.")
        return None

    class_names, meta = _load_meta(meta_file)
    ensure_class_folders(TEST_DIR, class_names)
    temperature = float(meta.get("temperature") or 1.0)

    print(f"--> Loading model from {model_file}...")
    model = tf.keras.models.load_model(str(model_file))
    test_ds = load_split(TEST_DIR, class_names, batch_size, shuffle=False, label_mode="int")

    single, y_true = collect_predictions(model, test_ds, use_tta=False)
    tta, _ = collect_predictions(model, test_ds, use_tta=True) if use_tta else (single, y_true)
    deployed = apply_temperature(tta, temperature)

    y_pred = deployed.argmax(axis=1).astype(int)
    top3 = np.argsort(deployed, axis=1)[:, -3:]
    top3_accuracy = float(np.mean([truth in row for truth, row in zip(y_true, top3)]))

    metrics = calculate_evaluation_metrics(y_true.tolist(), y_pred.tolist(), class_names)
    metrics["top3_accuracy"] = round(top3_accuracy, 4)
    metrics["test_images"] = int(len(y_true))
    metrics["single_view_accuracy"] = round(_accuracy(single, y_true), 4)
    metrics["tta_accuracy"] = round(_accuracy(tta, y_true), 4)
    metrics["uses_tta"] = use_tta
    metrics["temperature"] = round(temperature, 4)
    metrics["ece_uncalibrated"] = round(expected_calibration_error(tta, y_true), 4)
    metrics["ece_calibrated"] = round(expected_calibration_error(deployed, y_true), 4)
    metrics["architecture"] = meta.get("architecture")
    metrics["class_names"] = list(class_names)
    matrix = np.zeros((len(class_names), len(class_names)), dtype=int)
    for truth, guess in zip(y_true, y_pred):
        matrix[truth][guess] += 1
    metrics["confusion_matrix"] = matrix.tolist()
    pairs = [
        {"actual": class_names[i], "predicted": class_names[j], "count": int(matrix[i][j])}
        for i in range(len(class_names))
        for j in range(len(class_names))
        if i != j and matrix[i][j] > 0
    ]
    metrics["most_confused"] = sorted(pairs, key=lambda item: item["count"], reverse=True)[:8]
    metrics["evaluated_at"] = datetime.now(timezone.utc).isoformat()

    generate_confusion_matrix(y_true.tolist(), y_pred.tolist(), class_names, save_path=str(matrix_file))
    report_file.parent.mkdir(parents=True, exist_ok=True)
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    if meta:
        meta.update({
            "test_images": _count_images(TEST_DIR),
            "test_accuracy": metrics["accuracy"],
            "test_single_view_accuracy": metrics["single_view_accuracy"],
            "test_top3_accuracy": metrics["top3_accuracy"],
            "test_f1_macro": metrics["f1_macro"],
        })
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

    print("\n" + "=" * 50)
    print(f"MODEL EVALUATION SUMMARY ({candidate or 'live model'}, {meta.get('architecture')})")
    print("=" * 50)
    print(f"Test images:          {metrics['test_images']}")
    print(f"Single-view accuracy: {metrics['single_view_accuracy'] * 100:.2f}%")
    print(f"TTA accuracy:         {metrics['tta_accuracy'] * 100:.2f}%")
    print(f"Top-3 Accuracy:       {metrics['top3_accuracy'] * 100:.2f}%")
    print(f"Precision (Macro):    {metrics['precision_macro'] * 100:.2f}%")
    print(f"Recall (Macro):       {metrics['recall_macro'] * 100:.2f}%")
    print(f"F1-Score (Macro):     {metrics['f1_macro'] * 100:.2f}%")
    print(f"Calibration error:    {metrics['ece_uncalibrated']:.3f} -> {metrics['ece_calibrated']:.3f} (T={temperature:.2f})")
    print("=" * 50)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate the ingredient recognition model on the test set.")
    parser.add_argument("--candidate", help="Evaluate ml/models/candidates/<name> instead of the live model")
    parser.add_argument("--no-tta", action="store_true")
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()
    evaluate_model(batch_size=args.batch_size, candidate=args.candidate, use_tta=not args.no_tta)
