from typing import Tuple
import tensorflow as tf

BACKBONE_LAYER_NAME = "backbone"


def _augmentation_block() -> tf.keras.Sequential:
    return tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.08),
            tf.keras.layers.RandomZoom(0.15),
            tf.keras.layers.RandomTranslation(0.08, 0.08),
            tf.keras.layers.RandomContrast(0.15),
            tf.keras.layers.RandomBrightness(0.12, value_range=(0.0, 1.0)),
        ],
        name="augmentation",
    )


def _mobilenet_block(x, filters: int, strides: int = 1):
    x = tf.keras.layers.DepthwiseConv2D((3, 3), strides=strides, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)
    x = tf.keras.layers.Conv2D(filters, (1, 1), strides=1, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)
    return x


def _scratch_backbone(input_shape: Tuple[int, int, int]) -> tf.keras.Model:
    inputs = tf.keras.Input(shape=input_shape)
    x = tf.keras.layers.Rescaling(1.0 / 255.0)(inputs)
    x = tf.keras.layers.Conv2D(32, (3, 3), strides=2, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)
    for filters, strides in ((64, 1), (128, 2), (128, 1), (256, 2), (256, 1), (512, 2)):
        x = _mobilenet_block(x, filters, strides)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    return tf.keras.Model(inputs, x, name=BACKBONE_LAYER_NAME)


def _pretrained_backbone(input_shape: Tuple[int, int, int], architecture: str) -> tf.keras.Model:
    builders = {
        "MobileNetV3Small": tf.keras.applications.MobileNetV3Small,
        "MobileNetV3Large": tf.keras.applications.MobileNetV3Large,
    }
    builder = builders.get(architecture, tf.keras.applications.MobileNetV3Small)
    base = builder(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet",
        pooling="avg",
        include_preprocessing=True,
        name=BACKBONE_LAYER_NAME,
    )
    return base


def build_transfer_learning_model(
    num_classes: int,
    input_shape: Tuple[int, int, int] = (224, 224, 3),
    architecture: str = "MobileNetV3Large",
    use_pretrained: bool = True,
) -> Tuple[tf.keras.Model, str]:
    backbone_source = "imagenet"
    try:
        if not use_pretrained:
            raise RuntimeError("pretrained weights disabled")
        backbone = _pretrained_backbone(input_shape, architecture)
    except Exception as error:
        print(f"--> Pretrained {architecture} unavailable ({error}); training a MobileNet-style network from scratch.")
        backbone = _scratch_backbone(input_shape)
        backbone_source = "scratch"
    backbone.trainable = backbone_source == "scratch"

    inputs = tf.keras.Input(shape=input_shape, name="image")
    x = _augmentation_block()(inputs)
    x = tf.keras.layers.Rescaling(255.0, name="to_pixel_range")(x)
    x = backbone(x, training=False)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="ingredient_predictions")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name=f"{architecture}_IngredientClassifier")
    return model, backbone_source


def unfreeze_for_fine_tuning(
    model: tf.keras.Model,
    unfreeze_layers: int = 30,
    learning_rate: float = 1e-5
) -> tf.keras.Model:
    backbone = model.get_layer(BACKBONE_LAYER_NAME)
    backbone.trainable = True
    for layer in backbone.layers[:-unfreeze_layers]:
        layer.trainable = False
    for layer in backbone.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model
