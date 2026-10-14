import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../services/api';
import { validateEmail, validatePassword } from '../../utils/validators';
import { isOnboarded } from '../../lib/onboarding';
import { Button, Input } from '../../components/ui';

export const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: null }));
    setApiError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    setApiError(null);
    try {
      const user = await login(form);
      if (user.role === 'admin') navigate('/admin');
      else navigate(isOnboarded(user.id) ? '/dashboard' : '/welcome');
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) =>
    setForm(
      role === 'admin'
        ? { email: 'admin@mealplanner.com', password: 'Admin@123' }
        : { email: 'user@mealplanner.com', password: 'User@123' }
    );

  return (
    <div>
      <h2 className="text-4xl font-semibold text-fg">Welcome back 👋</h2>
      <p className="mt-1 text-muted">Sign in to see what you can cook today.</p>

      {sessionExpired && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-info-soft p-3 text-sm font-medium text-info" role="status">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Your session expired. Please sign in again.
        </div>
      )}
      {apiError && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {apiError}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          icon={Mail}
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            icon={Lock}
            placeholder="Your password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-9 rounded p-1 text-subtle hover:text-fg"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button type="submit" size="lg" icon={LogIn} loading={loading} full>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-3xl border border-line bg-gradient-to-br from-brand-soft/70 to-surface p-4 shadow-card">
        <p className="text-sm font-bold text-fg">✨ Try the demo</p>
        <p className="mt-0.5 text-xs text-subtle">Fills in a ready-made account so you can explore straight away.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => fillDemo('user')}>
            Demo user
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fillDemo('admin')}>
            Demo admin
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default Login;
