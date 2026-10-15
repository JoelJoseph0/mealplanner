from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DietaryProfile(Base):
    __tablename__ = "dietary_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    diet_type = Column(String(50), default="None", nullable=False)  # None, Vegetarian, Vegan, Non-Vegetarian, Eggetarian
    allergies = Column(JSON, default=list, nullable=False)
    preferred_foods = Column(JSON, default=list, nullable=False)
    avoided_foods = Column(JSON, default=list, nullable=False)
    daily_calories = Column(Float, nullable=True)
    protein_target = Column(Float, nullable=True)
    carbohydrate_target = Column(Float, nullable=True)
    fat_target = Column(Float, nullable=True)
    height = Column(Float, nullable=True)  # in cm
    weight = Column(Float, nullable=True)  # in kg
    activity_level = Column(String(50), nullable=True)  # sedentary, light, moderate, active, very_active
    goal = Column(String(30), default="maintain", nullable=False)
    intolerances = Column(JSON, default=list, nullable=False)
    health_conditions = Column(JSON, default=list, nullable=False)
    reminders = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    user = relationship("User", back_populates="dietary_profile")
