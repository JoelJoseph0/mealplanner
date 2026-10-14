"""shopping list, recipe ratings, meal plan flags

Revision ID: 003_shopping_ratings
Revises: 002_pantry_ingredients
Create Date: 2026-10-14 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_shopping_ratings'
down_revision: Union[str, None] = '002_pantry_ingredients'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('meal_plans') as batch:
        batch.add_column(sa.Column('locked', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column('completed', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column('history_id', sa.Integer(), nullable=True))

    op.create_table(
        'shopping_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('food_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.String(length=60), nullable=True),
        sa.Column('source', sa.String(length=40), nullable=False, server_default='manual'),
        sa.Column('is_checked', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'food_id', name='uq_shopping_user_food')
    )
    op.create_index(op.f('ix_shopping_items_id'), 'shopping_items', ['id'], unique=False)
    op.create_index(op.f('ix_shopping_items_user_id'), 'shopping_items', ['user_id'], unique=False)

    op.create_table(
        'recipe_ratings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=False),
        sa.Column('feedback', sa.String(length=20), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'recipe_id', name='uq_rating_user_recipe')
    )
    op.create_index(op.f('ix_recipe_ratings_id'), 'recipe_ratings', ['id'], unique=False)
    op.create_index(op.f('ix_recipe_ratings_user_id'), 'recipe_ratings', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('recipe_ratings')
    op.drop_table('shopping_items')
    with op.batch_alter_table('meal_plans') as batch:
        batch.drop_column('history_id')
        batch.drop_column('completed')
        batch.drop_column('locked')
