from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ShoppingItem(Base):
    __tablename__ = "shopping_items"
    __table_args__ = (UniqueConstraint("user_id", "food_id", name="uq_shopping_user_food"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(Integer, ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(String(60), nullable=True)
    source = Column(String(40), default="manual", nullable=False)
    is_checked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="shopping_items")
    food = relationship("Food", back_populates="shopping_items")
