import { useState } from 'react';
import { CheckCircle2, Clock, Flame, Repeat, ShoppingBasket, Timer } from 'lucide-react';
import Button from '../common/Button';
import { getFoodImage, FALLBACK_FOOD_IMAGES } from '../../utils/helpers';

const Chip = ({ children, tone }) => {
  const tones = {
    have: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    missing: 'bg-rose-50 text-rose-700 border-rose-200',
    swap: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

export const CookableRecipeCard = ({ result, onViewRecipe, onAddMissing }) => {
  const recipe = result.recipe || {};
  const [imgSrc, setImgSrc] = useState(() => getFoodImage(recipe));
  const ready = result.status === 'ready';
  const totalTime = (recipe.preparation_time || 0) + (recipe.cooking_time || 0);

  return (
    <div className="group rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={recipe.name}
          loading="lazy"
          onError={() => setImgSrc(FALLBACK_FOOD_IMAGES.default)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {recipe.meal_type && (
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900/75 text-white rounded-lg">
              {recipe.meal_type}
            </span>
          )}
          {recipe.diet_type && (
            <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600/90 text-white rounded-lg">
              {recipe.diet_type}
            </span>
          )}
        </div>
        <div
          className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-xs text-white ${
            ready ? 'bg-emerald-600' : 'bg-amber-500'
          }`}
        >
          {ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShoppingBasket className="w-3.5 h-3.5" />}
          <span>{ready ? 'Ready to cook' : `Need ${result.missing.length} more`}</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {recipe.name}
          </h4>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{recipe.description}</p>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
            <span>You have {result.have.length + result.substitutions.length} of {result.required_count} key ingredients</span>
            <span className={ready ? 'text-emerald-700' : 'text-amber-700'}>{result.match_percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full ${ready ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${result.match_percent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {result.have.map((item) => (
            <Chip key={`have-${item.food_id}`} tone="have">
              <CheckCircle2 className="w-3 h-3" /> {item.name}
            </Chip>
          ))}
          {result.substitutions.map((swap) => (
            <Chip key={`swap-${swap.missing}`} tone="swap">
              <Repeat className="w-3 h-3" /> {swap.use} for {swap.missing}
            </Chip>
          ))}
          {result.missing.map((item) => (
            <Chip key={`missing-${item.food_id}`} tone="missing">
              <ShoppingBasket className="w-3 h-3" /> {item.name}
            </Chip>
          ))}
        </div>

        {result.expiring_used?.length > 0 && (
          <p className="text-[11px] font-semibold text-orange-700 flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" /> Uses up soon-to-expire: {result.expiring_used.join(', ')}
          </p>
        )}

        {result.staples?.length > 0 && (
          <p className="text-[11px] text-slate-400">
            Also uses basics: {result.staples.join(', ')}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5">
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <Flame className="w-3.5 h-3.5 text-amber-500" /> {recipe.calories} kcal
          </span>
          <span className="font-medium text-blue-700">{recipe.protein}g protein</span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5" /> {totalTime || 20} min
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-emerald-600 hover:text-white transition-colors"
            onClick={() => onViewRecipe && onViewRecipe(recipe)}
          >
            View Recipe
          </Button>
          {!ready && onAddMissing && (
            <Button
              variant="secondary"
              size="sm"
              icon={ShoppingBasket}
              onClick={() => onAddMissing(result.missing.map((m) => m.name))}
              title="Mark the missing items as bought and add them to your pantry"
            >
              Got them
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookableRecipeCard;
