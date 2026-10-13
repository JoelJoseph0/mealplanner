import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.dietary_profile import DietaryProfile
from app.models.food import Food
from app.models.nutrition import Nutrition
from app.models.recipe import Recipe
from app.auth.password import hash_password
from app.auth.jwt import create_access_token

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session) -> User:
    user = db_session.query(User).filter(User.email == "testuser@example.com").first()
    if not user:
        user = User(
            full_name="Test Regular User",
            email="testuser@example.com",
            password_hash=hash_password("UserPassword123!"),
            age=25,
            gender="male",
            role="user",
            is_active=True
        )
        db_session.add(user)
        db_session.flush()

        profile = DietaryProfile(
            user_id=user.id,
            diet_type="Vegetarian",
            allergies=["Peanuts", "Shellfish"],
            preferred_foods=["Dosa", "Idli"],
            avoided_foods=["Beef", "Pork"],
            daily_calories=2000.0,
            protein_target=75.0,
            carbohydrate_target=250.0,
            fat_target=65.0,
            height=175.0,
            weight=70.0,
            activity_level="moderate"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def test_admin(db_session) -> User:
    admin = db_session.query(User).filter(User.email == "adminuser@example.com").first()
    if not admin:
        admin = User(
            full_name="Test Admin User",
            email="adminuser@example.com",
            password_hash=hash_password("AdminPassword123!"),
            age=35,
            gender="female",
            role="admin",
            is_active=True
        )
        db_session.add(admin)
        db_session.flush()

        profile = DietaryProfile(
            user_id=admin.id,
            diet_type="None",
            allergies=[],
            preferred_foods=[],
            avoided_foods=[],
            daily_calories=2200.0,
            protein_target=85.0,
            carbohydrate_target=275.0,
            fat_target=70.0,
            height=168.0,
            weight=62.0,
            activity_level="moderate"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(admin)
    return admin


@pytest.fixture
def user_token(test_user) -> str:
    return create_access_token({"sub": str(test_user.id), "email": test_user.email, "role": test_user.role})


@pytest.fixture
def admin_token(test_admin) -> str:
    return create_access_token({"sub": str(test_admin.id), "email": test_admin.email, "role": test_admin.role})


@pytest.fixture
def auth_headers(user_token) -> dict:
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}
