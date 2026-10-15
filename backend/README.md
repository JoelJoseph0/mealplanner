# Smart Meal Planner Using Computer Vision
### MCA Final-Year Project Backend

A modular, production-style, asynchronous REST API backend for the **Smart Meal Planner Using Computer Vision** system. Built with Python, FastAPI, PostgreSQL, SQLAlchemy ORM, Alembic, TensorFlow/Keras, OpenCV, and JWT Authentication.

**Core idea: cook with what you have.** Users tell the system which ingredients are in their kitchen (typed with autocomplete, or photographed and recognised by the computer-vision model). The pantry matcher then returns:

* **Ready to cook**: recipes whose key ingredients are all available.
* **Almost there**: recipes missing only 1-2 items, with a combined shopping list.
* **Smart substitutions**: e.g. lemon instead of lime, jaggery instead of sugar.
* **Kitchen basics**: salt, oil, water, sugar and everyday spices are assumed and never reported as missing.
* **Diet & allergy safety**: the user's diet type, allergies and avoided foods are still strictly enforced.

Example: `{"ingredients": ["tomato", "papaya"]}` returns Papaya Lime Bowl (missing: Lime), Papaya Lassi (missing: Curd), Papaya Tomato Salsa (missing: Onion, Lime) and more.

---

## 1. System Architecture

```text
Frontend (React + Vite)
        │
        │ HTTP / REST APIs (Axios)
        │ Authorization: Bearer <JWT>
        ▼
Backend (FastAPI + Python)
  ├── Authentication & RBAC (JWT, bcrypt)
  ├── User Management & Dietary Profiles
  ├── Ingredient Catalog (aliases, substitutes, kitchen basics)
  ├── Pantry Management & "What Can I Cook?" Matcher
  ├── Computer Vision Ingredient Recognition (OpenCV, Pillow, MobileNetV3)
  ├── Nutrition Analytics (per 100g)
  ├── Recipe Discovery & Catalog
  ├── Rule-Based Recommendation Engine
  ├── Daily & Weekly Balanced Meal Planner
  ├── Meal Consumption History & Feedback
  └── Administrator Analytics & Reporting
        │
        │ SQLAlchemy 2.0 ORM & Alembic
        ▼
Database (PostgreSQL)
```

---

## 2. Technology Stack

* **Language**: Python 3.10+
* **Framework**: FastAPI (High-performance ASGI)
* **Server**: Uvicorn (ASGI server with hot reload)
* **Database**: PostgreSQL
* **ORM**: SQLAlchemy 2.0
* **Database Migrations**: Alembic
* **Data Validation**: Pydantic v2 & Pydantic-Settings
* **Authentication**: JWT (JSON Web Tokens via python-jose) & Password Hashing (bcrypt)
* **Computer Vision**: TensorFlow 2.x / Keras, OpenCV, Pillow
* **Recommendation Engine**: Pantry coverage matcher + multi-factor rule-based scoring engine with strict elimination filters
* **Testing**: Pytest & HTTPX TestClient

---

