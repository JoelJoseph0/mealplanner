import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserContext } from '../context/UserContext';
import AppRoutes from '../routes/AppRoutes';

// Mock sub-pages to isolate navigation and route-guard behavior
vi.mock('../pages/auth/Login', () => ({
  default: () => <div data-testid="login-page">Login Page Content</div>,
}));

vi.mock('../pages/auth/Register', () => ({
  default: () => <div data-testid="register-page">Register Page Content</div>,
}));

vi.mock('../pages/user/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Overview</div>,
}));

vi.mock('../pages/user/Profile', () => ({
  default: () => <div data-testid="profile-page">User Profile Details</div>,
}));

vi.mock('../pages/user/Preferences', () => ({
  default: () => <div data-testid="preferences-page">User Dietary Preferences</div>,
}));

vi.mock('../pages/pantry/Pantry', () => ({
  default: () => <div data-testid="pantry-page">My Pantry Stock</div>,
}));

vi.mock('../pages/pantry/WhatCanICook', () => ({
  default: () => <div data-testid="cook-page">Pantry Recipe Finder</div>,
}));

vi.mock('../pages/food/FoodUpload', () => ({
  default: () => <div data-testid="food-upload-page">Computer Vision Upload</div>,
}));

vi.mock('../pages/food/FoodRecognition', () => ({
  default: () => <div data-testid="food-recognition-page">Vision Prediction Details</div>,
}));

vi.mock('../pages/food/NutritionDetails', () => ({
  default: () => <div data-testid="nutrition-details-page">Nutrition Breakdown Page</div>,
}));

vi.mock('../pages/meals/Recommendations', () => ({
  default: () => <div data-testid="recommendations-page">Smart Meal Recommendations</div>,
}));

vi.mock('../pages/meals/DailyPlan', () => ({
  default: () => <div data-testid="daily-plan-page">Daily Meal Plan Page</div>,
}));

vi.mock('../pages/meals/WeeklyPlan', () => ({
  default: () => <div data-testid="weekly-plan-page">Weekly Meal Plan Page</div>,
}));

vi.mock('../pages/meals/RecipeDetails', () => ({
  default: () => <div data-testid="recipe-details-page">Recipe Preparation Instructions</div>,
}));

vi.mock('../pages/history/MealHistory', () => ({
  default: () => <div data-testid="meal-history-page">Consumption History & Feedback</div>,
}));

vi.mock('../pages/admin/AdminDashboard', () => ({
  default: () => <div data-testid="admin-dashboard-page">Admin Analytics Dashboard</div>,
}));

vi.mock('../pages/admin/Users', () => ({
  default: () => <div data-testid="admin-users-page">Admin User Management</div>,
}));

vi.mock('../pages/admin/Ingredients', () => ({
  default: () => <div data-testid="admin-ingredients-page">Admin Ingredient Catalog Management</div>,
}));

vi.mock('../pages/admin/Nutrition', () => ({
  default: () => <div data-testid="admin-nutrition-page">Admin Nutrition Configuration</div>,
}));

vi.mock('../pages/admin/Recipes', () => ({
  default: () => <div data-testid="admin-recipes-page">Admin Recipe Catalog</div>,
}));

vi.mock('../pages/admin/Reports', () => ({
  default: () => <div data-testid="admin-reports-page">Admin Analytical Reports</div>,
}));

// Helper to render application routes with custom auth/user state
const renderWithAuth = (
  initialRoute = '/',
  {
    user = null,
    token = null,
    loading = false,
    logout = vi.fn(),
    login = vi.fn(),
  } = {}
) => {
  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'admin';

  const authValue = {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };

  const userValue = {
    profile: user,
    preferences: null,
    loading: false,
    fetchUserData: vi.fn(),
    updateProfileState: vi.fn(),
    updatePreferencesState: vi.fn(),
    showToast: vi.fn(),
    toast: null,
  };

  return {
    ...render(
      <AuthContext.Provider value={authValue}>
        <UserContext.Provider value={userValue}>
          <MemoryRouter initialEntries={[initialRoute]}>
            <AppRoutes />
          </MemoryRouter>
        </UserContext.Provider>
      </AuthContext.Provider>
    ),
    logout,
    login,
  };
};

