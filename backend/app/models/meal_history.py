from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class MealHistory(Base):
    __tablename__ = "meal_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="SET NULL"), nullable=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)
    recognition_id = Column(Integer, ForeignKey("recognitions.id", ondelete="SET NULL"), nullable=True)
    meal_type = Column(String(50), nullable=False)  # Breakfast, Morning Snack, Lunch, Evening Snack, Dinner
    consumed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    action = Column(String(20), default="cooked", nullable=False)
    feedback = Column(String(20), nullable=True)  # positive, negative, neutral
    rating = Column(Integer, nullable=True)        # 1 - 5
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="meal_history")
    food = relationship("Food", back_populates="meal_history")
    recipe = relationship("Recipe", back_populates="meal_history")
    recognition = relationship("Recognition", back_populates="meal_history")
