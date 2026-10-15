import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import numpy as np
import tensorflow as tf
from ml.training.transfer_learning import build_transfer_learning_model, unfreeze_for_fine_tuning
from ml.training.calibration import (
    collect_predictions,
    expected_calibration_error,
    fit_temperature,
    apply_temperature,
)

DATASET_DIR = BASE_DIR / "ml" / "dataset"
MODELS_DIR = BASE_DIR / "ml" / "models"
CANDIDATES_DIR = MODELS_DIR / "candidates"
MODEL_FILE = MODELS_DIR / "food_classifier.keras"
META_FILE = MODELS_DIR / "model_meta.json"
CLASS_NAMES_FILE = BASE_DIR / "app" / "computer_vision" / "class_names.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
IMG_SIZE = (224, 224)
AUTOTUNE = tf.data.AUTOTUNE


def _has_image_files(directory: Path) -> bool:
    if not directory.exists():
        return False
    for _, _, files in os.walk(directory):
        if any(Path(f).suffix.lower() in IMAGE_EXTENSIONS for f in files):
            return True
    return False


def _count_images(directory: Path) -> int:
    if not directory.exists():
        return 0
    return sum(
        1
        for _, _, files in os.walk(directory)
        for f in files
        if Path(f).suffix.lower() in IMAGE_EXTENSIONS
    )


def discover_class_names(train_dir: Path):
    return sorted(p.name for p in train_dir.iterdir() if p.is_dir() and _has_image_files(p))


def ensure_class_folders(split_dir: Path, class_names):
    for name in class_names:
        (split_dir / name).mkdir(parents=True, exist_ok=True)


def load_split(directory: Path, class_names, batch_size: int, shuffle: bool, label_mode: str = "categorical"):
    dataset = tf.keras.utils.image_dataset_from_directory(
        str(directory),
        labels="inferred",
        label_mode=label_mode,
        class_names=class_names,
        image_size=IMG_SIZE,
        batch_size=batch_size,
        shuffle=shuffle,
        seed=42,
    )
    return dataset.map(lambda x, y: (x / 255.0, y), num_parallel_calls=AUTOTUNE)


def balanced_class_weights(train_dir: Path, class_names):
    """Inverse-frequency weights so ingredients with fewer photos are not ignored."""
    counts = np.array([_count_images(train_dir / name) for name in class_names], dtype=float)
    counts[counts == 0] = 1.0
    weights = counts.sum() / (len(counts) * counts)
    return {i: float(round(w, 4)) for i, w in enumerate(weights)}


