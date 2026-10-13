import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import tensorflow as tf
from ml.training.transfer_learning import build_transfer_learning_model, unfreeze_for_fine_tuning

DATASET_DIR = BASE_DIR / "ml" / "dataset"
MODELS_DIR = BASE_DIR / "ml" / "models"
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


def train_food_classifier(
    epochs_head: int = 15,
    epochs_fine_tune: int = 10,
    batch_size: int = 32,
    architecture: str = "MobileNetV3Large",
    use_pretrained: bool = True,
):
    tf.keras.utils.set_random_seed(42)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
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

    model, backbone_source = build_transfer_learning_model(
        num_classes=num_classes,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
        architecture=architecture,
        use_pretrained=use_pretrained,
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor="val_accuracy", patience=4, restore_best_weights=True, mode="max"
    )

    print(f"\n--> Phase 1: training the classification head ({backbone_source} backbone)...")
    head_epochs = epochs_head if backbone_source == "imagenet" else epochs_head + epochs_fine_tune
    history = model.fit(train_ds, validation_data=val_ds, epochs=head_epochs, callbacks=[early_stop], verbose=2)
    epochs_run = len(history.history.get("loss", []))

    if backbone_source == "imagenet" and epochs_fine_tune > 0:
        print("\n--> Phase 2: fine-tuning the top of the backbone...")
        model = unfreeze_for_fine_tuning(model, unfreeze_layers=30, learning_rate=1e-5)
        fine_stop = tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=3, restore_best_weights=True, mode="max"
        )
        fine_history = model.fit(train_ds, validation_data=val_ds, epochs=epochs_fine_tune, callbacks=[fine_stop], verbose=2)
        epochs_run += len(fine_history.history.get("loss", []))

    val_loss, val_accuracy = model.evaluate(val_ds, verbose=0)

    model.save(str(MODEL_FILE))
    with open(CLASS_NAMES_FILE, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)

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
        "validation_accuracy": round(float(val_accuracy), 4),
        "validation_loss": round(float(val_loss), 4),
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tensorflow_version": tf.__version__,
    }
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[OK] Saved trained model to {MODEL_FILE}")
    print(f"[OK] Validation accuracy: {val_accuracy * 100:.2f}% over {num_classes} classes")
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the ingredient recognition model.")
    parser.add_argument("--epochs-head", type=int, default=15)
    parser.add_argument("--epochs-fine-tune", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--architecture", default="MobileNetV3Large", choices=["MobileNetV3Small", "MobileNetV3Large"])
    parser.add_argument("--from-scratch", action="store_true")
    args = parser.parse_args()
    train_food_classifier(
        epochs_head=args.epochs_head,
        epochs_fine_tune=args.epochs_fine_tune,
        batch_size=args.batch_size,
        architecture=args.architecture,
        use_pretrained=not args.from_scratch,
    )
