import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, Flame, Sparkles, Plus, Clock, CheckCircle, Package } from 'lucide-react';
import mealService from '../../services/mealService';
import MealCard from '../../components/meals/MealCard';
import ProgressBar from '../../components/common/ProgressBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';

export const DailyPlan = () => {
  const [dailyPlan, setDailyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mealService.getDailyPlan();
      setDailyPlan(data);
    } catch (err) {
      setError('Failed to load daily meal schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleGenerate = async (usePantry = false) => {
    setRegenerating(usePantry ? 'pantry' : 'standard');
    setError(null);
    try {
      await mealService.generateMealPlan({ date: dailyPlan?.date, usePantry });
      const refreshed = await mealService.getDailyPlan(dailyPlan?.date);
      setDailyPlan(refreshed);
      setSuccess(
        usePantry
          ? 'New plan generated, favouring recipes you can make from your pantry!'
          : 'A new daily meal plan was generated successfully!'
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError('Unable to regenerate plan. Please check backend connection.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggleComplete = (meal) => {
    if (!dailyPlan) return;
    const updatedMeals = dailyPlan.meals.map((m) =>
      m.id === meal.id ? { ...m, completed: !m.completed } : m
    );
    setDailyPlan({ ...dailyPlan, meals: updatedMeals });
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Arranging your daily meal slots..." />;
  }

  const totals = dailyPlan?.totals || { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };
  const target = dailyPlan?.target || { calories: 2000, protein: 120, carbohydrates: 220, fat: 60 };
  const meals = dailyPlan?.meals || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Smart Meal Planning
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Today&apos;s Daily Plan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Carefully partitioned across 5 timed meal slots to maintain steady metabolic energy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            icon={Package}
            size="sm"
            loading={regenerating === 'pantry'}
            disabled={Boolean(regenerating)}
            onClick={() => handleGenerate(true)}
          >
            Plan From My Pantry
          </Button>
          <Button
            variant="primary"
            icon={RefreshCw}
            size="sm"
            loading={regenerating === 'standard'}
            disabled={Boolean(regenerating)}
            onClick={() => handleGenerate(false)}
          >
            Regenerate Plan
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Daily Nutritional Totals Hero Strip */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Daily Cumulative Totals vs Targets
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-xs text-emerald-700 font-semibold uppercase">Total Calories</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totals.calories}{' '}
              <span className="text-xs font-normal text-slate-500">/ {target.calories} kcal</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={totals.calories} max={target.calories} color="emerald" size="sm" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
            <span className="text-xs text-blue-700 font-semibold uppercase">Total Protein</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totals.protein}{' '}
              <span className="text-xs font-normal text-slate-500">/ {target.protein} g</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={totals.protein} max={target.protein} color="blue" size="sm" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
            <span className="text-xs text-amber-700 font-semibold uppercase">Total Carbs</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totals.carbohydrates}{' '}
              <span className="text-xs font-normal text-slate-500">/ {target.carbohydrates} g</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={totals.carbohydrates} max={target.carbohydrates} color="amber" size="sm" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100">
            <span className="text-xs text-purple-700 font-semibold uppercase">Total Fat</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {totals.fat}{' '}
              <span className="text-xs font-normal text-slate-500">/ {target.fat} g</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={totals.fat} max={target.fat} color="purple" size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* 5 Meal Slots List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Scheduled Meals</h3>
        <div className="space-y-3">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onToggleComplete={handleToggleComplete}
              onViewRecipe={(target) => {
                if (typeof target === 'number' || (!isNaN(Number(target)) && !isNaN(parseFloat(target)))) {
                  navigate(`/recipes/${target}`);
                } else if (typeof target === 'string') {
                  navigate(`/recipes?search=${encodeURIComponent(target)}`);
                } else {
                  navigate('/recipes');
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyPlan;
