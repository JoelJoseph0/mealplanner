import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from app.auth.jwt import create_access_token


def test_register_user_success(client: TestClient):
    """Test standard user registration."""
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Kiran Kumar",
            "email": "kiran@example.com",
            "password": "Password123!",
            "age": 26,
            "gender": "male"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "kiran@example.com"
    assert "token" in data["data"]
    assert "password" not in data["data"]["user"]
    assert "password_hash" not in data["data"]["user"]


def test_register_duplicate_email(client: TestClient):
    """Test duplicate email rejection (400 Bad Request)."""
    payload = {
        "full_name": "Duplicate User",
        "email": "duplicate@example.com",
        "password": "Password123!",
        "age": 28,
        "gender": "female"
    }
    first_resp = client.post("/api/auth/register", json=payload)
    assert first_resp.status_code == 201

    second_resp = client.post("/api/auth/register", json=payload)
    assert second_resp.status_code == 400
    assert "already exists" in second_resp.json()["message"]


def test_register_missing_fields_validation_error(client: TestClient):
    """Test registration failure on invalid schema / missing fields (422 Unprocessable Entity)."""
    # Missing email & password
    response = client.post(
        "/api/auth/register",
        json={"full_name": "Incomplete User"}
    )
    assert response.status_code == 422


def test_login_success(client: TestClient, test_user):
    """Test successful user login returning JWT bearer token."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "UserPassword123!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_case_insensitive_email(client: TestClient, test_user):
    """Test login succeeds regardless of uppercase/lowercase in email."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email.upper(),
            "password": "UserPassword123!"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client: TestClient, test_user):
    """Test login failure with wrong credentials (401 Unauthorized)."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "WrongPassword999!"
        }
    )
    assert response.status_code == 401


def test_login_nonexistent_email(client: TestClient):
    """Test login failure with email not in database (401 Unauthorized)."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent_ghost_user@example.com",
            "password": "SomePassword123!"
        }
    )
    assert response.status_code == 401


def test_protected_endpoint_without_token(client: TestClient):
    """Test accessing protected route without token (401 Unauthorized)."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_protected_endpoint_with_valid_token(client: TestClient, auth_headers):
    """Test accessing protected route with valid token."""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "testuser@example.com"


def test_tampered_or_invalid_jwt_token(client: TestClient):
    """Test rejected access with corrupted or forged JWT token (401 Unauthorized)."""
    bad_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature"}
    response = client.get("/api/auth/me", headers=bad_headers)
    assert response.status_code == 401


def test_expired_jwt_token(client: TestClient, test_user):
    """Test rejected access with an expired JWT token (401 Unauthorized)."""
    expired_token = create_access_token(
        data={"sub": str(test_user.id)},
        expires_delta=timedelta(seconds=-30)  # Expired 30 seconds ago
    )
    expired_headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/auth/me", headers=expired_headers)
    assert response.status_code == 401


def test_inactive_user_access_blocked(client: TestClient, test_user, db_session):
    """Test that deactivated users are blocked from protected endpoints (403 Forbidden)."""
    # Create valid token for user
    token = create_access_token(data={"sub": str(test_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Deactivate user
    test_user.is_active = False
    db_session.commit()

    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 403
    assert "Inactive user account" in response.json()["message"]

    # Re-enable user for subsequent tests
    test_user.is_active = True
    db_session.commit()


def test_admin_authorization_enforced(client: TestClient, auth_headers, admin_headers):
    """Test that admin endpoints block normal users (403) and admit admins (200)."""
    # Regular user attempting admin dashboard -> 403 Forbidden
    user_resp = client.get("/api/admin/dashboard", headers=auth_headers)
    assert user_resp.status_code == 403

    # Admin user accessing admin dashboard -> 200 OK
    admin_resp = client.get("/api/admin/dashboard", headers=admin_headers)
    assert admin_resp.status_code == 200
    assert admin_resp.json()["success"] is True
