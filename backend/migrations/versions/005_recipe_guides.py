"""cached AI cooking guides

Revision ID: 005_recipe_guides
Revises: 004_goals_reminders
Create Date: 2026-10-14 23:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '005_recipe_guides'
down_revision: Union[str, None] = '004_goals_reminders'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'recipe_guides',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=False),
        sa.Column('source_hash', sa.String(length=64), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('recipe_id', name='uq_recipe_guide_recipe'),
    )
    op.create_index(op.f('ix_recipe_guides_id'), 'recipe_guides', ['id'], unique=False)
    op.create_index(op.f('ix_recipe_guides_recipe_id'), 'recipe_guides', ['recipe_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recipe_guides_recipe_id'), table_name='recipe_guides')
    op.drop_index(op.f('ix_recipe_guides_id'), table_name='recipe_guides')
    op.drop_table('recipe_guides')
