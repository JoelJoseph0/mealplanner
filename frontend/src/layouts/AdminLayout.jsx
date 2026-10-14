import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, Carrot, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Brand, OfflineBanner, ThemeToggle, useOfflineBanner } from './AppLayout';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/ingredients', label: 'Ingredients', icon: Carrot },
  { to: '/admin/recipes', label: 'Recipes', icon: BookOpen },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const offline = useOfflineBanner();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-brand text-brand-fg shadow-glow' : 'text-muted hover:bg-surface-2 hover:text-fg'
    }`;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <aside className="glass sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-line lg:flex">
        <div className="px-5 py-5">
          <Brand />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-subtle">Admin console</p>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Admin navigation">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back to the app
          </Link>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{user?.full_name}</p>
              <p className="truncate text-xs text-subtle">{user?.email}</p>
            </div>
            <ThemeToggle className="!h-9 !w-9" />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {offline && <OfflineBanner />}
        <header className="glass sticky top-0 z-30 border-b border-line lg:hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <Brand />
            <div className="flex items-center gap-1">
              <Link to="/dashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2">
                App
              </Link>
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 no-scrollbar" aria-label="Admin navigation">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${linkClass({ isActive })} whitespace-nowrap`}>
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