describe('Frontend Navigation & Route Guards Suite', () => {
  const mockRegularUser = {
    id: 1,
    full_name: 'Rahul Sharma',
    email: 'rahul@example.com',
    role: 'user',
  };

  const mockAdminUser = {
    id: 2,
    full_name: 'System Admin',
    email: 'admin@mealplanner.com',
    role: 'admin',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Public Routes & Unauthenticated Protection', () => {
    it('renders the login page when navigating to /login', () => {
      renderWithAuth('/login');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.getByText('Smart Meal Planner')).toBeInTheDocument();
    });

    it('renders the register page when navigating to /register', () => {
      renderWithAuth('/register');
      expect(screen.getByTestId('register-page')).toBeInTheDocument();
      expect(screen.getByText('Smart Meal Planner')).toBeInTheDocument();
    });

    it('redirects already-authenticated users from /login to /dashboard', () => {
      renderWithAuth('/login', {
        user: mockRegularUser,
        token: 'valid-jwt-token-123',
      });
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated users trying to access /dashboard to /login', () => {
      renderWithAuth('/dashboard');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated users trying to access /daily-plan to /login', () => {
      renderWithAuth('/daily-plan');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('daily-plan-page')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated users trying to access /weekly-plan to /login', () => {
      renderWithAuth('/weekly-plan');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('weekly-plan-page')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated users trying to access /recommendations to /login', () => {
      renderWithAuth('/recommendations');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('recommendations-page')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated users trying to access /admin to /login', () => {
      renderWithAuth('/admin');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-dashboard-page')).not.toBeInTheDocument();
    });
  });

  describe('2. Protected User Navigation & Links', () => {
    it('redirects root / to /dashboard for authenticated users', () => {
      renderWithAuth('/', {
        user: mockRegularUser,
        token: 'user-token',
      });
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('renders all expected user navigation links in the sidebar', () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: /My Pantry/i })).toHaveAttribute('href', '/pantry');
      expect(screen.getByRole('link', { name: /What Can I Cook/i })).toHaveAttribute('href', '/cook');
      expect(screen.getByRole('link', { name: /Scan Ingredients/i })).toHaveAttribute('href', '/food-upload');
      expect(screen.getByRole('link', { name: /Meal Recommendations/i })).toHaveAttribute('href', '/recommendations');
      expect(screen.getByRole('link', { name: /Daily Plan/i })).toHaveAttribute('href', '/daily-plan');
      expect(screen.getByRole('link', { name: /Weekly Plan/i })).toHaveAttribute('href', '/weekly-plan');
      expect(screen.getByRole('link', { name: /Recipes/i })).toHaveAttribute('href', '/recipes');
      expect(screen.getByRole('link', { name: /Meal History/i })).toHaveAttribute('href', '/meal-history');
      expect(screen.getByRole('link', { name: /Profile/i })).toHaveAttribute('href', '/profile');
      expect(screen.getByRole('link', { name: /Preferences/i })).toHaveAttribute('href', '/preferences');
    });

    it('renders user details in the layout header and sidebar', () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('rahul@example.com')).toBeInTheDocument();
    });

    it('navigates to Daily Plan when Daily Plan link is clicked', async () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      const dailyLink = screen.getByRole('link', { name: /Daily Plan/i });
      fireEvent.click(dailyLink);

      await waitFor(() => {
        expect(screen.getByTestId('daily-plan-page')).toBeInTheDocument();
      });
    });

    it('navigates to Weekly Plan when Weekly Plan link is clicked', async () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      const weeklyLink = screen.getByRole('link', { name: /Weekly Plan/i });
      fireEvent.click(weeklyLink);

      await waitFor(() => {
        expect(screen.getByTestId('weekly-plan-page')).toBeInTheDocument();
      });
    });

    it('navigates to Recommendations when Recommendations link is clicked', async () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      const recLink = screen.getByRole('link', { name: /Meal Recommendations/i });
      fireEvent.click(recLink);

      await waitFor(() => {
        expect(screen.getByTestId('recommendations-page')).toBeInTheDocument();
      });
    });

    it('navigates to Food Upload when Scan Ingredients link is clicked', async () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      const uploadLink = screen.getByRole('link', { name: /Scan Ingredients/i });
      fireEvent.click(uploadLink);

      await waitFor(() => {
        expect(screen.getByTestId('food-upload-page')).toBeInTheDocument();
      });
    });

    it('navigates to My Pantry when the pantry link is clicked', async () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      fireEvent.click(screen.getByRole('link', { name: /My Pantry/i }));

      await waitFor(() => {
        expect(screen.getByTestId('pantry-page')).toBeInTheDocument();
      });
    });

    it('navigates to the recipe finder from both the sidebar and the header shortcut', async () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });

      fireEvent.click(screen.getByRole('link', { name: /Cook With What I Have/i }));

      await waitFor(() => {
        expect(screen.getByTestId('cook-page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('link', { name: /Dashboard/i }));
      fireEvent.click(screen.getByRole('link', { name: /What Can I Cook/i }));

      await waitFor(() => {
        expect(screen.getByTestId('cook-page')).toBeInTheDocument();
      });
    });

    it('redirects unauthenticated users trying to access /pantry to /login', () => {
      renderWithAuth('/pantry');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('triggers logout when Sign Out button is clicked', async () => {
      const mockLogout = vi.fn().mockResolvedValue();
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
        logout: mockLogout,
      });

      const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
      await act(async () => {
        fireEvent.click(signOutBtn);
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Role-Based Access Control & Admin Protection', () => {
    it('does not display Admin Console link for regular users', () => {
      renderWithAuth('/dashboard', {
        user: mockRegularUser,
        token: 'user-token',
      });
      expect(screen.queryByText(/Admin Console/i)).not.toBeInTheDocument();
    });

    it('redirects regular non-admin users attempting to access /admin back to /dashboard', () => {
      renderWithAuth('/admin', {
        user: mockRegularUser,
        token: 'user-token',
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-dashboard-page')).not.toBeInTheDocument();
    });

    it('displays Admin Console link in user sidebar for admin accounts', () => {
      renderWithAuth('/dashboard', {
        user: mockAdminUser,
        token: 'admin-token',
      });

      const adminLink = screen.getByRole('link', { name: /Admin Console/i });
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('allows admin users into /admin and renders AdminLayout with all admin links', () => {
      renderWithAuth('/admin', {
        user: mockAdminUser,
        token: 'admin-token',
      });

      expect(screen.getByTestId('admin-dashboard-page')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ingredients/i })).toHaveAttribute('href', '/admin/ingredients');
      expect(screen.getByRole('link', { name: /Nutrition/i })).toHaveAttribute('href', '/admin/nutrition');
      expect(screen.getByRole('link', { name: /Recipes/i })).toHaveAttribute('href', '/admin/recipes');
      expect(screen.getByRole('link', { name: /Reports/i })).toHaveAttribute('href', '/admin/reports');
      expect(screen.getByRole('link', { name: /Return to App View/i })).toHaveAttribute('href', '/dashboard');
    });

    it('navigates between admin sections smoothly', async () => {
      renderWithAuth('/admin', {
        user: mockAdminUser,
        token: 'admin-token',
      });

      // Click Recipes link in admin sidebar
      const recipesLink = screen.getByRole('link', { name: /Recipes/i });
      fireEvent.click(recipesLink);

      await waitFor(() => {
        expect(screen.getByTestId('admin-recipes-page')).toBeInTheDocument();
      });

      // Click Reports link
      const reportsLink = screen.getByRole('link', { name: /Reports/i });
      fireEvent.click(reportsLink);

      await waitFor(() => {
        expect(screen.getByTestId('admin-reports-page')).toBeInTheDocument();
      });
    });
  });

  describe('4. Legacy Admin Route', () => {
    it('redirects the old /admin/foods path to the ingredient catalog', () => {
      renderWithAuth('/admin/foods', {
        user: mockAdminUser,
        token: 'admin-token',
      });

      expect(screen.getByTestId('admin-ingredients-page')).toBeInTheDocument();
    });
  });

  describe('5. Catch-All Route Redirection', () => {
    it('redirects unknown paths to /dashboard for authenticated users', () => {
      renderWithAuth('/unknown/arbitrary/path-12345', {
        user: mockRegularUser,
        token: 'user-token',
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('redirects unknown paths to /login for unauthenticated users', () => {
      renderWithAuth('/unknown/arbitrary/path-12345');

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
