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
| `/dashboard` | Home: today's plan, what you can cook now, expiring items |
| `/pantry` | Kitchen: stock with quantities and expiry, plus the saved shopping list (`?tab=shopping`) |
| `/cook` | Cook: ready and almost-ready recipes, substitutions, add missing items to the shopping list, all recipes (`?tab=all`) |
| `/recipes/:id` | Recipe detail with cook mode; cooking deducts the pantry and logs the meal |
| `/plan` | Plan: create a day or week, swap, lock and complete meals, build the shopping list |
| `/scan` | Scan an ingredient photo, confirm it and add it to the kitchen |
| `/me` | Profile, diet and targets (`?tab=diet`), meal history (`?tab=history`) |
| `/welcome` | First-run setup wizard |
| `/admin`, `/admin/users`, `/admin/ingredients`, `/admin/recipes`, `/admin/reports` | Admin console |

Old routes such as `/recommendations`, `/daily-plan` and `/profile` redirect to the sections above. The five main sections appear as a sidebar on desktop and bottom tabs on mobile, with light and dark themes.

## Project layout

```text
src/
├── components/   Design system (ui), food visuals, shared widgets
├── context/      Auth and theme state
├── layouts/      App, admin and auth shells
├── lib/          React Query hooks
├── pages/        Route screens grouped by feature
├── routes/       Route table and guards
├── services/     Axios API clients (one per backend area)
└── utils/        Constants and helpers
```
