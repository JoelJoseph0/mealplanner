import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import authService from '../../services/authService';
import { validateEmail, validatePassword, validatePasswordMatch } from '../../utils/validators';
import { GENDERS } from '../../utils/constants';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { getErrorMessage } from '../../services/api';

export const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: 'Male',
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setApiError(null);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    const emailErr = validateEmail(formData.email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validatePassword(formData.password);
    if (passErr) newErrors.password = passErr;

    const matchErr = validatePasswordMatch(formData.password, formData.confirmPassword);
    if (matchErr) newErrors.confirmPassword = matchErr;

    if (!formData.age || Number(formData.age) < 10 || Number(formData.age) > 120) {
      newErrors.age = 'Please enter a valid age (10 - 120)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      await authService.register({
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        age: Number(formData.age),
        gender: formData.gender,
      });

      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
        <p className="text-sm text-slate-500 mt-1">
          Join the Computer Vision Meal Planner for customized daily health nutrition.
        </p>
      </div>

      {apiError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{apiError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="fullName"
          autoComplete="name"
          value={formData.fullName}
          onChange={handleChange}
          error={errors.fullName}
          placeholder="e.g. Abhijith"
          icon={User}
          required
        />

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="Min. 6 chars"
            icon={Lock}
            required
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            placeholder="Repeat password"
            icon={Lock}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Age"
            name="age"
            type="number"
            value={formData.age}
            onChange={handleChange}
            error={errors.age}
            placeholder="e.g. 23"
            required
          />

          <Select
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={GENDERS}
            placeholder=""
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          icon={UserPlus}
          className="w-full mt-3"
        >
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700">
          Sign In
        </Link>
      </p>
    </div>
  );
};

export default Register;