def train_food_classifier(
    epochs_head: int = 15,
    epochs_fine_tune: int = 15,
    batch_size: int = 32,
    architecture: str = "MobileNetV3Large",
    use_pretrained: bool = True,
    label_smoothing: float = 0.1,
    unfreeze_layers: int = 60,
    fine_tune_lr: float = 3e-5,
    use_class_weights: bool = True,
    output_dir: Path = MODELS_DIR,
):
    tf.keras.utils.set_random_seed(42)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    model_file = output_dir / MODEL_FILE.name
    meta_file = output_dir / META_FILE.name
    train_dir = DATASET_DIR / "train"
    val_dir = DATASET_DIR / "validation"

    if not _has_image_files(train_dir):
        print(
            "--> No training images found in ml/dataset/train/<Ingredient Name>/.\n"
            "    Run `python ml/training/prepare_dataset.py` to download the ingredient dataset, "
            "or add your own photos, then run this script again."
        )
        return None

    class_names = discover_class_names(train_dir)
    num_classes = len(class_names)
    print(f"--> Training ingredient classifier for {num_classes} classes: {class_names}")

    if _has_image_files(val_dir):
        ensure_class_folders(val_dir, class_names)
        train_ds = load_split(train_dir, class_names, batch_size, shuffle=True)
        val_ds = load_split(val_dir, class_names, batch_size, shuffle=False)
    else:
        print("--> No validation folder found; holding out 15% of the training images for validation.")
        train_raw, val_raw = tf.keras.utils.image_dataset_from_directory(
            str(train_dir),
            labels="inferred",
            label_mode="categorical",
            class_names=class_names,
            image_size=IMG_SIZE,
            batch_size=batch_size,
            shuffle=True,
            seed=42,
            validation_split=0.15,
            subset="both",
        )
        train_ds = train_raw.map(lambda x, y: (x / 255.0, y), num_parallel_calls=AUTOTUNE)
        val_ds = val_raw.map(lambda x, y: (x / 255.0, y), num_parallel_calls=AUTOTUNE)

    train_ds = train_ds.cache().prefetch(AUTOTUNE)
    val_ds = val_ds.cache().prefetch(AUTOTUNE)
    class_weight = balanced_class_weights(train_dir, class_names) if use_class_weights else None
    loss = tf.keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing)

    model, backbone_source = build_transfer_learning_model(
        num_classes=num_classes,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
        architecture=architecture,
        use_pretrained=use_pretrained,
    )
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3), loss=loss, metrics=["accuracy"])

    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True, mode="max"),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-5, verbose=1),
    ]

    print(f"\n--> Phase 1: training the classification head ({backbone_source} backbone)...")
    head_epochs = epochs_head if backbone_source == "imagenet" else epochs_head + epochs_fine_tune
    history = model.fit(
        train_ds, validation_data=val_ds, epochs=head_epochs,
        callbacks=callbacks, class_weight=class_weight, verbose=2,
    )
    epochs_run = len(history.history.get("loss", []))

    if backbone_source == "imagenet" and epochs_fine_tune > 0:
        print(f"\n--> Phase 2: fine-tuning the top {unfreeze_layers} backbone layers...")
        steps = max(1, int(tf.data.experimental.cardinality(train_ds).numpy())) * epochs_fine_tune
        schedule = tf.keras.optimizers.schedules.CosineDecay(fine_tune_lr, decay_steps=steps, alpha=0.05)
        model = unfreeze_for_fine_tuning(
            model, unfreeze_layers=unfreeze_layers, learning_rate=schedule, label_smoothing=label_smoothing
        )
        fine_stop = tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=4, restore_best_weights=True, mode="max"
        )
        fine_history = model.fit(
            train_ds, validation_data=val_ds, epochs=epochs_fine_tune,
            callbacks=[fine_stop], class_weight=class_weight, verbose=2,
        )
        epochs_run += len(fine_history.history.get("loss", []))

    val_loss, val_accuracy = model.evaluate(val_ds, verbose=0)

    print("\n--> Calibrating confidence on the validation set...")
    raw_probs, val_labels = collect_predictions(model, val_ds, use_tta=False)
    tta_probs, _ = collect_predictions(model, val_ds, use_tta=True)
    temperature = fit_temperature(tta_probs, val_labels)
    calibrated = apply_temperature(tta_probs, temperature)
    val_accuracy_tta = float((tta_probs.argmax(axis=1) == val_labels).mean())
    print(
        f"    single view {float((raw_probs.argmax(axis=1) == val_labels).mean()) * 100:.2f}%, "
        f"with TTA {val_accuracy_tta * 100:.2f}%, temperature {temperature:.2f}, "
        f"ECE {expected_calibration_error(tta_probs, val_labels):.3f} -> {expected_calibration_error(calibrated, val_labels):.3f}"
    )

    model.save(str(model_file))

    metadata = {
        "trained": True,
        "model_file": MODEL_FILE.name,
        "architecture": architecture,
        "backbone_weights": backbone_source,
        "image_size": list(IMG_SIZE),
        "input_range": [0.0, 1.0],
        "class_names": class_names,
        "num_classes": num_classes,
        "train_images": _count_images(train_dir),
        "validation_images": _count_images(val_dir),
        "epochs_run": epochs_run,
        "label_smoothing": label_smoothing,
        "class_weights": bool(class_weight),
        "unfreeze_layers": unfreeze_layers,
        "validation_accuracy": round(float(val_accuracy), 4),
        "validation_accuracy_tta": round(val_accuracy_tta, 4),
        "validation_loss": round(float(val_loss), 4),
        "temperature": round(temperature, 4),
        "tta_views": ["full", "mirrored", "centre crop 80%"],
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tensorflow_version": tf.__version__,
    }
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    if output_dir.resolve() == MODELS_DIR.resolve():
        with open(CLASS_NAMES_FILE, "w", encoding="utf-8") as f:
            json.dump(class_names, f, indent=2)

    print(f"\n[OK] Saved trained model to {model_file}")
    print(f"[OK] Validation accuracy: {val_accuracy * 100:.2f}% ({val_accuracy_tta * 100:.2f}% with TTA) over {num_classes} classes")
    return model


def promote_candidate(candidate_dir: Path) -> None:
    """Copy a candidate model and its metadata over the live model used by the web app."""
    candidate_dir = Path(candidate_dir)
    shutil.copy2(candidate_dir / MODEL_FILE.name, MODEL_FILE)
    with open(candidate_dir / META_FILE.name, "r", encoding="utf-8") as f:
        meta = json.load(f)
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    with open(CLASS_NAMES_FILE, "w", encoding="utf-8") as f:
        json.dump(meta["class_names"], f, indent=2)
    print(f"[OK] Promoted {candidate_dir.name} to {MODEL_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the ingredient recognition model.")
    parser.add_argument("--epochs-head", type=int, default=15)
    parser.add_argument("--epochs-fine-tune", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument(
        "--architecture",
        default="MobileNetV3Large",
        choices=["MobileNetV3Small", "MobileNetV3Large"],
    )
    parser.add_argument("--from-scratch", action="store_true")
    parser.add_argument("--label-smoothing", type=float, default=0.1)
    parser.add_argument("--unfreeze-layers", type=int, default=60)
    parser.add_argument("--fine-tune-lr", type=float, default=3e-5)
    parser.add_argument("--no-class-weights", action="store_true")
    parser.add_argument("--candidate", help="Train into ml/models/candidates/<name> instead of replacing the live model")
    parser.add_argument("--promote", help="Copy ml/models/candidates/<name> over the live model and exit")
    args = parser.parse_args()

    if args.promote:
        promote_candidate(CANDIDATES_DIR / args.promote)
        sys.exit(0)

    train_food_classifier(
        epochs_head=args.epochs_head,
        epochs_fine_tune=args.epochs_fine_tune,
        batch_size=args.batch_size,
        architecture=args.architecture,
        use_pretrained=not args.from_scratch,
        label_smoothing=args.label_smoothing,
        unfreeze_layers=args.unfreeze_layers,
        fine_tune_lr=args.fine_tune_lr,
        use_class_weights=not args.no_class_weights,
        output_dir=CANDIDATES_DIR / args.candidate if args.candidate else MODELS_DIR,
    )
