import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { validateEmail, validatePassword, validatePasswordMatch } from '../../utils/validators';
import { Button, Input } from '../../components/ui';

export const Register = () => {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: null }));
    setApiError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {
      fullName: form.fullName.trim().length < 2 ? 'Please enter your name' : null,
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword: validatePasswordMatch(form.password, form.confirmPassword),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    setApiError(null);
    try {
      await authService.register({ full_name: form.fullName.trim(), email: form.email.trim(), password: form.password });
      await login({ email: form.email.trim(), password: form.password });
      navigate('/welcome');
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-4xl font-semibold text-fg">Create your account 🌱</h2>
      <p className="mt-1 text-muted">It takes a minute, then we will set up your kitchen.</p>

      {apiError && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {apiError}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Input label="Full name" icon={User} autoComplete="name" placeholder="Your name" value={form.fullName} onChange={update('fullName')} error={errors.fullName} />
        <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update('email')} error={errors.email} />
        <Input label="Password" type="password" icon={Lock} autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={update('password')} error={errors.password} />
        <Input label="Confirm password" type="password" icon={Lock} autoComplete="new-password" placeholder="Repeat password" value={form.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} />
        <Button type="submit" size="lg" icon={UserPlus} loading={loading} full>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Register;
