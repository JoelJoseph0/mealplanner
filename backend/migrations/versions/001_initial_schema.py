"""initial database schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-25 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. dietary_profiles table
    op.create_table(
        'dietary_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('diet_type', sa.String(length=50), nullable=False, server_default='None'),
        sa.Column('allergies', sa.JSON(), nullable=False),
        sa.Column('preferred_foods', sa.JSON(), nullable=False),
        sa.Column('avoided_foods', sa.JSON(), nullable=False),
        sa.Column('daily_calories', sa.Float(), nullable=True),
        sa.Column('protein_target', sa.Float(), nullable=True),
        sa.Column('carbohydrate_target', sa.Float(), nullable=True),
        sa.Column('fat_target', sa.Float(), nullable=True),
        sa.Column('height', sa.Float(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('activity_level', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_dietary_profiles_id'), 'dietary_profiles', ['id'], unique=False)

    # 3. foods table
    op.create_table(
        'foods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_foods_id'), 'foods', ['id'], unique=False)
    op.create_index(op.f('ix_foods_name'), 'foods', ['name'], unique=True)

    # 4. nutrition table
    op.create_table(
        'nutrition',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('food_id', sa.Integer(), nullable=False),
        sa.Column('serving_size', sa.String(length=50), nullable=False, server_default='100g'),
        sa.Column('calories', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('protein', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('carbohydrates', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('fat', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('fiber', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('sugar', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('food_id')
    )
    op.create_index(op.f('ix_nutrition_id'), 'nutrition', ['id'], unique=False)

    # 5. food_images table
    op.create_table(
        'food_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_food_images_id'), 'food_images', ['id'], unique=False)

    # 6. recognitions table
    op.create_table(
        'recognitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('food_image_id', sa.Integer(), nullable=False),
        sa.Column('food_id', sa.Integer(), nullable=True),
        sa.Column('predicted_name', sa.String(length=100), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['food_image_id'], ['food_images.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recognitions_id'), 'recognitions', ['id'], unique=False)

    # 7. recipes table
    op.create_table(
        'recipes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ingredients', sa.JSON(), nullable=False),
        sa.Column('instructions', sa.Text(), nullable=False),
        sa.Column('meal_type', sa.String(length=50), nullable=False),
        sa.Column('diet_type', sa.String(length=50), nullable=False),
        sa.Column('allergy_information', sa.JSON(), nullable=False),
        sa.Column('image_url', sa.String(length=255), nullable=True),
        sa.Column('preparation_time', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('cooking_time', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('servings', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('calories', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('protein', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('carbohydrates', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('fat', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('fiber', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recipes_id'), 'recipes', ['id'], unique=False)
    op.create_index(op.f('ix_recipes_name'), 'recipes', ['name'], unique=False)

    # 8. meal_plans table
    op.create_table(
        'meal_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan_date', sa.Date(), nullable=False),
        sa.Column('meal_type', sa.String(length=50), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=False),
        sa.Column('servings', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meal_plans_id'), 'meal_plans', ['id'], unique=False)
    op.create_index(op.f('ix_meal_plans_plan_date'), 'meal_plans', ['plan_date'], unique=False)

    # 9. meal_histories table
    op.create_table(
        'meal_histories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('food_id', sa.Integer(), nullable=True),
        sa.Column('recipe_id', sa.Integer(), nullable=True),
        sa.Column('recognition_id', sa.Integer(), nullable=True),
        sa.Column('meal_type', sa.String(length=50), nullable=False),
        sa.Column('consumed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('feedback', sa.String(length=20), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['recognition_id'], ['recognitions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meal_histories_id'), 'meal_histories', ['id'], unique=False)
    op.create_index(op.f('ix_meal_histories_user_id'), 'meal_histories', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('meal_histories')
    op.drop_table('meal_plans')
    op.drop_table('recipes')
    op.drop_table('recognitions')
    op.drop_table('food_images')
    op.drop_table('nutrition')
    op.drop_table('foods')
    op.drop_table('dietary_profiles')
    op.drop_table('users')
