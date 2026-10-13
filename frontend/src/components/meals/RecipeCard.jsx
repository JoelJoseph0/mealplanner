import { useState, useEffect } from 'react';
import { Clock, Flame, ShieldAlert, Award, Package } from 'lucide-react';
import Button from '../common/Button';
import { getFoodImage, FALLBACK_FOOD_IMAGES } from '../../utils/helpers';

export const RecipeCard = ({
  recipe,
  onViewRecipe,
  matchScore,
}) => {
  const [imgSrc, setImgSrc] = useState(() => (recipe ? getFoodImage(recipe) : ''));

  useEffect(() => {
    if (recipe) {
      setImgSrc(getFoodImage(recipe));
    }
  }, [recipe]);

  if (!recipe) return null;

  return (
    <div className="group rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image container with badges */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={recipe.title || recipe.name}
          onError={() => setImgSrc(FALLBACK_FOOD_IMAGES.default)}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {recipe.meal_type && (
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900/75 backdrop-blur-xs text-white rounded-lg">
              {recipe.meal_type}
            </span>
          )}
          {recipe.diet_type && (
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600/90 text-white rounded-lg">
              {recipe.diet_type}
            </span>
          )}
        </div>

        {(matchScore || recipe.match_score) && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-amber-500 text-white rounded-lg shadow-xs">
            <Award className="w-3.5 h-3.5" />
            <span>{matchScore || recipe.match_score}% Match</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {recipe.title || recipe.name}
          </h4>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {recipe.description}
          </p>

          {/* Quick Metrics */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-b border-slate-100 py-2">
            <span className="flex items-center gap-1 font-medium text-emerald-700">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {recipe.calories} kcal
            </span>
            <span className="font-medium text-blue-700">
              {recipe.protein}g Protein
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              {recipe.prep_time || (recipe.preparation_time ? `${recipe.preparation_time}m` : '20m')}
            </span>
          </div>

          {typeof recipe.pantry_coverage === 'number' && recipe.pantry_coverage > 0 && (
            <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <Package className="w-3 h-3 shrink-0" />
              <span>{recipe.pantry_coverage}% of ingredients already in your pantry</span>
            </div>
          )}

          {/* Allergy warnings if any */}
          {(() => {
            const allergies = recipe.allergies || recipe.allergy_information || [];
            const list = Array.isArray(allergies) ? allergies : [];
            if (list.length === 0) return null;
            return (
              <div className="mt-2.5 flex items-center gap-1 text-[11px] text-amber-700">
                <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Contains: {list.join(', ')}</span>
              </div>
            );
          })()}
        </div>

        <div className="mt-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full hover:bg-emerald-600 hover:text-white transition-colors"
            onClick={() => onViewRecipe && onViewRecipe(recipe)}
          >
            View Recipe
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
