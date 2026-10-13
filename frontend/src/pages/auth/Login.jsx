import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/validators';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { getErrorMessage } from '../../services/api';

export const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setApiError(null);
  };

  const validate = () => {
    const newErrors = {};
    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      navigate('/dashboard');
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to fill demo credentials matching database seed
  const fillDemo = (role) => {
    if (role === 'admin') {
      setFormData({
        email: 'admin@mealplanner.com',
        password: 'Admin@123',
        rememberMe: true,
      });
    } else {
      setFormData({
        email: 'user@mealplanner.com',
        password: 'User@123',
        rememberMe: true,
      });
    }
    setErrors({});
    setApiError(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
        <p className="text-sm text-slate-500 mt-1">
          Sign in to access your meal plans, nutrition goals, and food vision scanner.
        </p>
      </div>

      {apiError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="name@example.com"
          icon={Mail}
          required
        />

        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Enter your password"
          icon={Lock}
          required
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Remember me</span>
          </label>

          <span className="text-emerald-700 font-semibold cursor-pointer hover:underline">
            Forgot password?
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          icon={LogIn}
          className="w-full mt-2"
        >
          Sign In
        </Button>
      </form>

      {/* Quick Fill Demo Helper */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick evaluation presets:
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemo('user')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-center"
          >
            Demo User
          </button>
          <button
            type="button"
            onClick={() => fillDemo('admin')}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/50 text-center"
          >
            Demo Admin
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        Don&apos;t have an account yet?{' '}
        <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-700">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default Login;
