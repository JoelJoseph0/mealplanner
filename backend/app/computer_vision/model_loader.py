import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
import threading
import tensorflow as tf
from app.config import settings

logger = logging.getLogger(__name__)

DEFAULT_INGREDIENT_CLASSES = (
    "Apple", "Banana", "Carrot", "Cucumber", "Egg", "Garlic", "Ginger", "Green Chilli",
    "Lemon", "Onion", "Papaya", "Potato", "Spinach", "Tomato",
)


class ModelLoader:
    """Thread-safe singleton model loader for food classification."""
    _instance: Optional["ModelLoader"] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelLoader, cls).__new__(cls)
                cls._instance._model = None
                cls._instance._class_names = []
                cls._instance._metadata = {}
                cls._instance._is_trained = False
                cls._instance._load_metadata()
                cls._instance._load_class_names()
                cls._instance._load_model()
        return cls._instance

    def _load_metadata(self) -> None:
        meta_path = settings.model_meta_path
        self._metadata = {}
        if meta_path.exists():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error reading model metadata: {e}")

    def _load_class_names(self) -> None:
        """Load food category names from JSON."""
        if self._metadata.get("class_names"):
            self._class_names = list(self._metadata["class_names"])
            return
        class_names_path = Path(__file__).parent / "class_names.json"
        try:
            if class_names_path.exists():
                with open(class_names_path, "r", encoding="utf-8") as f:
                    self._class_names = json.load(f)
            else:
                self._class_names = list(DEFAULT_INGREDIENT_CLASSES)
        except Exception as e:
            logger.error(f"Error loading class names: {e}")
            self._class_names = list(DEFAULT_INGREDIENT_CLASSES)

    def _build_default_model(self, num_classes: int) -> tf.keras.Model:
        """Build MobileNet-inspired depthwise separable convolutional classifier."""
        inputs = tf.keras.Input(shape=(224, 224, 3))
        x = tf.keras.layers.Conv2D(32, (3, 3), strides=2, padding="same", use_bias=False)(inputs)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)

        x = tf.keras.layers.DepthwiseConv2D((3, 3), strides=2, padding="same", use_bias=False)(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        x = tf.keras.layers.Conv2D(64, (1, 1), strides=1, padding="same", use_bias=False)(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)

        x = tf.keras.layers.DepthwiseConv2D((3, 3), strides=2, padding="same", use_bias=False)(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        x = tf.keras.layers.Conv2D(128, (1, 1), strides=1, padding="same", use_bias=False)(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)

        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        x = tf.keras.layers.Dropout(0.3)(x)
        x = tf.keras.layers.Dense(128, activation="relu")(x)
        outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)

        model = tf.keras.Model(inputs=inputs, outputs=outputs, name="food_classifier")
        model.compile(
            optimizer="adam",
            loss="categorical_crossentropy",
            metrics=["accuracy"]
        )
        return model

    def _load_model(self) -> None:
        """Loads trained model from disk or initializes architecture if file does not exist yet."""
        model_path = settings.model_file_path
        num_classes = len(self._class_names)
        self._is_trained = False
        try:
            if model_path.exists():
                logger.info(f"Loading computer-vision model from {model_path}...")
                model = tf.keras.models.load_model(str(model_path), compile=False)
                output_units = int(model.output_shape[-1])
                if output_units != num_classes:
                    logger.warning(
                        f"Model at {model_path} predicts {output_units} classes but {num_classes} class names are "
                        f"configured. Retrain with ml/training/train.py; using an untrained fallback for now."
                    )
                    self._model = self._build_default_model(num_classes)
                else:
                    self._model = model
                    self._is_trained = bool(self._metadata.get("trained", True))
                    logger.info(f"Computer-vision model loaded successfully ({num_classes} ingredient classes).")
            else:
                logger.warning(
                    f"Model file {model_path} not found. Run ml/training/prepare_dataset.py and "
                    f"ml/training/train.py to train it; using an untrained fallback for now."
                )
                self._model = self._build_default_model(num_classes)
        except Exception as e:
            logger.error(f"Failed to load model: {e}. Using an untrained fallback.")
            self._model = self._build_default_model(num_classes)

    def get_model(self) -> tf.keras.Model:
        """Return the loaded model instance."""
        return self._model

    def get_class_names(self) -> List[str]:
        """Return the list of class names."""
        return self._class_names

    def is_trained(self) -> bool:
        return self._is_trained

    def get_metadata(self) -> Dict[str, Any]:
        return dict(self._metadata)

    def reload(self) -> None:
        """Force reload the model (e.g. after training)."""
        with self._lock:
            self._load_metadata()
            self._load_class_names()
            self._load_model()


def get_model_loader() -> ModelLoader:
    """Helper to access the ModelLoader singleton."""
    return ModelLoader()
