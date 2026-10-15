from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class RecipeGuide(Base):
    __tablename__ = "recipe_guides"
    __table_args__ = (UniqueConstraint("recipe_id", name="uq_recipe_guide_recipe"),)

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    source_hash = Column(String(64), nullable=False)
    model = Column(String(100), nullable=False)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
