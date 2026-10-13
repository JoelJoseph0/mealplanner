"""pantry items, structured recipe ingredients, ingredient aliases

Revision ID: 002_pantry_ingredients
Revises: 001_initial_schema
Create Date: 2026-10-11 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_pantry_ingredients'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('foods') as batch:
        batch.add_column(sa.Column('aliases', sa.JSON(), nullable=False, server_default=sa.text("'[]'")))
        batch.add_column(sa.Column('substitutes', sa.JSON(), nullable=False, server_default=sa.text("'[]'")))
        batch.add_column(sa.Column('is_staple', sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        'recipe_ingredients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=False),
        sa.Column('food_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.String(length=60), nullable=True),
        sa.Column('is_optional', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('recipe_id', 'food_id', name='uq_recipe_ingredient')
    )
    op.create_index(op.f('ix_recipe_ingredients_id'), 'recipe_ingredients', ['id'], unique=False)
    op.create_index(op.f('ix_recipe_ingredients_recipe_id'), 'recipe_ingredients', ['recipe_id'], unique=False)
    op.create_index(op.f('ix_recipe_ingredients_food_id'), 'recipe_ingredients', ['food_id'], unique=False)

    op.create_table(
        'pantry_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('food_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.String(length=60), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'food_id', name='uq_pantry_user_food')
    )
    op.create_index(op.f('ix_pantry_items_id'), 'pantry_items', ['id'], unique=False)
    op.create_index(op.f('ix_pantry_items_user_id'), 'pantry_items', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('pantry_items')
    op.drop_table('recipe_ingredients')
    with op.batch_alter_table('foods') as batch:
        batch.drop_column('is_staple')
        batch.drop_column('substitutes')
        batch.drop_column('aliases')
