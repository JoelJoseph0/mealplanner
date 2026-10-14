import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { CalendarDays, ChefHat, Home, LogOut, Moon, Refrigerator, ScanLine, Shield, Sun, UserRound, WifiOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui';

const NAV = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/pantry', label: 'Kitchen', icon: Refrigerator },
  { to: '/cook', label: 'Cook', icon: ChefHat },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/me', label: 'Me', icon: UserRound },
];

export const useOfflineBanner = () => {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener('api:offline', down);
    window.addEventListener('api:online', up);
    return () => {
      window.removeEventListener('api:offline', down);
      window.removeEventListener('api:online', up);
    };
  }, []);
  return offline;
};

export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg ${className}`}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

export const Brand = ({ compact = false }) => (
  <Link to="/dashboard" className="group flex items-center gap-2.5" aria-label="Smart Meal Planner home">
    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-[#2bb673] shadow-glow transition-transform group-hover:-rotate-6">
      <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-lg" />
    </span>
    {!compact && (
      <span className="leading-none">
        <span className="block font-display text-lg font-semibold text-fg">Meal Planner</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">Cook smart</span>
      </span>
    )}
  </Link>
);

export const OfflineBanner = () => (
  <div className="flex items-center justify-center gap-2 bg-danger px-4 py-2 text-sm font-semibold text-white" role="alert">
    <WifiOff className="h-4 w-4" aria-hidden="true" />
    The server is not reachable. Your changes may not be saved until it is back.
  </div>
);

export const AppLayout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const offline = useOfflineBanner();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-all ${
      isActive ? 'bg-brand text-brand-fg shadow-glow' : 'text-muted hover:bg-surface-2 hover:text-fg'
    }`;

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <aside className="glass sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-line lg:flex">
        <div className="px-6 py-6">
          <Brand />
        </div>

        <nav className="flex-1 space-y-1.5 px-4" aria-label="Main navigation">
          <p className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">Menu</p>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/scan"
            className="hero-gradient relative mt-5 block overflow-hidden rounded-3xl p-4 text-white shadow-glow transition-transform hover:-translate-y-0.5"
          >
            <span className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <ScanLine className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="relative mt-3 block font-display text-base font-semibold">Scan an ingredient</span>
            <span className="relative block text-xs text-white/80">Snap a photo, we add it to your kitchen.</span>
            <span className="absolute -right-2 -top-1 text-5xl opacity-90 animate-float" aria-hidden="true">🥕</span>
          </Link>
        </nav>

        <div className="border-t border-line p-4">
          {isAdmin && (
            <Link
              to="/admin"
              className="mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg"
            >
              <Shield className="h-5 w-5" aria-hidden="true" />
              Admin console
            </Link>
          )}
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2/70 px-2.5 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-accent text-sm font-bold text-white shadow-card">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
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

        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-2.5 lg:hidden">
          <Brand compact />
          <div className="flex items-center gap-1">
            <Button to="/scan" variant="soft" size="sm" icon={ScanLine}>
              Scan
            </Button>
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
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <nav
        className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-3xl border border-line p-1.5 shadow-lift lg:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main navigation"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-bold transition-all ${
                isActive ? 'bg-brand text-brand-fg shadow-glow' : 'text-subtle hover:text-fg'
              }`
            }
          >
            <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
