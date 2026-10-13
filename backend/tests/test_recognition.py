import io
from PIL import Image
import pytest
from fastapi.testclient import TestClient
from app.config import settings


def _create_test_image(format: str = "JPEG", size=(100, 100), color=(255, 100, 50)) -> io.BytesIO:
    """Generate in-memory image bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf


def test_recognition_valid_image(client: TestClient, auth_headers):
    """Test computer vision prediction with a valid image upload."""
    img_buf = _create_test_image(format="JPEG")
    response = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("food_sample.jpg", img_buf, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "food_name" in data["data"]
    assert "confidence" in data["data"]
    assert "image_url" in data["data"]


def test_recognition_invalid_extension(client: TestClient, auth_headers):
    """Test rejecting files with unauthorized extensions (e.g. .txt)."""
    fake_file = io.BytesIO(b"Hello world food text")
    response = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("food.txt", fake_file, "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["message"]


def test_recognition_unsupported_mime_type(client: TestClient, auth_headers):
    """Test rejecting files with unauthorized MIME types (e.g. application/pdf)."""
    img_buf = _create_test_image(format="JPEG")
    response = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("food.jpg", img_buf, "application/pdf")}
    )
    assert response.status_code == 400
    assert "Unsupported content type" in response.json()["message"]


def test_recognition_empty_file(client: TestClient, auth_headers):
    """Test rejecting empty uploaded files (400 Bad Request)."""
    empty_file = io.BytesIO(b"")
    response = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("empty.jpg", empty_file, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["message"]


def test_recognition_oversized_file(client: TestClient, auth_headers, monkeypatch):
    """Test rejecting uploads exceeding MAX_UPLOAD_SIZE limit."""
    # Temporarily reduce limit to 100 bytes for fast testing
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE", 100)
    img_buf = _create_test_image(format="JPEG")

    response = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("large_image.jpg", img_buf, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "exceeds maximum allowed size" in response.json()["message"]


def test_recognition_corrupted_image(client: TestClient, auth_headers):
    """Test rejecting corrupted/fake image data with a valid extension."""
    fake_file = io.BytesIO(b"\x00\x01\x02NotAnActualImageStream")
    response = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("corrupted.jpg", fake_file, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Invalid or corrupted image" in response.json()["message"]


def test_recognition_history(client: TestClient, auth_headers):
    """Test history retrieval for authenticated user."""
    # First make a prediction
    img_buf = _create_test_image(format="PNG")
    pred_resp = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("dosa_sample.png", img_buf, "image/png")}
    )
    assert pred_resp.status_code == 200

    # Retrieve history
    hist_resp = client.get("/api/recognition/history", headers=auth_headers)
    assert hist_resp.status_code == 200
    history_items = hist_resp.json()["data"]
    assert len(history_items) >= 1
    assert "predicted_name" in history_items[0]


def test_recognition_get_by_id(client: TestClient, auth_headers):
    """Test fetching details of a specific past recognition."""
    img_buf = _create_test_image(format="JPEG")
    pred_resp = client.post(
        "/api/recognition/predict",
        headers=auth_headers,
        files={"file": ("single_id_test.jpg", img_buf, "image/jpeg")}
    )
    assert pred_resp.status_code == 200
    rec_id = pred_resp.json()["data"]["recognition_id"]

    get_resp = client.get(f"/api/recognition/{rec_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()["data"]
    assert data["id"] == rec_id
    assert "predicted_name" in data


def test_recognition_nonexistent_id(client: TestClient, auth_headers):
    """Test 404 response when querying a non-existent recognition ID."""
    resp = client.get("/api/recognition/99999999", headers=auth_headers)
    assert resp.status_code == 404


def test_recognition_history_serializes_linked_ingredient_nutrition(client: TestClient, auth_headers, test_user, db_session):
    from app.models.food import Food
    from app.models.nutrition import Nutrition
    from app.models.food_image import FoodImage
    from app.models.recognition import Recognition

    food = Food(name="History Tomato", category="Vegetables", aliases=[], substitutes=[], is_staple=False, is_active=True)
    db_session.add(food)
    db_session.flush()
    db_session.add(Nutrition(food_id=food.id, serving_size="100g", calories=18.0, protein=0.9, carbohydrates=3.9, fat=0.2, fiber=1.2, sugar=2.6))
    image = FoodImage(user_id=test_user.id, file_path="uploads/food_images/history.jpg", original_filename="history.jpg")
    db_session.add(image)
    db_session.flush()
    recognition = Recognition(food_image_id=image.id, food_id=food.id, predicted_name="History Tomato", confidence=0.91)
    db_session.add(recognition)
    db_session.commit()

    history = client.get("/api/recognition/history", headers=auth_headers)
    assert history.status_code == 200
    item = next(r for r in history.json()["data"] if r["id"] == recognition.id)
    assert item["food_name"] == "History Tomato"
    assert item["nutrition"]["calories"] == 18.0

    single = client.get(f"/api/recognition/{recognition.id}", headers=auth_headers)
    assert single.status_code == 200
    assert single.json()["data"]["nutrition"]["protein"] == 0.9
