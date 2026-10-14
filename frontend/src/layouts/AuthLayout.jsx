import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from './AppLayout';

const HIGHLIGHTS = [
  { emoji: '🍅', title: 'Tell us what you have', text: 'Type it or photograph it. Local names like thakkali work too.' },
  { emoji: '🍛', title: 'See what you can cook', text: 'Recipes you can make now, and ones that need just a couple of items.' },
  { emoji: '🛒', title: 'Plan and shop smarter', text: 'Balanced weekly plans and a shopping list that fills your pantry.' },
];

export const AuthLayout = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  }

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      <div className="hero-gradient relative m-3 hidden flex-col justify-between overflow-hidden rounded-[2rem] p-12 text-white shadow-lift lg:flex">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-6 top-24 flex flex-col gap-6 text-7xl" aria-hidden="true">
          <span className="animate-float">🍅</span>
          <span className="animate-float [animation-delay:1.5s] -translate-x-16">🥑</span>
          <span className="animate-float [animation-delay:3s]">🥕</span>
        </div>
        <div className="relative flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-xl" />
          <span className="font-display text-xl font-semibold">Meal Planner</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-5xl font-semibold leading-[1.1]">Cook with what you already have.</h1>
          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl ring-1 ring-inset ring-white/20 backdrop-blur" aria-hidden="true">
                  {item.emoji}
                </span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm opacity-85">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm opacity-75">Reduce waste, eat better, decide faster.</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <div className="flex items-center gap-2.5 lg:hidden">
            <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-bold text-fg">Meal Planner</span>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
