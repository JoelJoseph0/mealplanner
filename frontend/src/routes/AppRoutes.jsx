import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import AdminLayout from '../layouts/AdminLayout';
import { Skeleton } from '../components/ui';

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const Welcome = lazy(() => import('../pages/user/Welcome'));
const Home = lazy(() => import('../pages/user/Home'));
const Kitchen = lazy(() => import('../pages/kitchen/Kitchen'));
const Cook = lazy(() => import('../pages/cook/Cook'));
const RecipeDetail = lazy(() => import('../pages/cook/RecipeDetail'));
const Plan = lazy(() => import('../pages/plan/Plan'));
const Me = lazy(() => import('../pages/me/Me'));
const Scan = lazy(() => import('../pages/scan/Scan'));
const NutritionDetail = lazy(() => import('../pages/scan/NutritionDetail'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const Users = lazy(() => import('../pages/admin/Users'));
const Ingredients = lazy(() => import('../pages/admin/Ingredients'));
const Recipes = lazy(() => import('../pages/admin/Recipes'));
const Reports = lazy(() => import('../pages/admin/Reports'));

const PageFallback = () => (
  <div className="space-y-4 p-6" role="status" aria-label="Loading page">
    <Skeleton className="h-9 w-56" />
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

const RequireAuth = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
};

const RequireAdmin = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

const RecipeRedirect = () => {
  const { recipeId } = useParams();
  return <Navigate to={recipeId ? `/recipes/${recipeId}` : '/cook?tab=all'} replace />;
};

export const AppRoutes = () => (
  <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/welcome" element={<Welcome />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/pantry" element={<Kitchen />} />
          <Route path="/cook" element={<Cook />} />
          <Route path="/recipes" element={<RecipeRedirect />} />
          <Route path="/recipes/:recipeId" element={<RecipeDetail />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/me" element={<Me />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/nutrition/:foodId" element={<NutritionDetail />} />

          <Route path="/food-upload" element={<Navigate to="/scan" replace />} />
          <Route path="/food-recognition" element={<Navigate to="/scan" replace />} />
          <Route path="/recommendations" element={<Navigate to="/cook" replace />} />
          <Route path="/daily-plan" element={<Navigate to="/plan" replace />} />
          <Route path="/weekly-plan" element={<Navigate to="/plan" replace />} />
          <Route path="/profile" element={<Navigate to="/me" replace />} />
          <Route path="/preferences" element={<Navigate to="/me?tab=diet" replace />} />
          <Route path="/meal-history" element={<Navigate to="/me?tab=history" replace />} />
        </Route>
      </Route>

      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="ingredients" element={<Ingredients />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="reports" element={<Reports />} />
          <Route path="foods" element={<Navigate to="/admin/ingredients" replace />} />
          <Route path="nutrition" element={<Navigate to="/admin/ingredients" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