## 3. Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application setup, CORS, error handling
│   ├── config.py                   # Pydantic BaseSettings environment configuration
│   ├── database.py                 # SQLAlchemy session and Base setup
│   │
│   ├── models/                     # SQLAlchemy ORM Database Models
│   │   ├── __init__.py
│   │   ├── user.py                 # User model (id, email, password_hash, role, etc.)
│   │   ├── dietary_profile.py      # 1-to-1 profile with allergies, avoided foods, macros
│   │   ├── food.py                 # Ingredient catalog item (aliases, substitutes, is_staple)
│   │   ├── recipe_ingredient.py    # Structured recipe -> ingredient links with quantity
│   │   ├── pantry_item.py          # Ingredients a user has in stock (quantity, expiry)
│   │   ├── nutrition.py            # 1-to-1 nutrition data (calories, macros, micronutrients)
│   │   ├── food_image.py           # Uploaded images tracking
│   │   ├── recognition.py          # CV predictions history and confidence scores
│   │   ├── recipe.py               # Multi-cuisine recipes catalog
│   │   ├── meal_plan.py            # Daily and weekly scheduled meals
│   │   └── meal_history.py         # Consumed meals log with ratings and feedback
│   │
│   ├── schemas/                    # Pydantic Request & Response Schemas
│   │   ├── __init__.py
│   │   ├── auth.py                 # UserRegister, UserLogin, Token
│   │   ├── user.py                 # UserResponse, UserProfileUpdate
│   │   ├── dietary_profile.py      # DietaryProfileResponse, DietaryProfileUpdate
│   │   ├── food.py                 # FoodCreate, FoodUpdate, FoodResponse
│   │   ├── pantry.py               # PantryAddRequest, PantryItemUpdate, CookSuggestionRequest
│   │   ├── nutrition.py            # NutritionCreate, NutritionUpdate, NutritionResponse
│   │   ├── recognition.py          # PredictionResult, RecognitionResponse
│   │   ├── recipe.py               # RecipeCreate, RecipeUpdate, RecipeResponse
│   │   ├── recommendation.py       # RecommendationRequest, RecommendationResponse
│   │   ├── meal_plan.py            # DailyMealPlanResponse, WeeklyMealPlanResponse
│   │   └── history.py              # MealHistoryCreate, MealFeedbackCreate
│   │
│   ├── routers/                    # Domain-Grouped REST API Routers
│   │   ├── __init__.py
│   │   ├── auth.py                 # /api/auth
│   │   ├── users.py                # /api/users
│   │   ├── foods.py                # /api/foods
│   │   ├── ingredients.py          # /api/ingredients (autocomplete)
│   │   ├── pantry.py               # /api/pantry and /api/pantry/suggest
│   │   ├── recognition.py          # /api/recognition
│   │   ├── nutrition.py            # /api/nutrition
│   │   ├── recipes.py              # /api/recipes
│   │   ├── recommendations.py      # /api/recommendations
│   │   ├── meal_plans.py           # /api/meal-plans
│   │   ├── history.py              # /api/history
│   │   └── admin.py                # /api/admin
│   │
│   ├── services/                   # Business Logic Services
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── food_service.py
│   │   ├── ingredient_service.py   # Catalog index, search, recipe ingredient linking
│   │   ├── pantry_service.py       # Pantry CRUD and recipe suggestions
│   │   ├── nutrition_service.py
│   │   ├── recognition_service.py
│   │   ├── recipe_service.py
│   │   ├── recommendation_service.py
│   │   ├── meal_planner_service.py
│   │   └── history_service.py
│   │
│   ├── auth/                       # Security & JWT Dependencies
│   │   ├── __init__.py
│   │   ├── jwt.py                  # Token encoding, decoding, expiration
│   │   ├── password.py             # bcrypt hashing and verification
│   │   └── dependencies.py         # get_current_user and require_admin
│   │
│   ├── computer_vision/            # Production CV Inference Modules
│   │   ├── __init__.py
│   │   ├── model_loader.py         # Singleton model cache
│   │   ├── preprocessing.py        # OpenCV & Pillow 224x224 RGB normalization
│   │   ├── prediction.py           # Threshold-based inference
│   │   └── class_names.json        # 34 raw ingredient classes (tomato, papaya, egg, ...)
│   │
│   ├── recommendation/             # Rule-Based Recommendation Engine
│   │   ├── __init__.py
│   │   ├── filters.py              # Strict elimination (allergens, diet, avoided foods)
│   │   ├── scoring.py              # Normalised 0-100 multi-factor score
│   │   ├── pantry_matcher.py       # Have / missing / substitute / staple matching
│   │   └── rule_engine.py          # Pipeline ranking engine
│   │
│   └── utils/                      # Utilities
│       ├── __init__.py
│       ├── validators.py           # File extension, MIME, size, Pillow integrity validation
│       ├── file_handler.py         # UUID server-side storage
│       ├── helpers.py              # Standardized API response & Mifflin-St Jeor formulas
│       ├── ingredient_parser.py    # Quantity parsing, plural/alias normalisation, fuzzy suggestions
│       └── allergens.py            # Allergen labels derived from recipe ingredients
│
├── data/
│   ├── ingredients.json            # 160 ingredients with aliases, substitutes, nutrition per 100g
│   └── recipes.json                # 106 structured recipes (Breakfast to Dinner)
│
├── ml/                             # Machine Learning Training & Evaluation
│   ├── dataset/                    # train / validation / test images per ingredient + manifest.json
│   ├── training/                   # Model architecture and training scripts
│   │   ├── prepare_dataset.py      # Downloads and prepares the ingredient image dataset
│   │   ├── train.py                # Two-phase transfer learning with augmentation and early stopping
│   │   └── transfer_learning.py    # ImageNet MobileNetV3 backbone + ingredient classification head
│   ├── evaluation/                 # Metrics & Confusion Matrix
│   │   ├── evaluate.py             # Test-set accuracy, top-3, precision, recall, F1
│   │   ├── metrics.py              # Scikit-learn evaluation metrics
│   │   ├── confusion_matrix.py     # Heatmap visualization
│   │   ├── confusion_matrix.png    # Latest test-set confusion matrix
│   │   └── report.json             # Latest per-class evaluation report
│   └── models/
│       ├── food_classifier.keras   # Trained ingredient classifier
│       └── model_meta.json         # Classes, architecture and accuracy of the trained model
│
├── uploads/
│   └── food_images/                # Uploaded food images directory
│
├── migrations/                     # Alembic Migration Scripts
│   ├── versions/
│   │   ├── 001_initial_schema.py   # Complete initial database DDL
│   │   └── 002_pantry_and_recipe_ingredients.py
│   ├── env.py
│   └── script.py.mako
│
├── tests/                          # Automated Pytest Test Suite
│   ├── conftest.py                 # TestClient and SQLite test fixtures
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_foods.py
│   ├── test_recognition.py
│   ├── test_nutrition.py
│   ├── test_recipes.py
│   ├── test_recommendations.py
│   ├── test_pantry.py              # Parser, matcher, pantry API and suggestions
│   └── test_meal_plans.py
│
├── .env                            # Environment variables
├── .gitignore
├── alembic.ini                     # Alembic configuration
├── requirements.txt                # Python project dependencies
├── seed.py                         # Database demo seeder script
└── README.md
```

---

## 4. Database Schema & Entities

The relational database model comprises 11 entities connected via foreign keys and cascade rules:

1. **User**: `id`, `full_name`, `email` (unique), `password_hash`, `age`, `gender`, `role` (`user` / `admin`), `is_active`, `created_at`, `updated_at`.
2. **DietaryProfile**: `id`, `user_id` (1-to-1), `diet_type` (`None`, `Vegetarian`, `Vegan`, `Non-Vegetarian`, `Eggetarian`), `allergies` (JSON list), `preferred_foods` (JSON list), `avoided_foods` (JSON list), `daily_calories`, `protein_target`, `carbohydrate_target`, `fat_target`, `height`, `weight`, `activity_level`.
3. **Food** (ingredient catalog): `id`, `name` (unique), `category`, `description`, `image_url`, `aliases` (JSON list, e.g. `thakkali`), `substitutes` (JSON list), `is_staple` (kitchen basic), `is_active`.
4. **Nutrition**: `id`, `food_id` (1-to-1), `serving_size` (`100g`), `calories`, `protein`, `carbohydrates`, `fat`, `fiber`, `sugar`.
5. **FoodImage**: `id`, `user_id`, `file_path`, `original_filename`, `created_at`.
6. **Recognition**: `id`, `food_image_id`, `food_id` (nullable), `predicted_name`, `confidence` (float), `created_at`.
7. **Recipe**: `id`, `name`, `description`, `ingredients` (JSON list), `instructions`, `meal_type` (`Breakfast`, `Lunch`, `Snack`, `Dinner`), `diet_type`, `allergy_information` (JSON list), `image_url`, `preparation_time`, `cooking_time`, `servings`, `calories`, `protein`, `carbohydrates`, `fat`, `fiber`.
8. **MealPlan**: `id`, `user_id`, `plan_date`, `meal_type` (`Breakfast`, `Morning Snack`, `Lunch`, `Evening Snack`, `Dinner`), `recipe_id`, `servings`, `created_at`.
9. **MealHistory**: `id`, `user_id`, `food_id`, `recipe_id`, `recognition_id`, `meal_type`, `consumed_at`, `feedback` (`positive`, `negative`, `neutral`), `rating` (1–5), `notes`.
10. **RecipeIngredient**: `id`, `recipe_id`, `food_id`, `quantity`, `is_optional`, `position` (unique per recipe + food).
11. **PantryItem**: `id`, `user_id`, `food_id`, `quantity`, `expiry_date`, `created_at`, `updated_at` (unique per user + food).

---

## 5. Setup & Installation

### Step 1: Clone and Enter Directory
```bash
cd backend
```

### Step 2: Configure Environment Variables
Edit or verify `.env`:
```env
DATABASE_URL=sqlite:///./smart_meal_planner.db
SECRET_KEY=dev_secret_key_super_secure_meal_planner_mca_project_jwt_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_URL=http://localhost:5173
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=uploads/food_images
CONFIDENCE_THRESHOLD=0.45
MODEL_PATH=ml/models/food_classifier.keras
```
Relative SQLite paths are resolved against the `backend/` folder, so the same database is used no matter where the server is started from. For PostgreSQL use `postgresql://postgres:YOUR_PASSWORD@localhost:5432/smart_meal_planner`.

