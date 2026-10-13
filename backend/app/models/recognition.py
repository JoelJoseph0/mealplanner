from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Recognition(Base):
    __tablename__ = "recognitions"

    id = Column(Integer, primary_key=True, index=True)
    food_image_id = Column(Integer, ForeignKey("food_images.id", ondelete="CASCADE"), nullable=False)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="SET NULL"), nullable=True)
    predicted_name = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    food_image = relationship("FoodImage", back_populates="recognition")
    food = relationship("Food", back_populates="recognitions")
    meal_history = relationship("MealHistory", back_populates="recognition")
