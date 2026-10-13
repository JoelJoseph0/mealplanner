import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Flame,
  Activity,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Globe,
  Utensils,
  Package,
} from 'lucide-react';
import mealService from '../../services/mealService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import {
  getLocalizedWeekDays,
  getUserTimeZone,
  getFoodImage,
  FALLBACK_FOOD_IMAGES,
} from '../../utils/helpers';

export const WeeklyPlan = () => {
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute Monday-based today index: 0 is Mon, 1 is Tue, ..., 6 is Sun
  const todayDayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []);
  const [activeDayIndex, setActiveDayIndex] = useState(todayDayIndex);

  const navigate = useNavigate();

  // Detect user's timezone (updates dynamically for any country)
  const userTimeZone = useMemo(() => getUserTimeZone(), []);

  // Compute 7 days relative to local client time and weekOffset
  const weekDays = useMemo(() => getLocalizedWeekDays(weekOffset), [weekOffset]);

  const fetchWeeklyPlan = async (offset, startDate) => {
    setLoading(true);
    setError(null);
    try {
      const data = await mealService.getWeeklyPlan(offset, startDate);
      setWeeklyData(data);
    } catch (err) {
      setError('Unable to load weekly meal plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyPlan(weekOffset, weekDays[0]?.isoDate);
  }, [weekOffset, weekDays]);

  const handlePrevWeek = () => {
    setWeekOffset((prev) => prev - 1);
    setActiveDayIndex(0);
  };

  const handleCurrentWeek = () => {
    setWeekOffset(0);
    setActiveDayIndex(todayDayIndex);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
    setActiveDayIndex(0);
  };

  const handleGenerateWeek = async (usePantry = false) => {
    setRegenerating(usePantry ? 'pantry' : 'standard');
    setError(null);
    try {
      await mealService.generateWeeklyPlan({ startDate: weekDays[0]?.isoDate, usePantry });
      await fetchWeeklyPlan(weekOffset, weekDays[0]?.isoDate);
    } catch (err) {
      setError('Unable to regenerate weekly meal plan.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleViewRecipe = (meal) => {
    const targetRecipeId = meal.recipe_id || meal.recipe?.id;
    if (targetRecipeId) {
      navigate(`/recipes/${targetRecipeId}`);
    } else if (meal.food_name) {
      navigate(`/recipes?search=${encodeURIComponent(meal.food_name)}`);
    } else {
      navigate('/recipes');
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Compiling 7-day nutritional planner..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => fetchWeeklyPlan(weekOffset, weekDays[0]?.isoDate)} />;
  }

  const days = weeklyData?.days || [];
  const weeklyTotals = weeklyData?.weekly_totals || {
    average_daily_calories: 1940,
    average_protein: 118,
    average_carbs: 220,
    average_fat: 60,
  };

  const activeDay = days[activeDayIndex] || days[0];
  const activeWeekDay = weekDays[activeDayIndex] || weekDays[0];

  return (
    <div className="space-y-6">
      {/* Header and Week Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Comprehensive Overview
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Globe className="w-3 h-3 text-slate-500" />
              <span>{userTimeZone}</span>
            </span>
            {weekOffset === 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Current Week
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Weekly Meal Planner
          </h1>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-600">
            <span className="font-bold text-emerald-800 bg-emerald-50/80 px-2.5 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {weekDays[0]?.mediumDate} — {weekDays[6]?.mediumDate}
              </span>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 text-xs sm:text-sm">
              7-day planned macro balance automatically synchronized with your local calendar.
            </span>
          </div>
        </div>

        {/* Previous, Current, Next Week Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={Package}
            loading={regenerating === 'pantry'}
            disabled={Boolean(regenerating)}
            onClick={() => handleGenerateWeek(true)}
          >
            Plan From Pantry
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={RefreshCw}
            loading={regenerating === 'standard'}
            disabled={Boolean(regenerating)}
            onClick={() => handleGenerateWeek(false)}
          >
            Regenerate Week
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            onClick={handlePrevWeek}
            title="Go to previous week"
          >
            Prev
          </Button>

          <Button
            variant={weekOffset === 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleCurrentWeek}
          >
            Current Week
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleNextWeek}
            title="Go to next week"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Weekly Nutrition Summary Card */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
            Weekly Daily Average Intake
          </h3>
          <span className="text-xs text-emerald-200">
            Balanced for your dietary targets
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-xs text-emerald-100">Avg Calories</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {weeklyTotals.average_daily_calories} <span className="text-xs font-normal">kcal/day</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-xs text-emerald-100">Avg Protein</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {weeklyTotals.average_protein}g <span className="text-xs font-normal">/day</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-xs text-emerald-100">Avg Carbs</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {weeklyTotals.average_carbs}g <span className="text-xs font-normal">/day</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs">
            <span className="text-xs text-emerald-100">Avg Fat</span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {weeklyTotals.average_fat}g <span className="text-xs font-normal">/day</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Day Selector Pills with Dates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Day & View Schedule
          </span>
          <span className="text-xs text-slate-400">
            Dates formatted for {userTimeZone}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {days.map((d, index) => {
            const selected = activeDayIndex === index;
            const weekDay = weekDays[index];
            const isToday = weekDay?.isToday;

            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setActiveDayIndex(index)}
                className={`flex-1 min-w-[110px] p-3 rounded-2xl border text-center transition-all cursor-pointer relative ${
                  selected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/80 shadow-2xs'
                }`}
              >
                {/* Header row in pill: Day name & Today badge */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="block text-xs font-bold uppercase tracking-wider">
                    {d.day.substring(0, 3)}
                  </span>
                  {isToday && (
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                        selected
                          ? 'bg-white text-emerald-700'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      Today
                    </span>
                  )}
                </div>

                {/* Localized Date (e.g. "Oct 5" or "5 Oct") */}
                <div
                  className={`text-sm font-extrabold mt-1 ${
                    selected ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {weekDay?.shortDate || `Day ${index + 1}`}
                </div>

                {/* Calorie count */}
                <span
                  className={`text-[11px] block mt-1 ${
                    selected ? 'text-emerald-100 font-medium' : 'text-slate-400'
                  }`}
                >
                  {d.total_calories} kcal
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day's Schedule Breakdown */}
      {activeDay && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {activeDay.day}&apos;s Meal Schedule
                  </h3>
                  {activeWeekDay?.isToday && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      Today
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {activeWeekDay?.fullDate || activeDay.date}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                Day Total: {activeDay.total_calories} kcal
              </span>
              {activeDay.totals && (
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                  P: {Math.round(activeDay.totals.protein || 0)}g • C: {Math.round(activeDay.totals.carbohydrates || 0)}g • F: {Math.round(activeDay.totals.fat || 0)}g
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {activeDay.meals.map((meal) => (
              <div
                key={meal.id}
                className="group rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {meal.meal_type}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" /> {meal.calories} kcal
                    </span>
                  </div>

                  {/* Food Image with fallback */}
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 my-2 relative">
                    <img
                      src={getFoodImage(meal)}
                      alt={meal.food_name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_FOOD_IMAGES.default;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {meal.food_name}
                  </h4>

                  <div className="flex justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>P: <b className="text-slate-700">{meal.protein}g</b></span>
                    <span>C: <b className="text-slate-700">{meal.carbohydrates}g</b></span>
                    <span>F: <b className="text-slate-700">{meal.fat}g</b></span>
                  </div>
                </div>

                <div className="mt-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs flex items-center justify-center gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                    onClick={() => handleViewRecipe(meal)}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>View Recipe</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlan;
