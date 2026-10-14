from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    aliases = Column(JSON, default=list, nullable=False)
    substitutes = Column(JSON, default=list, nullable=False)
    is_staple = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    nutrition = relationship("Nutrition", back_populates="food", uselist=False, cascade="all, delete-orphan")
    recognitions = relationship("Recognition", back_populates="food")
    meal_history = relationship("MealHistory", back_populates="food")
    recipe_links = relationship("RecipeIngredient", back_populates="food", cascade="all, delete-orphan")
    pantry_items = relationship("PantryItem", back_populates="food", cascade="all, delete-orphan")
    shopping_items = relationship("ShoppingItem", back_populates="food", cascade="all, delete-orphan")
