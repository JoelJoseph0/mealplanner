import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AppRoutes from '../routes/AppRoutes';

const stub = (id, text) => ({ default: () => <div data-testid={id}>{text}</div> });

vi.mock('../pages/auth/Login', () => stub('login-page', 'Login'));
vi.mock('../pages/auth/Register', () => stub('register-page', 'Register'));
vi.mock('../pages/user/Welcome', () => stub('welcome-page', 'Welcome'));
vi.mock('../pages/user/Home', () => stub('home-page', 'Home'));
vi.mock('../pages/kitchen/Kitchen', () => stub('kitchen-page', 'Kitchen'));
vi.mock('../pages/cook/Cook', () => stub('cook-page', 'Cook'));
vi.mock('../pages/cook/RecipeDetail', () => stub('recipe-page', 'Recipe'));
vi.mock('../pages/plan/Plan', () => stub('plan-page', 'Plan'));
vi.mock('../pages/me/Me', () => stub('me-page', 'Me'));
vi.mock('../pages/scan/Scan', () => stub('scan-page', 'Scan'));
vi.mock('../pages/scan/NutritionDetail', () => stub('nutrition-page', 'Nutrition'));
vi.mock('../pages/admin/AdminDashboard', () => stub('admin-dashboard-page', 'Admin overview'));
vi.mock('../pages/admin/Users', () => stub('admin-users-page', 'Admin users'));
vi.mock('../pages/admin/Ingredients', () => stub('admin-ingredients-page', 'Admin ingredients'));
vi.mock('../pages/admin/Recipes', () => stub('admin-recipes-page', 'Admin recipes'));
vi.mock('../pages/admin/Reports', () => stub('admin-reports-page', 'Admin reports'));

const regularUser = { id: 1, full_name: 'Rahul Sharma', email: 'rahul@example.com', role: 'user' };
const adminUser = { id: 2, full_name: 'System Admin', email: 'admin@mealplanner.com', role: 'admin' };

const renderAt = (route, { user = null, logout = vi.fn() } = {}) => {
  const value = {
    user,
    token: user ? 'token' : null,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login: vi.fn(),
    logout,
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>
  );
  return { logout };
};

describe('route guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the login page to guests', async () => {
    renderAt('/login');
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });

  it('shows the register page to guests', async () => {
    renderAt('/register');
    expect(await screen.findByTestId('register-page')).toBeInTheDocument();
  });

  it.each(['/dashboard', '/pantry', '/cook', '/plan', '/me', '/scan', '/admin'])(
    'sends guests from %s to login',
    async (path) => {
      renderAt(path);
      expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    }
  );

  it('sends signed-in users away from login', async () => {
    renderAt('/login', { user: regularUser });
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
  });

  it('sends admins from login to the admin console', async () => {
    renderAt('/login', { user: adminUser });
    expect(await screen.findByTestId('admin-dashboard-page')).toBeInTheDocument();
  });

  it('keeps regular users out of the admin console', async () => {
    renderAt('/admin', { user: regularUser });
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-dashboard-page')).not.toBeInTheDocument();
  });
});

describe('main navigation', () => {
  it('redirects the root path to home', async () => {
    renderAt('/', { user: regularUser });
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
  });

  it('lists the five sections', async () => {
    renderAt('/dashboard', { user: regularUser });
    await screen.findByTestId('home-page');
    const expected = { Home: '/dashboard', Kitchen: '/pantry', Cook: '/cook', Plan: '/plan', Me: '/me' };
    Object.entries(expected).forEach(([name, href]) => {
      const links = screen.getAllByRole('link', { name });
      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => expect(link).toHaveAttribute('href', href));
    });
  });

  it.each([
    ['Kitchen', 'kitchen-page'],
    ['Cook', 'cook-page'],
    ['Plan', 'plan-page'],
    ['Me', 'me-page'],
  ])('opens %s from the navigation', async (name, testId) => {
    renderAt('/dashboard', { user: regularUser });
    await screen.findByTestId('home-page');
    fireEvent.click(screen.getAllByRole('link', { name })[0]);
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it('shows the signed-in user name', async () => {
    renderAt('/dashboard', { user: regularUser });
    await screen.findByTestId('home-page');
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('rahul@example.com')).toBeInTheDocument();
  });

  it('signs out from the sidebar', async () => {
    const { logout } = renderAt('/dashboard', { user: regularUser });
    await screen.findByTestId('home-page');
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /sign out/i })[0]);
    });
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('hides the admin link from regular users', async () => {
    renderAt('/dashboard', { user: regularUser });
    await screen.findByTestId('home-page');
    expect(screen.queryByText(/admin console/i)).not.toBeInTheDocument();
  });

  it('shows the admin link to admins', async () => {
    renderAt('/dashboard', { user: adminUser });
    await screen.findByTestId('home-page');
    expect(screen.getByRole('link', { name: /admin console/i })).toHaveAttribute('href', '/admin');
  });
});

describe('legacy routes', () => {
  it.each([
    ['/food-upload', 'scan-page'],
    ['/recommendations', 'cook-page'],
    ['/daily-plan', 'plan-page'],
    ['/weekly-plan', 'plan-page'],
    ['/profile', 'me-page'],
    ['/preferences', 'me-page'],
    ['/meal-history', 'me-page'],
    ['/recipes', 'cook-page'],
  ])('redirects %s', async (path, testId) => {
    renderAt(path, { user: regularUser });
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it('keeps recipe detail routes', async () => {
    renderAt('/recipes/12', { user: regularUser });
    expect(await screen.findByTestId('recipe-page')).toBeInTheDocument();
  });
});

describe('admin console', () => {
  it.each([
    ['/admin', 'admin-dashboard-page'],
    ['/admin/users', 'admin-users-page'],
    ['/admin/ingredients', 'admin-ingredients-page'],
    ['/admin/recipes', 'admin-recipes-page'],
    ['/admin/reports', 'admin-reports-page'],
    ['/admin/foods', 'admin-ingredients-page'],
    ['/admin/nutrition', 'admin-ingredients-page'],
  ])('renders %s for admins', async (path, testId) => {
    renderAt(path, { user: adminUser });
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it('navigates between admin pages', async () => {
    renderAt('/admin', { user: adminUser });
    await screen.findByTestId('admin-dashboard-page');
    fireEvent.click(screen.getAllByRole('link', { name: 'Reports' })[0]);
    await waitFor(() => expect(screen.getByTestId('admin-reports-page')).toBeInTheDocument());
  });
});
