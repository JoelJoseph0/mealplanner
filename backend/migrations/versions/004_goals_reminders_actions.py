"""nutrition goals, intolerances, health conditions, reminders, meal actions

Revision ID: 004_goals_reminders
Revises: 003_shopping_ratings
Create Date: 2026-10-14 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_goals_reminders'
down_revision: Union[str, None] = '003_shopping_ratings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('dietary_profiles') as batch:
        batch.add_column(sa.Column('goal', sa.String(length=30), nullable=False, server_default='maintain'))
        batch.add_column(sa.Column('intolerances', sa.JSON(), nullable=False, server_default='[]'))
        batch.add_column(sa.Column('health_conditions', sa.JSON(), nullable=False, server_default='[]'))
        batch.add_column(sa.Column('reminders', sa.JSON(), nullable=False, server_default='{}'))

    with op.batch_alter_table('meal_histories') as batch:
        batch.add_column(sa.Column('action', sa.String(length=20), nullable=False, server_default='cooked'))

    with op.batch_alter_table('meal_plans') as batch:
        batch.add_column(sa.Column('skipped', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table('meal_plans') as batch:
        batch.drop_column('skipped')
    with op.batch_alter_table('meal_histories') as batch:
        batch.drop_column('action')
    with op.batch_alter_table('dietary_profiles') as batch:
        batch.drop_column('reminders')
        batch.drop_column('health_conditions')
        batch.drop_column('intolerances')
        batch.drop_column('goal')
