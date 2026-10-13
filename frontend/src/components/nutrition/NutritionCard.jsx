import { Flame, PieChart, Activity, ShieldCheck } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';
import { calculateMacroPercentages } from '../../utils/helpers';

export const NutritionCard = ({
  nutrition,
  foodName,
  servingSize,
  category,
  dailyTargets = { calories: 2000, protein: 120, carbs: 220, fat: 60 },
}) => {
  if (!nutrition) return null;

  const { calories = 0, protein = 0, carbohydrates = 0, fat = 0, fiber = 0, sugar = 0 } = nutrition;
  const macroPercents = calculateMacroPercentages(protein, carbohydrates, fat);

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100">
        <div>
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Nutrition Profile
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">
            {foodName || nutrition.food_name || 'Nutritional Breakdown'}
          </h3>
          {(servingSize || nutrition.serving_size) && (
            <p className="text-xs text-slate-500 mt-1">
              Serving: <span className="font-semibold text-slate-700">{servingSize || nutrition.serving_size}</span>
            </p>
          )}
        </div>

        {(category || nutrition.category) && (
          <span className="self-start sm:self-auto px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200">
            {category || nutrition.category}
          </span>
        )}
      </div>

      {/* Hero Calories Banner */}
      <div className="my-5 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Energy</span>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {calories} <span className="text-sm font-semibold text-slate-500">kcal</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 block">Daily Target</span>
          <span className="text-sm font-bold text-slate-800">
            {Math.round((calories / (dailyTargets.calories || 2000)) * 100)}% of goal
          </span>
        </div>
      </div>

      {/* Primary Macronutrients 3-Col */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Protein */}
        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40">
          <div className="flex justify-between items-center text-xs font-semibold text-blue-900 mb-1">
            <span>Protein</span>
            <span className="font-bold">{protein}g</span>
          </div>
          <ProgressBar
            value={protein}
            max={dailyTargets.protein || 120}
            color="blue"
            size="sm"
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-blue-700">
            <span>{macroPercents.protein}% of calories</span>
            <span>Target: {dailyTargets.protein}g</span>
          </div>
        </div>

        {/* Carbohydrates */}
        <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40">
          <div className="flex justify-between items-center text-xs font-semibold text-amber-900 mb-1">
            <span>Carbohydrates</span>
            <span className="font-bold">{carbohydrates}g</span>
          </div>
          <ProgressBar
            value={carbohydrates}
            max={dailyTargets.carbs || 220}
            color="amber"
            size="sm"
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-amber-700">
            <span>{macroPercents.carbs}% of calories</span>
            <span>Target: {dailyTargets.carbs}g</span>
          </div>
        </div>

        {/* Fat */}
        <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40">
          <div className="flex justify-between items-center text-xs font-semibold text-purple-900 mb-1">
            <span>Total Fat</span>
            <span className="font-bold">{fat}g</span>
          </div>
          <ProgressBar
            value={fat}
            max={dailyTargets.fat || 60}
            color="purple"
            size="sm"
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-purple-700">
            <span>{macroPercents.fat}% of calories</span>
            <span>Target: {dailyTargets.fat}g</span>
          </div>
        </div>
      </div>

      {/* Secondary Micronutrients / Fiber & Sugar */}
      <div
        className={`border-t border-slate-100 pt-4 grid gap-3 text-center ${
          nutrition.micronutrients ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
        }`}
      >
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-xs text-slate-500 block">Dietary Fiber</span>
          <span className="text-sm font-bold text-slate-800">{fiber}g</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-xs text-slate-500 block">Total Sugars</span>
          <span className="text-sm font-bold text-slate-800">{sugar}g</span>
        </div>
        {nutrition.micronutrients?.sodium_mg != null && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block">Sodium</span>
            <span className="text-sm font-bold text-slate-800">{nutrition.micronutrients.sodium_mg}mg</span>
          </div>
        )}
        {nutrition.micronutrients?.potassium_mg != null && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 block">Potassium</span>
            <span className="text-sm font-bold text-slate-800">{nutrition.micronutrients.potassium_mg}mg</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NutritionCard;
