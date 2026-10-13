import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Flame, ChevronRight } from 'lucide-react';
import { getFoodImage, FALLBACK_FOOD_IMAGES } from '../../utils/helpers';

export const MealCard = ({
  meal,
  onViewRecipe,
  onToggleComplete,
  compact = false,
}) => {
  const [imgSrc, setImgSrc] = useState(() => (meal ? getFoodImage(meal) : ''));

  useEffect(() => {
    if (meal) {
      setImgSrc(getFoodImage(meal));
    }
  }, [meal]);

  if (!meal) return null;

  return (
    <div className="group rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 w-full sm:w-auto">
        {/* Thumbnail or Meal Icon */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={imgSrc}
            alt={meal.food_name || meal.title}
            onError={() => setImgSrc(FALLBACK_FOOD_IMAGES.default)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          {meal.completed && (
            <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-2xs flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Meal Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
              {meal.meal_type}
            </span>
            {meal.meal_time && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {meal.meal_time}
              </span>
            )}
          </div>

          <h4 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
            {meal.food_name || meal.title}
          </h4>

          {/* Quick Macros */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-0.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> {meal.calories} kcal
            </span>
            <span>•</span>
            <span>{meal.protein}g Protein</span>
            <span>•</span>
            <span>{meal.carbohydrates}g Carbs</span>
            <span>•</span>
            <span>{meal.fat}g Fat</span>
          </div>
        </div>
      </div>

      {/* Action side */}
      <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end">
        {onToggleComplete && (
          <button
            type="button"
            onClick={() => onToggleComplete(meal)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              meal.completed
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}
            title={meal.completed ? 'Mark incomplete' : 'Mark completed'}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}

        {onViewRecipe && (meal.recipe_id || meal.recipe?.id || meal.food_name || meal.title) && (
          <button
            type="button"
            onClick={() => {
              const targetId = meal.recipe_id || meal.recipe?.id;
              if (targetId) {
                onViewRecipe(targetId);
              } else {
                onViewRecipe(meal.food_name || meal.title);
              }
            }}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-3 py-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
          >
            Recipe <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MealCard;
