import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

// Auth Route Guards
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminRoute from '../components/auth/AdminRoute';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// User Pages
import Dashboard from '../pages/user/Dashboard';
import Profile from '../pages/user/Profile';
import Preferences from '../pages/user/Preferences';

import Pantry from '../pages/pantry/Pantry';
import WhatCanICook from '../pages/pantry/WhatCanICook';

// Food & Computer Vision Pages
import FoodUpload from '../pages/food/FoodUpload';
import FoodRecognition from '../pages/food/FoodRecognition';
import NutritionDetails from '../pages/food/NutritionDetails';

// Meals & Recipe Pages
import Recommendations from '../pages/meals/Recommendations';
import DailyPlan from '../pages/meals/DailyPlan';
import WeeklyPlan from '../pages/meals/WeeklyPlan';
import RecipeDetails from '../pages/meals/RecipeDetails';

// Meal History Page
import MealHistory from '../pages/history/MealHistory';

// Admin Suite Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import Users from '../pages/admin/Users';
import Ingredients from '../pages/admin/Ingredients';
import Nutrition from '../pages/admin/Nutrition';
import Recipes from '../pages/admin/Recipes';
import Reports from '../pages/admin/Reports';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected User Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/preferences" element={<Preferences />} />

          <Route path="/pantry" element={<Pantry />} />
          <Route path="/cook" element={<WhatCanICook />} />

          {/* Computer Vision & Nutrition */}
          <Route path="/food-upload" element={<FoodUpload />} />
          <Route path="/food-recognition" element={<FoodRecognition />} />
          <Route path="/nutrition" element={<NutritionDetails />} />
          <Route path="/nutrition/:foodId" element={<NutritionDetails />} />

          {/* Meal Planning & Recipes */}
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/daily-plan" element={<DailyPlan />} />
          <Route path="/weekly-plan" element={<WeeklyPlan />} />
          <Route path="/recipes" element={<RecipeDetails />} />
          <Route path="/recipes/:recipeId" element={<RecipeDetails />} />

          {/* History */}
          <Route path="/meal-history" element={<MealHistory />} />
        </Route>
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="ingredients" element={<Ingredients />} />
          <Route path="foods" element={<Navigate to="/admin/ingredients" replace />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Route>

      {/* Catch-all: Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
