import io
from typing import Dict, List, Union
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
import cv2

TARGET_SIZE = (224, 224)
TTA_CROP = 0.8


def load_rgb(image_input: Union[bytes, str, Path, np.ndarray]) -> np.ndarray:
    """Read an image from bytes, a path or an array as an RGB uint8 array, honouring EXIF rotation."""
    if isinstance(image_input, np.ndarray):
        return image_input.astype(np.uint8)
    if isinstance(image_input, (str, Path)):
        img_bgr = cv2.imread(str(image_input))
        if img_bgr is not None:
            return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        pil_img = ImageOps.exif_transpose(Image.open(str(image_input))).convert("RGB")
        return np.array(pil_img)
    pil_img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_input))).convert("RGB")
    return np.array(pil_img)


def _resize(img_rgb: np.ndarray, target_size: tuple[int, int]) -> np.ndarray:
    height, width = img_rgb.shape[:2]
    interpolation = cv2.INTER_AREA if width >= target_size[0] and height >= target_size[1] else cv2.INTER_CUBIC
    return cv2.resize(img_rgb, target_size, interpolation=interpolation)


def _center_crop(img_rgb: np.ndarray, fraction: float) -> np.ndarray:
    height, width = img_rgb.shape[:2]
    crop_h, crop_w = max(1, int(height * fraction)), max(1, int(width * fraction))
    top, left = (height - crop_h) // 2, (width - crop_w) // 2
    return img_rgb[top:top + crop_h, left:left + crop_w]


def preprocess_image(
    image_input: Union[bytes, str, Path, np.ndarray],
    target_size: tuple[int, int] = TARGET_SIZE
) -> np.ndarray:
    """
    Single-view preprocessing: RGB, resize to the model input size, scale to [0, 1]
    and add a batch dimension, giving shape (1, height, width, 3).
    """
    resized = _resize(load_rgb(image_input), target_size)
    return np.expand_dims(resized.astype(np.float32) / 255.0, axis=0)


def tta_views(
    image_input: Union[bytes, str, Path, np.ndarray],
    target_size: tuple[int, int] = TARGET_SIZE
) -> np.ndarray:
    """
    Test-time augmentation batch of shape (3, height, width, 3): the full image,
    its mirror image and a centre crop that zooms in on the subject.
    Averaging the model's predictions over these views reduces errors caused by
    framing and orientation.
    """
    img_rgb = load_rgb(image_input)
    full = _resize(img_rgb, target_size)
    mirrored = np.ascontiguousarray(full[:, ::-1, :])
    zoomed = _resize(_center_crop(img_rgb, TTA_CROP), target_size)
    return np.stack([full, mirrored, zoomed]).astype(np.float32) / 255.0


def assess_quality(image_input: Union[bytes, str, Path, np.ndarray]) -> Dict[str, object]:
    """
    Cheap OpenCV checks that explain likely misreads to the user:
    brightness (mean luminance), contrast (luminance spread) and sharpness
    (variance of the Laplacian on a fixed-size grayscale copy).
    """
    img_rgb = load_rgb(image_input)
    gray = cv2.cvtColor(_resize(img_rgb, (320, 320)), cv2.COLOR_RGB2GRAY)
    brightness = float(gray.mean())
    contrast = float(gray.std())
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    warnings: List[str] = []
    if brightness < 45:
        warnings.append("The photo is quite dark. Try more light.")
    elif brightness > 225:
        warnings.append("The photo is very bright. Avoid direct glare or flash.")
    if contrast < 18:
        warnings.append("The ingredient blends into the background. Use a plain, contrasting surface.")
    if sharpness < 35:
        warnings.append("The photo looks blurry. Hold the camera steady and tap to focus.")

    return {
        "brightness": round(brightness, 1),
        "contrast": round(contrast, 1),
        "sharpness": round(sharpness, 1),
        "warnings": warnings,
    }
