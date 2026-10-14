import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Flame, ShoppingBasket, ThumbsDown, ThumbsUp, Timer } from 'lucide-react';
import { Meter } from '../ui';
import { RecipeImage } from './visuals';

export const RatingButtons = ({ value, onChange, size = 'md' }) => {
  const dimension = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const toggle = (next) => onChange(value === next ? null : next);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rate this recipe">
      <button
        type="button"
        onClick={() => toggle('positive')}
        aria-pressed={value === 'positive'}
        aria-label="I like this recipe"
        className={`flex ${dimension} items-center justify-center rounded-lg transition-colors ${
          value === 'positive' ? 'bg-brand-soft text-brand' : 'text-subtle hover:bg-surface-2 hover:text-fg'
        }`}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => toggle('negative')}
        aria-pressed={value === 'negative'}
        aria-label="I do not like this recipe"
        className={`flex ${dimension} items-center justify-center rounded-lg transition-colors ${
          value === 'negative' ? 'bg-danger-soft text-danger' : 'text-subtle hover:bg-surface-2 hover:text-fg'
        }`}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
};

export const DietDot = ({ diet }) => {
  const colors = { Vegan: 'bg-brand', Vegetarian: 'bg-brand', Eggetarian: 'bg-warn', 'Non-Vegetarian': 'bg-danger' };
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span className={`h-2.5 w-2.5 rounded-sm ${colors[diet] || 'bg-subtle'}`} aria-hidden="true" />
      {diet}
    </span>
  );
};

export const RecipeCard = ({ recipe, match, rating, onRate, onAddMissing, compact = false }) => {
  const totalTime = (recipe.preparation_time || 0) + (recipe.cooking_time || 0);
  const ready = match?.status === 'ready';
  const missing = match?.missing || [];
  const swaps = match?.substitutions || [];

  return (
    <article className="card-hover group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <Link to={`/recipes/${recipe.id}`} className="relative block aspect-[16/10] overflow-hidden" aria-label={`Open ${recipe.name}`}>
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]">
          <RecipeImage recipe={recipe} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
        <div className="absolute left-3 top-3">
          <span className="glass inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-fg shadow-card">{recipe.meal_type}</span>
        </div>
        {match && (
          <div className="absolute right-3 top-3">
            {ready ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-brand-fg shadow-glow">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Ready to cook
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-saffron px-2.5 py-1 text-xs font-bold text-[#3a2500] shadow-card">
                <ShoppingBasket className="h-3.5 w-3.5" aria-hidden="true" />
                Need {missing.length} more
              </span>
            )}
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-bold text-white drop-shadow">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {totalTime || 20} min
          <span className="mx-1 opacity-60">•</span>
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          {Math.round(recipe.calories)} kcal
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <Link to={`/recipes/${recipe.id}`} className="line-clamp-2 font-display text-lg font-semibold leading-snug text-fg transition-colors hover:text-brand">
            {recipe.name}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <DietDot diet={recipe.diet_type} />
            {!compact && recipe.protein > 0 && <span className="font-semibold text-brand">{Math.round(recipe.protein)} g protein</span>}
          </div>
        </div>

        {match && (
          <div className="space-y-2.5 rounded-2xl bg-surface-2/70 p-3">
            <div className="flex items-center gap-3">
              <Meter value={match.match_percent} max={100} tone={ready ? 'brand' : 'accent'} className="flex-1" />
              <span className="text-xs font-bold text-muted">
                {match.have.length + swaps.length}/{match.required_count}
              </span>
            </div>
            {missing.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <span
                    key={item.food_id}
                    title={item.note || undefined}
                    className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/25"
                  >
                    <ShoppingBasket className="h-3 w-3" aria-hidden="true" />
                    {item.name}
                    {item.note && <span className="font-normal opacity-80">({item.note})</span>}
                  </span>
                ))}
              </div>
            )}
            {swaps.length > 0 && (
              <p className="text-xs text-muted">
                Swap: {swaps.map((s) => `${s.use} for ${s.missing}`).join(', ')}
              </p>
            )}
            {match.expiring_used?.length > 0 && (
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-warn">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                Uses up {match.expiring_used.join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          {onRate ? <RatingButtons value={rating} onChange={(next) => onRate(recipe.id, next)} size="sm" /> : <span />}
          {onAddMissing && missing.length > 0 && (
            <button
              type="button"
              onClick={() => onAddMissing(recipe)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-fg"
            >
              <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
              Add to list
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default RecipeCard;
