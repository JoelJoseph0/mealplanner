from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), index=True, nullable=False)
    description = Column(Text, nullable=True)
    ingredients = Column(JSON, default=list, nullable=False)
    instructions = Column(Text, nullable=False)
    meal_type = Column(String(50), nullable=False)  # Breakfast, Lunch, Snack, Dinner, Morning Snack, Evening Snack
    diet_type = Column(String(50), nullable=False)  # Vegetarian, Vegan, Non-Vegetarian, Eggetarian
    allergy_information = Column(JSON, default=list, nullable=False)
    image_url = Column(String(255), nullable=True)
    preparation_time = Column(Integer, default=15, nullable=False)  # in minutes
    cooking_time = Column(Integer, default=20, nullable=False)      # in minutes
    servings = Column(Integer, default=1, nullable=False)
    calories = Column(Float, default=0.0, nullable=False)
    protein = Column(Float, default=0.0, nullable=False)
    carbohydrates = Column(Float, default=0.0, nullable=False)
    fat = Column(Float, default=0.0, nullable=False)
    fiber = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    meal_plans = relationship("MealPlan", back_populates="recipe", cascade="all, delete-orphan")
    meal_history = relationship("MealHistory", back_populates="recipe")
    ingredient_links = relationship(
        "RecipeIngredient",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.position"
    )

    @property
    def ingredient_items(self):
        items = []
        for link in self.ingredient_links or []:
            if link.food is None:
                continue
            items.append({
                "food_id": link.food_id,
                "name": link.food.name,
                "category": link.food.category,
                "quantity": link.quantity,
                "is_optional": bool(link.is_optional),
                "is_staple": bool(link.food.is_staple),
            })
        return items
