import { useState, useEffect } from 'react';
import { Sliders, Save, Plus, X, Check, ShieldAlert, Target, Heart, CheckCircle2 } from 'lucide-react';
import userService from '../../services/userService';
import { DIET_TYPES, ALLERGIES_LIST } from '../../utils/constants';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getErrorMessage } from '../../services/api';

const normalizeAllergies = (saved = []) => {
  const result = [];
  saved.forEach((raw) => {
    const value = String(raw).trim();
    if (!value) return;
    const lower = value.toLowerCase();
    const match = ALLERGIES_LIST.find((item) => {
      const option = item.toLowerCase();
      return option === lower || `${option}s` === lower || option === `${lower}s`;
    });
    const label = match || value;
    if (!result.includes(label)) result.push(label);
  });
  return result;
};

export const Preferences = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [dietType, setDietType] = useState('Non-Vegetarian');
  const [allergies, setAllergies] = useState([]);
  const [preferredFoods, setPreferredFoods] = useState([]);
  const [avoidFoods, setAvoidFoods] = useState([]);

  const [newPreferred, setNewPreferred] = useState('');
  const [newAvoid, setNewAvoid] = useState('');

  const [targets, setTargets] = useState({
    daily_calories: 2200,
    protein_target: 130,
    carbohydrate_target: 250,
    fat_target: 65,
  });

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getPreferences();
      setDietType(data.diet_type || 'None');
      setAllergies(normalizeAllergies(data.allergies || []));
      setPreferredFoods(data.preferred_foods || []);
      setAvoidFoods(data.avoid_foods || []);
      setTargets({
        daily_calories: data.daily_calories || 2000,
        protein_target: data.protein_target || 120,
        carbohydrate_target: data.carbohydrate_target || 230,
        fat_target: data.fat_target || 60,
      });
    } catch (err) {
      setError('Failed to fetch dietary preferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const toggleAllergy = (allergy) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const handleAddPreferred = (e) => {
    e.preventDefault();
    if (!newPreferred.trim()) return;
    if (!preferredFoods.includes(newPreferred.trim())) {
      setPreferredFoods([...preferredFoods, newPreferred.trim()]);
    }
    setNewPreferred('');
  };

  const removePreferred = (item) => {
    setPreferredFoods(preferredFoods.filter((f) => f !== item));
  };

  const handleAddAvoid = (e) => {
    e.preventDefault();
    if (!newAvoid.trim()) return;
    if (!avoidFoods.includes(newAvoid.trim())) {
      setAvoidFoods([...avoidFoods, newAvoid.trim()]);
    }
    setNewAvoid('');
  };

  const removeAvoid = (item) => {
    setAvoidFoods(avoidFoods.filter((f) => f !== item));
  };

  const handleTargetChange = (e) => {
    const { name, value } = e.target;
    setTargets((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      diet_type: dietType,
      allergies,
      preferred_foods: preferredFoods,
      avoid_foods: avoidFoods,
      ...targets,
    };

    try {
      await userService.updatePreferences(payload);
      setSuccess('Dietary preferences and nutrition targets updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading your dietary profile..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Dietary Profile & Preferences
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Specify your nutritional targets, allergy exclusions, and culinary inclinations for personalized meal recommendations.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Diet Type Selector */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Heart className="w-4 h-4 text-emerald-600" /> Diet Type
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Select the primary dietary philosophy that fits your lifestyle.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {DIET_TYPES.map((dt) => {
              const selected = dietType === dt.value;
              return (
                <button
                  type="button"
                  key={dt.value}
                  onClick={() => setDietType(dt.value)}
                  className={`px-3 py-3 rounded-2xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    selected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {dt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Allergies Multiple Selection */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" /> Allergies & Food Restrictions
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Computer vision recommendations will automatically omit dishes containing selected allergens.
          </p>

          <div className="flex flex-wrap gap-2">
            {[...ALLERGIES_LIST, ...allergies.filter((a) => !ALLERGIES_LIST.includes(a))].map((allergy) => {
              const checked = allergies.includes(allergy);
              return (
                <button
                  type="button"
                  key={allergy}
                  onClick={() => toggleAllergy(allergy)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    checked
                      ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                      checked ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  {allergy}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Foods & Avoid Foods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Preferred Foods */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Preferred Foods</h4>
              <p className="text-xs text-slate-500 mb-3">Dishes or ingredients you enjoy.</p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newPreferred}
                  onChange={(e) => setNewPreferred(e.target.value)}
                  placeholder="e.g. Salmon, Oats"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPreferred(e);
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddPreferred}
                  icon={Plus}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {preferredFoods.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-100"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removePreferred(item)}
                      className="hover:text-emerald-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Avoid Foods */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Avoid Foods</h4>
              <p className="text-xs text-slate-500 mb-3">Dishes or items you prefer to exclude.</p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newAvoid}
                  onChange={(e) => setNewAvoid(e.target.value)}
                  placeholder="e.g. Palm oil, Soda"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAvoid(e);
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddAvoid}
                  icon={Plus}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {avoidFoods.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeAvoid(item)}
                      className="hover:text-slate-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Nutrition Targets */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" /> Daily Nutrition Targets
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Calorie and macronutrient benchmarks for meal plan generation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Daily Calories (kcal)"
              name="daily_calories"
              type="number"
              value={targets.daily_calories}
              onChange={handleTargetChange}
              required
            />

            <Input
              label="Protein Target (g)"
              name="protein_target"
              type="number"
              value={targets.protein_target}
              onChange={handleTargetChange}
              required
            />

            <Input
              label="Carbohydrate (g)"
              name="carbohydrate_target"
              type="number"
              value={targets.carbohydrate_target}
              onChange={handleTargetChange}
              required
            />

            <Input
              label="Fat Target (g)"
              name="fat_target"
              type="number"
              value={targets.fat_target}
              onChange={handleTargetChange}
              required
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            icon={Save}
          >
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Preferences;
