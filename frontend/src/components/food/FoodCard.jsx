import { Flame, Utensils } from 'lucide-react';
import Button from '../common/Button';

export const FoodCard = ({
  food,
  onViewNutrition,
  onSelect,
  showActions = true,
}) => {
  if (!food) return null;

  return (
    <div className="group rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {food.image ? (
          <img
            src={food.image}
            alt={food.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Utensils className="w-10 h-10" />
          </div>
        )}
        {food.category && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[11px] font-semibold bg-slate-900/70 backdrop-blur-xs text-white rounded-lg">
            {food.category}
          </span>
        )}
        {food.diet_type && (
          <span className="absolute top-2.5 right-2.5 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600/90 text-white rounded-lg">
            {food.diet_type}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {food.name}
          </h4>
          {food.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{food.description}</p>
          )}

          {/* Macro Breakdown Chips */}
          <div className="mt-3.5 grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="bg-emerald-50 text-emerald-800 rounded-lg py-1 px-1">
              <span className="block font-bold text-[11px]">{food.calories || 0}</span>
              <span className="text-[10px] text-emerald-600">kcal</span>
            </div>
            <div className="bg-blue-50 text-blue-800 rounded-lg py-1 px-1">
              <span className="block font-bold text-[11px]">{food.protein || 0}g</span>
              <span className="text-[10px] text-blue-600">Protein</span>
            </div>
            <div className="bg-amber-50 text-amber-800 rounded-lg py-1 px-1">
              <span className="block font-bold text-[11px]">{food.carbohydrates || 0}g</span>
              <span className="text-[10px] text-amber-600">Carbs</span>
            </div>
            <div className="bg-purple-50 text-purple-800 rounded-lg py-1 px-1">
              <span className="block font-bold text-[11px]">{food.fat || 0}g</span>
              <span className="text-[10px] text-purple-600">Fat</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {onViewNutrition && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => onViewNutrition(food)}
              >
                View Nutrition
              </Button>
            )}
            {onSelect && (
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs"
                onClick={() => onSelect(food)}
              >
                Select
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodCard;