### Step 3: Install Python Dependencies
```bash
pip install -r requirements.txt
```
TensorFlow is a large download (about 400 MB). On a slow connection use a longer timeout and retries:
```bash
pip install --default-timeout=600 --retries 10 -r requirements.txt
```

### Step 4: Run Database Migrations
Create all PostgreSQL tables using Alembic:
```bash
alembic upgrade head
```
For the local SQLite setup (`DATABASE_URL=sqlite:///./smart_meal_planner.db`) tables are created on start-up, and missing ingredient columns are added automatically by `app/schema_upgrade.py`.

### Step 5: Seed Demo Data
Load the ingredient catalog (`data/ingredients.json`), the structured recipes (`data/recipes.json`), demo accounts and a sample pantry for the demo user. The script is idempotent: re-running it updates existing rows in place.
```bash
python seed.py
```

* **Default Admin Account**:
  * Email: `admin@mealplanner.com`
  * Password: `Admin@123`
* **Default Regular User Account**:
  * Email: `user@mealplanner.com`
  * Password: `User@123`

### Step 6: Start FastAPI Development Server
```bash
uvicorn app.main:app --reload
```
The server will start at `http://localhost:8000`.

---

## 6. Interactive API Documentation

Once the server is running, visit:
* **Swagger UI Interactive Explorer**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **OpenAPI JSON Spec**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 7. REST API Endpoints Summary

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | Public |
| `POST` | `/api/auth/logout` | Stateless logout acknowledgement | User |
| `GET` | `/api/auth/me` | Get profile of logged-in user | User |

