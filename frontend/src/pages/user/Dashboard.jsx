import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Flame,
  Camera,
  Sparkles,
  Utensils,
  ArrowRight,
  ChefHat,
  Package,
  Timer,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import mealService from '../../services/mealService';
import pantryService from '../../services/pantryService';
import MealCard from '../../components/meals/MealCard';
import ProgressBar from '../../components/common/ProgressBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyPlan, setDailyPlan] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plan, pantry] = await Promise.all([
        mealService.getDailyPlan(),
        pantryService.getPantry().catch(() => []),
      ]);
      setDailyPlan(plan);
      setPantryItems(pantry || []);
    } catch (err) {
      setError('Unable to load daily meal plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleToggleMeal = (meal) => {
    if (!dailyPlan) return;
    const updatedMeals = dailyPlan.meals.map((m) =>
      m.id === meal.id ? { ...m, completed: !m.completed } : m
    );
    setDailyPlan({ ...dailyPlan, meals: updatedMeals });
  };

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading your personalized dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadDashboardData} />;
  }

  const meals = dailyPlan?.meals || [];
  const expiringSoon = pantryItems.filter((item) => item.expires_soon);
  const completedCount = meals.filter((m) => m.completed).length;
  const totals = dailyPlan?.totals || { calories: 1980, protein: 115, carbohydrates: 215, fat: 62 };
  const target = dailyPlan?.target || { calories: 2200, protein: 130, carbohydrates: 250, fat: 65 };

  return (
    <div className="space-y-8">
      {/* Welcome Hero Section */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> AI Health Companion
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-50 leading-relaxed">
            Tell us what is in your kitchen and we will show you what you can cook right now, plus balanced meal plans built around your pantry.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={ChefHat}
              onClick={() => navigate('/cook')}
              className="bg-white text-emerald-800 hover:bg-emerald-50 border-0 font-bold"
            >
              What Can I Cook?
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Camera}
              onClick={() => navigate('/food-upload')}
              className="text-white border-white/40 hover:bg-white/10"
            >
              Scan an Ingredient
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Calendar}
              onClick={() => navigate('/daily-plan')}
              className="text-white border-white/40 hover:bg-white/10"
            >
              Today&apos;s Full Schedule
            </Button>
          </div>
        </div>

        {/* Decorative Background Blob */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Meals Planned */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Meals Planned
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {meals.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">Across 5 meal slots</p>
        </div>

        {/* Meals Completed */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {completedCount} <span className="text-sm font-semibold text-slate-400">/ {meals.length}</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {Math.round((completedCount / (meals.length || 1)) * 100)}% completed
          </p>
        </div>

        {/* Calories Today */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Calories Today
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {totals.calories}
          </div>
          <p className="text-xs text-slate-400 mt-1">Goal: {target.calories} kcal</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/pantry')}
          className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs text-left hover:border-purple-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pantry Items
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {pantryItems.length}
          </div>
          <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
            {expiringSoon.length > 0 ? (
              <>
                <Timer className="w-3 h-3" /> {expiringSoon.length} to use soon
              </>
            ) : (
              'Ingredients in stock'
            )}
          </p>
        </button>
      </div>

      {/* Quick Action Buttons Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigate('/cook')}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 w-fit group-hover:scale-110 transition-transform">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="font-bold text-sm text-slate-900 block group-hover:text-emerald-700">
                What Can I Cook?
              </span>
              <span className="text-xs text-slate-400">Recipes from what you have</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/daily-plan')}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 w-fit group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="font-bold text-sm text-slate-900 block group-hover:text-blue-700">
                Plan Today&apos;s Meals
              </span>
              <span className="text-xs text-slate-400">Generate daily meal schedule</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 w-fit group-hover:scale-110 transition-transform">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="font-bold text-sm text-slate-900 block group-hover:text-amber-700">
                View Recipes
              </span>
              <span className="text-xs text-slate-400">Explore healthy culinary ideas</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/pantry')}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 w-fit group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="font-bold text-sm text-slate-900 block group-hover:text-purple-700">
                My Pantry
              </span>
              <span className="text-xs text-slate-400">Update the ingredients you have</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Grid: Today's Meal Plan & Nutrition Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Today's Meal Plan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Today&apos;s Meal Plan</h3>
              <p className="text-xs text-slate-500">Scheduled meals tailored to your diet</p>
            </div>
            <Link
              to="/daily-plan"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View Full Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {meals.slice(0, 4).map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onToggleComplete={handleToggleMeal}
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

        {/* Right Col: Nutrition Summary Progress */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Nutrition Summary</h3>
            <p className="text-xs text-slate-500">Daily intake progress versus targets</p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-5">
            {/* Calories Progress */}
            <div>
              <ProgressBar
                label="Calories (Energy)"
                value={totals.calories}
                max={target.calories}
                subLabel={`${totals.calories} / ${target.calories} kcal`}
                color="emerald"
                size="md"
              />
            </div>

            {/* Protein Progress */}
            <div>
              <ProgressBar
                label="Protein Target"
                value={totals.protein}
                max={target.protein}
                subLabel={`${totals.protein} / ${target.protein} g`}
                color="blue"
                size="md"
              />
            </div>

            {/* Carbohydrates Progress */}
            <div>
              <ProgressBar
                label="Carbohydrates Target"
                value={totals.carbohydrates}
                max={target.carbohydrates}
                subLabel={`${totals.carbohydrates} / ${target.carbohydrates} g`}
                color="amber"
                size="md"
              />
            </div>

            {/* Fat Progress */}
            <div>
              <ProgressBar
                label="Fat Target"
                value={totals.fat}
                max={target.fat}
                subLabel={`${totals.fat} / ${target.fat} g`}
                color="purple"
                size="md"
              />
            </div>

            {/* Target Settings shortcut */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Want to adjust your targets?</span>
              <Link
                to="/preferences"
                className="font-bold text-emerald-700 hover:text-emerald-800"
              >
                Edit Preferences
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
