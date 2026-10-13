import { useState, useEffect } from 'react';
import { User, Mail, Activity, Heart, Save, X, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import userService from '../../services/userService';
import { GENDERS, ACTIVITY_LEVELS } from '../../utils/constants';
import { calculateBMI } from '../../utils/helpers';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getErrorMessage } from '../../services/api';

export const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    age: '',
    gender: 'Male',
    height: '',
    weight: '',
    activity_level: 'Moderately Active',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getProfile();
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        age: data.age || '',
        gender: data.gender || 'Male',
        height: data.height || '',
        weight: data.weight || '',
        activity_level: data.activity_level || 'Moderately Active',
      });
    } catch (err) {
      setError('Failed to fetch profile information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        age: profile.age || '',
        gender: profile.gender || 'Male',
        height: profile.height || '',
        weight: profile.weight || '',
        activity_level: profile.activity_level || 'Moderately Active',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...formData,
        age: Number(formData.age),
        height: Number(formData.height),
        weight: Number(formData.weight),
      };
      const res = await userService.updateProfile(payload);
      setProfile(res);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading profile information..." />;
  }

  const bmi = calculateBMI(formData.height, formData.weight);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Health Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your personal metrics to ensure computer vision meal targets match your body.
          </p>
        </div>

        {!isEditing && (
          <Button
            variant="primary"
            icon={Edit3}
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {error && <ErrorMessage message={error} />}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Full Name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              disabled={!isEditing}
              icon={User}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!isEditing}
              icon={Mail}
              required
            />

            <Input
              label="Age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />

            <Select
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              options={GENDERS}
              disabled={!isEditing}
              required
            />

            <Input
              label="Height (cm)"
              name="height"
              type="number"
              value={formData.height}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. 175"
              required
            />

            <Input
              label="Weight (kg)"
              name="weight"
              type="number"
              value={formData.weight}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. 70"
              required
            />
          </div>

          <div>
            <Select
              label="Activity Level"
              name="activity_level"
              value={formData.activity_level}
              onChange={handleChange}
              options={ACTIVITY_LEVELS}
              disabled={!isEditing}
              placeholder=""
              required
            />
          </div>

          {/* BMI Analysis Card */}
          {bmi && (
            <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Calculated BMI Index
                  </span>
                  <span className="text-lg font-extrabold text-slate-900">{bmi.value} kg/m²</span>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-xl text-xs font-bold ${bmi.color}`}>
                Classification: {bmi.category}
              </span>
            </div>
          )}

          {/* Action Buttons when editing */}
          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCancel}
                disabled={saving}
                icon={X}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={saving}
                icon={Save}
              >
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;