### User Profile & Preferences (`/api/users`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/users/profile` | Retrieve biometric profile | User |
| `PUT` | `/api/users/profile` | Update age, gender, height, weight, activity | User |
| `GET` | `/api/users/preferences` | Retrieve diet, allergies, avoided foods, calorie goal | User |
| `PUT` | `/api/users/preferences` | Update dietary preferences and allergies | User |

### Account settings (`/api/users`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/users/change-password` | Change password (`current_password`, `new_password`) | User |
| `GET` | `/api/users/reminders` | Meal reminder settings with default slot times | User |
| `PUT` | `/api/users/reminders` | Save reminders: `enabled`, `lead_minutes`, `plan_reminder`, per-slot `enabled` and `time` | User |

`PUT /api/users/preferences` also accepts `goal` (`maintain`, `lose`, `gain`, `muscle`), `intolerances` and `health_conditions`. Changing the goal recalculates calorie and macro targets; intolerances are filtered like allergies (for example lactose removes milk, curd and paneer recipes).

### Cooking Assistant (`/api/assistant`)
Powered by a local language model served by [Ollama](https://ollama.com) (default `qwen2.5:latest`). Nothing leaves your machine.

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/assistant/status?warm=true` | Whether Ollama is reachable and the model installed; `warm` loads the model in the background | User |
| `GET` | `/api/assistant/recipes/{id}/guide` | Cached detailed guide if one exists, otherwise a guide built from the stored steps; plus `personal` warnings (allergen conflicts, missing ingredients) | User |
| `POST` | `/api/assistant/recipes/{id}/guide/stream` | Generate the detailed guide, streamed as server-sent events (`meta`, `step`, `tips`, `done`, or `unavailable`); saved on success. `?refresh=true` regenerates | User |
| `POST` | `/api/assistant/recipes/{id}/ask` | Ask a question (`question`, `history`, optional `current_step`); the answer streams as `token` events | User |
| `POST` | `/api/assistant/recipes/{id}/prime` | Pre-process the recipe prompt so the first question is answered sooner | User |
| `DELETE` | `/api/assistant/recipes/{id}/guide` | Discard the cached guide | Admin |

The assistant is grounded in the recipe, the ingredient catalog (aliases and curated substitutes), and the person's diet, allergies, intolerances and pantry. Allergen warnings are computed in code, never by the model. Guides are cached per recipe and invalidated automatically when the recipe changes. Settings: `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_KEEP_ALIVE`, `OLLAMA_TIMEOUT`, `OLLAMA_NUM_CTX` and `ASSISTANT_ENABLED` in `.env`.

On CPU a 7B model writes roughly 3 tokens a second, so a first guide takes a few minutes. Generate them ahead of time with `python pregenerate_guides.py` (options `--limit N`, `--ids 1 2 3`, `--refresh`); a GPU for the Ollama container (`--gpus all`) or a smaller model such as `qwen2.5:3b` makes it much faster.

### Ingredients (`/api/ingredients`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/ingredients?search=thakk` | Autocomplete by name or alias (returns `matched_alias`) | User |
| `GET` | `/api/ingredients/categories` | List ingredient categories | User |

### Pantry (`/api/pantry`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/pantry` | List the user's stocked ingredients (with `expires_soon`) | User |
| `POST` | `/api/pantry` | Add items: `{"names": ["tomato", "papaya"]}` or `{"items": [{"name", "quantity", "expiry_date"}]}`; unknown names come back with suggestions | User |
| `PUT` | `/api/pantry/{id}` | Update quantity / expiry (`clear_expiry` to remove) | User |
| `DELETE` | `/api/pantry/{id}` | Remove one ingredient | User |
| `DELETE` | `/api/pantry` | Clear the pantry | User |
| `POST` | `/api/pantry/consume` | After cooking: deduct the recipe's ingredients (`recipe_id`, optional `food_ids`) from the pantry quantities | User |
| `POST` | `/api/pantry/suggest` | **What can I cook?** Body: `ingredients` (optional, else saved pantry), `use_saved_pantry`, `meal_type`, `max_missing` (0-5), `assume_staples`, `apply_profile`, `limit`. Returns `results` (status `ready`/`almost`, `have`, `missing`, `substitutions`, `staples`, `match_percent`), `shopping_list`, `unrecognized` | User |

### Ingredient Catalog Admin (`/api/foods`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/foods` | List ingredients (search covers aliases, category filter) | User |
| `GET` | `/api/foods/{id}` | Get food details with nutritional breakdown | User |
| `POST` | `/api/foods` | Add new food item | Admin |
| `PUT` | `/api/foods/{id}` | Update food item | Admin |
| `DELETE` | `/api/foods/{id}` | Remove food item | Admin |

### Computer Vision Recognition (`/api/recognition`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/recognition/predict` | Upload ingredient photo (`multipart/form-data`, optional `add_to_pantry=true`); returns ingredient, top-3 candidates, nutrition and recipes that use it | User |
| `GET` | `/api/recognition/history` | List user's past predictions | User |
| `GET` | `/api/recognition/{id}` | Get specific past recognition record | User |

Scans can be deleted with `DELETE /api/recognition/{id}` or all at once with `DELETE /api/recognition/history`. Stored photos older than `IMAGE_RETENTION_DAYS` (default 30) are removed at startup.

### Nutrition (`/api/nutrition`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/nutrition/{food_id}` | Retrieve nutrition facts for a food item | User |
| `POST` | `/api/nutrition` | Create nutrition record | Admin |
| `PUT` | `/api/nutrition/{id}` | Update nutrition record | Admin |
| `DELETE` | `/api/nutrition/{id}` | Delete nutrition record | Admin |

### Recipes Catalog (`/api/recipes`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/recipes` | List recipes (filter by meal_type, diet, calories, `ingredient=tomato`); each recipe includes structured `ingredient_items` | User |
| `GET` | `/api/recipes/{id}` | Get recipe ingredients and cooking steps | User |
| `POST` | `/api/recipes` | Add new recipe | Admin |
| `PUT` | `/api/recipes/{id}` | Update recipe | Admin |
| `DELETE` | `/api/recipes/{id}` | Delete recipe | Admin |

### Recommendation Engine (`/api/recommendations`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/recommendations` | Generate ranked, allergy-safe recommendations (pantry-aware unless `use_pantry=false`; returns `pantry_coverage`) | User |

### Meal Planning (`/api/meal-plans`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/meal-plans/daily` | Get 5-slot daily plan with calorie & macro totals | User |
| `POST` | `/api/meal-plans/generate` | Generate or regenerate customized daily meal plan (`use_pantry=true` favours recipes you can cook from your pantry) | User |
| `GET` | `/api/meal-plans/weekly` | Get 7-day balanced weekly meal plan | User |
| `POST` | `/api/meal-plans/generate-week` | Generate or regenerate complete 7-day plan (supports `use_pantry`) | User |
| `POST` | `/api/meal-plans/{id}/swap` | Replace one planned meal with another suitable recipe | User |
| `PUT` | `/api/meal-plans/{id}/lock` | Lock or unlock a meal so regeneration keeps it | User |
| `PUT` | `/api/meal-plans/{id}/complete` | Mark a planned meal as cooked and log it to history | User |
| `PUT` | `/api/meal-plans/{id}/skip` | Mark a planned meal as skipped (`skipped: true/false`); logged to history and ranked lower later | User |

GET endpoints are read-only: a plan exists only after it is generated. Disliked foods and allergens are excluded, and servings are balanced towards the daily calorie target.

### Shopping List (`/api/shopping`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/shopping` | Saved shopping list | User |
| `POST` | `/api/shopping` | Add items by name | User |
| `POST` | `/api/shopping/from-recipe` | Add the ingredients a recipe is missing | User |
| `POST` | `/api/shopping/from-plan` | Add everything the weekly plan needs and the pantry lacks | User |
| `POST` | `/api/shopping/checkout` | Move bought items into the pantry | User |
| `PUT` | `/api/shopping/{id}` | Update quantity or checked state | User |
| `DELETE` | `/api/shopping/{id}` | Remove one item | User |
| `DELETE` | `/api/shopping` | Clear the list | User |

### Meal History & Feedback (`/api/history`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/history` | Get user meal consumption history | User |
| `GET` | `/api/history/{id}` | Get specific history log | User |
| `POST` | `/api/history` | Log meal consumption | User |
| `PUT` | `/api/recipes/{id}/rating` | Quick 1-5 rating for a recipe (feeds recommendations) | User |
| `GET` | `/api/history/insights?days=14` | Personal report: daily calorie trend, macro averages vs targets, cooked/skipped/viewed counts, favourites, scans | User |
| `POST` | `/api/history/viewed` | Record that a recipe was viewed (once per recipe per day) | User |
| `POST` | `/api/history/feedback` | Submit post-meal rating (1-5), feedback, and notes | User |

### Administrator (`/api/admin`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Aggregated analytics & stats (users, ingredients, pantry usage, CV metrics) | Admin |
| `GET` | `/api/admin/users` | List registered user accounts | Admin |
| `DELETE` | `/api/admin/users/{id}` | Moderate/delete user account | Admin |
| `GET` | `/api/admin/reports` | System diagnostic & accuracy reports | Admin |
| `POST` | `/api/admin/upload-image` | Upload a recipe or ingredient image, returns its URL | Admin |
| `PUT` | `/api/admin/users/{id}` | Enable or disable an account, or change its role | Admin |
| `GET` | `/api/admin/categories` | Ingredient categories with item counts | Admin |
| `PUT` | `/api/admin/categories` | Rename a category, or merge it into another (`name`, `new_name`) | Admin |
| `GET` | `/api/admin/model-evaluation` | Test-set accuracy, top-3 accuracy, macro and weighted precision/recall/F1, per-class metrics, confusion matrix and most confused pairs | Admin |

---

## 8. Computer Vision Pipeline

The CV system recognises **raw ingredients** (vegetables, fruits, eggs) so users can fill their pantry with the camera:

1. **Validation**:
   * Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`
   * Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   * File size: Maximum 10 MB
   * Integrity check: Verified through Pillow stream decoding (rejects renamed binaries or executable files).
2. **Safe Storage**: Saved in `uploads/food_images/` with UUID-generated filenames.
3. **Preprocessing** (`app/computer_vision/preprocessing.py`):
   * Pillow EXIF orientation correction (phone photos are not rotated sideways) and RGB conversion.
   * Three **test-time augmentation views** of every photo: the full image, its mirror image and an 80% centre crop. Each is resized to `224x224` (area interpolation when shrinking, cubic when enlarging) and scaled to `[0.0, 1.0]`.
   * An OpenCV **photo quality check** (brightness, contrast and sharpness via the Laplacian variance) that returns plain-language tips such as "The photo looks blurry" next to the result.
4. **Inference** (`app/computer_vision/prediction.py`):
   * Loaded once via thread-safe singleton `ModelLoader`.
   * The three views are scored in one batch and their probabilities averaged, then **temperature calibrated** with the value stored in `model_meta.json` (fitted on the validation set during training).
   * Returns the top-3 candidates. Threshold validation (`CONFIDENCE_THRESHOLD = 0.45`):
     * If confidence $\ge 0.45$: maps the prediction to the ingredient catalog, optionally adds it to the pantry, and returns nutrition per 100g plus recipes that use it, ranked by pantry coverage.
     * If confidence $< 0.45$: flags `"Unknown Ingredient"` and returns the candidates so the user can pick the right one.
   * `is_ambiguous` is set when the top two classes are close (margin under 0.15 with confidence under 0.7), and the message asks the user to confirm between the two.
5. **Dataset**: `python ml/training/prepare_dataset.py` downloads the Apache-2.0 licensed [Food_and_Vegetables](https://huggingface.co/datasets/SunnyAgarwal4274/Food_and_Vegetables) image set, maps its folders onto catalog ingredient names (e.g. `eggplant` to `Brinjal`, `chilli pepper` and `jalepeno` to `Green Chilli`), keeps up to 100 images per class (about 64 MB in total), downsizes them to 320 px and holds out 15% as a test split. You can add your own photos to `ml/dataset/<split>/<Ingredient Name>/` as well.
6. **Training**: `python ml/training/train.py` (MobileNetV3Large by default; `--architecture MobileNetV3Small` trains the lighter variant). Phase 1 trains a new classification head on a frozen ImageNet-pretrained MobileNetV3 with random flip, rotation, zoom, translation, contrast and brightness augmentation; phase 2 fine-tunes the top backbone layers at a cosine-decayed learning rate. Class weights compensate for ingredients with fewer photos, label smoothing is optional, and early stopping keeps the best epoch. After training it fits a calibration temperature on the validation set. The script writes `food_classifier.keras`, `model_meta.json` and refreshes `class_names.json`. Add `--candidate <name>` to train into `ml/models/candidates/<name>` without touching the live model, and `--promote <name>` to copy a candidate over the live one after it has been evaluated.
7. **Evaluation**: `python ml/evaluation/evaluate.py` scores the model on the held-out test split with the same pipeline the app uses. It reports single-view and test-time-augmentation accuracy, top-3 accuracy, macro and weighted precision/recall/F1, calibration error before and after temperature scaling, the confusion matrix and the most confused pairs. Results are saved to `report.json` and `confusion_matrix.png`, and the test metrics are recorded in `model_meta.json` (shown on the admin dashboard and reports). Use `--candidate <name>` to evaluate a candidate.
8. **Shipped model results** (28 ingredient classes, 1,965 training / 272 validation / 348 held-out test images): MobileNetV3Large scores 89.1% top-1 on a single view and **91.1% with test-time augmentation**, 97.4% top-3 accuracy and 0.909 macro F1, with a calibration error of 0.042. With the same pipeline MobileNetV3Small scored 84.8% top-1. A retraining experiment (class weights, label smoothing, deeper fine-tuning, cosine schedule) reached 95.6% validation accuracy but only 89.4% on the test split with augmentation, so it was not promoted; the validation split is small and early stopping selects on it, so the test split is the number to trust. Remaining mistakes are spread across visually similar pairs (apple vs. pomegranate, green chilli vs. capsicum, onion vs. garlic, potato vs. sweet potato), which is why the API always returns the top-3 candidates.
9. **Fallback**: if no trained model is found, or its output size does not match the configured classes, the API still starts with an untrained network that always reports low confidence, so users can pick from candidates or type ingredients instead.

---

## 9. Recommendation Engine Architecture

The recommendation engine combines **strict elimination filters** and **multi-factor compatibility scoring**:

### Phase 1: Strict Elimination
* **Zero Allergen Tolerance**: If recipe ingredients or allergy tags match ANY of the user's declared allergies, the recipe is immediately eliminated.
* **Diet Compliance**: Strict matching against user's diet (`Vegan`, `Vegetarian`, `Eggetarian`, `Non-Vegetarian`).
* **Avoided Foods Elimination**: Recipes mentioning avoided foods are discarded.

### Phase 2: Pantry Matching (`pantry_matcher.py`)
* Each recipe ingredient is a structured link to the catalog. Optional items and kitchen basics are excluded from the required set.
* `have` = required items in the pantry, `missing` = required items not available, `substitutions` = missing items covered by a listed substitute.
* `match_percent = (have + substitutions) / required`. Recipes with more than `max_missing` missing items, or that use nothing from the pantry, are dropped.
* Ranking: fewest missing items, highest coverage, uses soon-to-expire items, uses more pantry items, then the profile score below.

### Phase 3: Multi-Factor Scoring (normalised to 0-100)
Points are earned only for factors that apply to the request, then divided by the maximum achievable:
* **Calorie Proximity**: 20 (full within 100 kcal of the meal target, 60% within 250 kcal)
* **Protein Density**: 15 (full at 80% of the per-meal protein target, half at 50%)
* **Preferred Foods**: 10
* **Meal Type Match**: 10
* **Highlighted / Recognised Ingredient**: 10
* **Pantry Coverage**: 35 × share of ingredients already in the pantry
* **Feedback Adjustment**: `+5` for past positive rating, `-15` for negative rating

---

## 10. Automated Test Suite

Run the complete test suite:
```bash
pytest -v
```

Tests cover:
* Registration, duplicate prevention, JWT issuance, password verification, route protection, RBAC.
* Food and Nutrition CRUD and admin protection.
* Recipe filtering by diet, calories, and meal type.
* Zero-allergen elimination in recommendation engine.
* Daily and 7-day meal planning with calorie and macro targets.
* Computer vision valid, invalid, corrupted image handling, and history.
* Ingredient parsing (quantities, plurals, aliases), catalog autocomplete, pantry CRUD and isolation between users.
* "What can I cook?" ready / almost buckets, substitutions, kitchen basics, shopping list, unrecognised ingredients and pantry-aware recommendations.
* Nutrition goals, intolerance filtering, password change, reminder settings, plan skipping, recipe view logging, variety ranking, personal insights, admin user/category management, model evaluation report and scan deletion.
* Quantity-aware pantry matching, pantry deduction after cooking, shopping list lifecycle, plan swap / lock / complete, disliked-food exclusion and recipe ratings.
* Admin dashboard and reports computed from real data, activity-level calorie targets, and recognition history serialization.

---

## 11. Frontend Integration Guide

The backend is built specifically to integrate with React + Vite using Axios:

```javascript
// Example Axios client setup in React
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Automatic JWT injection
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Example "What can I cook?" call
export const whatCanICook = async (ingredients) => {
  const response = await api.post('/pantry/suggest', { ingredients, max_missing: 2 });
  return response.data; // { success: true, data: { results: [{ status, recipe, have, missing, ... }], shopping_list, ... } }
};

// Example ingredient recognition call
export const recognizeIngredient = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('add_to_pantry', 'true');
  const response = await api.post('/recognition/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // { success: true, data: { food_name, confidence, candidates, in_pantry, recommended_recipes, ... } }
};
```
