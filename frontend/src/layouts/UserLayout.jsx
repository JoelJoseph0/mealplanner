import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  Sparkles,
  Calendar,
  CalendarRange,
  BookOpen,
  History,
  User,
  Sliders,
  LogOut,
  Menu,
  X,
  Shield,
  UtensilsCrossed,
  Package,
  ChefHat,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const UserLayout = () => {
  const { user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Pantry', path: '/pantry', icon: Package },
    { name: 'What Can I Cook?', path: '/cook', icon: ChefHat },
    { name: 'Scan Ingredients', path: '/food-upload', icon: Camera },
    { name: 'Meal Recommendations', path: '/recommendations', icon: Sparkles },
    { name: 'Daily Plan', path: '/daily-plan', icon: Calendar },
    { name: 'Weekly Plan', path: '/weekly-plan', icon: CalendarRange },
    { name: 'Recipes', path: '/recipes', icon: BookOpen },
    { name: 'Meal History', path: '/meal-history', icon: History },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Preferences', path: '/preferences', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 block leading-tight">Smart Meal</span>
            <span className="text-[10px] text-emerald-600 font-semibold uppercase">Planner AI</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen z-20 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-500/30">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-slate-900 leading-tight">MealPlanner</h2>
            <span className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">Pantry to Plate</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {/* Admin Switch Link if user is Admin */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-slate-100">
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-72 bg-white h-full shadow-2xl z-50 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-800 text-sm">Meal Planner</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}

              {isAdmin && (
                <div className="pt-2">
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Console</span>
                  </Link>
                </div>
              )}
            </nav>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-red-600 bg-red-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 hidden md:flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-white/90">
          <div>
            <span className="text-xs text-slate-400 font-medium">MCA Final-Year AI Project</span>
            <p className="text-sm font-bold text-slate-800">Smart Meal Planner: Cook With What You Have</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/cook"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-colors"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Cook With What I Have</span>
            </Link>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <span className="text-xs font-bold text-slate-700">{user?.full_name || 'User'}</span>
            </div>
          </div>
        </header>

        {/* Child Page Outlet */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UserLayout;
