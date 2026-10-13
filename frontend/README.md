# Smart Meal Planner – Frontend

React 19 + Vite + Tailwind CSS 4 client for the Smart Meal Planner. Users tell the app what is in their kitchen (typed with autocomplete or scanned with the camera) and get recipes they can cook now, recipes that need one or two more items, and meal plans built around their pantry.

## Requirements

* Node.js 20+
* The FastAPI backend running at `http://localhost:8000` (see `../backend/README.md`)

## Setup

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173. The API address comes from `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Demo accounts (created by `python seed.py` in the backend):

| Role | Email | Password |
|---|---|---|
| User (sample pantry included) | `user@mealplanner.com` | `User@123` |
| Admin | `admin@mealplanner.com` | `Admin@123` |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest + Testing Library (routing and route guards) |

## Main screens

| Route | Screen |
|---|---|
| `/dashboard` | Overview: today's plan, pantry size, quick actions |
| `/pantry` | My Pantry: add ingredients with autocomplete, quantities and expiry dates |
| `/cook` | What Can I Cook?: ready / almost-ready recipes, substitutions, shopping list |
| `/food-upload` → `/food-recognition` | Scan an ingredient photo, confirm it and add it to the pantry |
| `/recipes`, `/recipes/:id` | Recipe library; detail page ticks off what you already have and logs cooked meals |
| `/recommendations` | Personalised, pantry-aware recommendations |
| `/daily-plan`, `/weekly-plan` | Balanced meal plans, optionally built from the pantry |
| `/meal-history` | Cooked meals with feedback that tunes recommendations |
| `/profile`, `/preferences` | Body metrics, diet type, allergies, preferred and avoided foods, targets |
| `/admin/*` | Admin dashboard, users, ingredient catalog, nutrition, recipes and reports |

## Project layout

```text
src/
├── components/   Reusable UI (common, pantry, meals, nutrition, admin, auth)
├── context/      Auth and user state
├── layouts/      User, admin and auth shells
├── pages/        Route screens grouped by feature
├── routes/       Route table and guards
├── services/     Axios API clients (one per backend area)
└── utils/        Constants, formatting helpers, validators
```
