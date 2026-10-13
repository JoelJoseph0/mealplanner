from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    __table_args__ = (UniqueConstraint("recipe_id", "food_id", name="uq_recipe_ingredient"),)

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(String(60), nullable=True)
    is_optional = Column(Boolean, default=False, nullable=False)
    position = Column(Integer, default=0, nullable=False)

    recipe = relationship("Recipe", back_populates="ingredient_links")
    food = relationship("Food", back_populates="recipe_links")
