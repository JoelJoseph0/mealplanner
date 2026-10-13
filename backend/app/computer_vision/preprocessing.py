import io
from typing import Union
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
import cv2


def preprocess_image(
    image_input: Union[bytes, str, Path],
    target_size: tuple[int, int] = (224, 224)
) -> np.ndarray:
    """
    Preprocess image for TensorFlow/Keras computer-vision models.
    Supports both raw image bytes and file path inputs.
    Pipeline:
      1. Read image using Pillow or OpenCV
      2. Ensure RGB mode
      3. Resize to target dimension (e.g. 224x224)
      4. Convert to float32 array
      5. Normalize pixel values to [0.0, 1.0]
      6. Expand dimensions to (1, height, width, 3) for model batch inference
    """
    if isinstance(image_input, (str, Path)):
        # Read from disk using OpenCV
        img_bgr = cv2.imread(str(image_input))
        if img_bgr is None:
            # Fallback to Pillow
            pil_img = ImageOps.exif_transpose(Image.open(str(image_input))).convert("RGB")
            img_rgb = np.array(pil_img)
        else:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    else:
        # Read from byte buffer using Pillow
        pil_img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_input))).convert("RGB")
        img_rgb = np.array(pil_img)

    # Resize using OpenCV with area interpolation for clean downsampling
    resized = cv2.resize(img_rgb, target_size, interpolation=cv2.INTER_AREA)

    # Normalize to [0.0, 1.0] float32
    normalized = resized.astype(np.float32) / 255.0

    # Expand batch dimension: (1, 224, 224, 3)
    batch_array = np.expand_dims(normalized, axis=0)
    return batch_array
