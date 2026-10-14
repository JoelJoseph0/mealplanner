from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_date = Column(Date, nullable=False, index=True)
    meal_type = Column(String(50), nullable=False)  # Breakfast, Morning Snack, Lunch, Evening Snack, Dinner
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    servings = Column(Integer, default=1, nullable=False)
    locked = Column(Boolean, default=False, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    history_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="meal_plans")
    recipe = relationship("Recipe", back_populates="meal_plans")
