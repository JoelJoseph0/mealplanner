import os
import uuid
from pathlib import Path
from app.config import settings


def save_upload_file(file_bytes: bytes, original_filename: str) -> tuple[str, str]:
    """
    Saves an uploaded image using a secure UUID-generated filename.
    Returns:
        tuple[str, str]: (absolute_file_path, relative_url_path)
    """
    ext = os.path.splitext(original_filename)[1].lower()
    if not ext:
        ext = ".jpg"

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    upload_dir = settings.upload_dir_path
    upload_dir.mkdir(parents=True, exist_ok=True)

    absolute_path = upload_dir / unique_filename
    with open(absolute_path, "wb") as f:
        f.write(file_bytes)

    # Relative URL path suitable for web clients
    relative_url = f"/uploads/food_images/{unique_filename}"
    return str(absolute_path), relative_url


def delete_file(file_path: str) -> bool:
    """Safely delete a file from the server."""
    try:
        path = Path(file_path)
        if path.exists() and path.is_file():
            path.unlink()
            return True
    except Exception:
        pass
    return False
