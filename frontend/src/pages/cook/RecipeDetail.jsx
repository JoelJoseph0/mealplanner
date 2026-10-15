import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChefHat,
  CircleDashed,
  Clock,
  Flame,
  Play,
  ShieldAlert,
  ShoppingBasket,
  Users,
  XCircle,
} from 'lucide-react';
import {
  useConsumeIngredients,
  useLogMeal,
  usePantry,
  useRateRecipe,
  useRatings,
  usePreferences,
  useRecipe,
  useRecordView,
  useShoppingFromRecipe,
} from '../../lib/queries';
import { getErrorMessage } from '../../services/api';
import { RecipeImage, IngredientIcon } from '../../components/food/visuals';
import { DietDot, RatingButtons } from '../../components/food/RecipeCard';
import CookMode from '../../components/cook/CookMode';
import ChefChat from '../../components/assistant/ChefChat';
import { useCookingGuide } from '../../lib/useCookingGuide';
import { Badge, Button, Card, Checkbox, Dialog, ErrorState, HealthNote, Skeleton, useToast } from '../../components/ui';

const parseSteps = (instructions) => {
  if (!instructions) return [];
  return String(instructions)
    .split('\n')
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, ''))
    .filter(Boolean);
};

export const RecipeDetail = () => {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: recipe, isLoading, isError, error, refetch } = useRecipe(recipeId);
  const { data: pantry = [] } = usePantry();
  const { data: ratings = {} } = useRatings();
  const rate = useRateRecipe();
  const addMissing = useShoppingFromRecipe();
  const logMeal = useLogMeal();
  const consume = useConsumeIngredients();
  const { data: prefs } = usePreferences();
  const recordView = useRecordView();
  const { personal } = useCookingGuide(recipeId);
  const recordViewRef = useRef(recordView.mutate);

  useEffect(() => {
    if (recipeId) recordViewRef.current(Number(recipeId), { onError: () => null });
  }, [recipeId]);

  const [cooking, setCooking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [used, setUsed] = useState({});

  const steps = useMemo(() => parseSteps(recipe?.instructions), [recipe]);
  const pantryIds = useMemo(() => new Set(pantry.map((p) => p.food_id)), [pantry]);
  const items = recipe?.ingredient_items || [];
  const key = items.filter((i) => !i.is_optional && !i.is_staple);
  const missing = key.filter((i) => !pantryIds.has(i.food_id));
  const usable = items.filter((i) => pantryIds.has(i.food_id) && !i.is_staple);

  const openFinish = () => {
    setCooking(false);
    setUsed(Object.fromEntries(usable.map((i) => [i.food_id, true])));
    setFinishing(true);
  };

  const confirmCooked = async () => {
    try {
      await logMeal.mutateAsync({ recipe_id: recipe.id, meal_type: recipe.meal_type || 'Meal', notes: 'Cooked from recipe page' });
      const foodIds = Object.entries(used).filter(([, on]) => on).map(([id]) => Number(id));
      let message = 'Logged in your meal history.';
      if (foodIds.length) {
        const result = await consume.mutateAsync({ recipeId: recipe.id, foodIds });
        const changed = result.removed.length + result.reduced.length;
        if (changed) message = `Logged. Updated ${changed} ingredient${changed > 1 ? 's' : ''} in your kitchen.`;
      }
      toast.success(message);
      setFinishing(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAddMissing = async () => {
    try {
      const result = await addMissing.mutateAsync(recipe.id);
      if (result.added) toast.success(`Added ${result.added} item${result.added > 1 ? 's' : ''} to your shopping list`);
      else toast.info('Those ingredients are already on your list.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !recipe) {
    return <ErrorState message={error ? getErrorMessage(error) : 'This recipe could not be found.'} onRetry={refetch} />;
  }

  const totalTime = (recipe.preparation_time || 0) + (recipe.cooking_time || 0);

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/cook'))}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </button>

      {personal?.allergen_conflicts?.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4" role="alert">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <p className="font-semibold text-fg">This recipe may not suit you</p>
            <p className="text-sm text-muted">It appears to contain {personal.allergen_conflicts.join(', ')}, which is on your allergy or intolerance list.</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        <div className="group relative h-56 sm:h-80">
          <RecipeImage recipe={recipe} emojiSize="text-8xl" />
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand">{recipe.meal_type}</Badge>
                <DietDot diet={recipe.diet_type} />
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-fg sm:text-5xl">{recipe.name}</h1>
              {recipe.description && <p className="mt-2 max-w-2xl text-muted">{recipe.description}</p>}
            </div>
            <RatingButtons value={ratings[recipe.id]} onChange={(feedback) => rate.mutate({ id: recipe.id, feedback })} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [Clock, 'Total time', `${totalTime} min`],
              [Flame, 'Calories', `${Math.round(recipe.calories)} kcal`],
              [Users, 'Serves', `${recipe.servings}`],
              [CheckCircle2, 'Protein', `${recipe.protein} g`],
            ].map(([Icon, label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-gradient-to-br from-surface-2 to-surface p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-subtle">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </div>
                <p className="mt-1 font-display text-2xl font-semibold text-fg">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" icon={Play} onClick={() => setCooking(true)} disabled={steps.length === 0}>
              Start cooking
            </Button>
            <Button size="lg" variant="secondary" icon={Check} onClick={openFinish}>
              I cooked this
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:self-start">
          <h2 className="text-2xl font-semibold text-fg">Ingredients</h2>
          {key.length > 0 && (
            <div
              className={`mt-3 rounded-xl p-3 text-sm font-semibold ${
                missing.length === 0 ? 'bg-brand-soft text-brand' : 'bg-accent-soft text-accent'
              }`}
            >
              {missing.length === 0
                ? 'You have everything you need.'
                : `Missing ${missing.length}: ${missing.map((m) => m.name).join(', ')}`}
              {missing.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddMissing}
                  className="mt-2 flex items-center gap-1.5 font-bold underline-offset-2 hover:underline"
                >
                  <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
                  Add missing to shopping list
                </button>
              )}
            </div>
          )}
          <ul className="mt-4 space-y-3">
            {items.map((item) => {
              const have = pantryIds.has(item.food_id);
              const Icon = have ? CheckCircle2 : item.is_staple || item.is_optional ? CircleDashed : XCircle;
              const tone = have ? 'text-brand' : item.is_staple || item.is_optional ? 'text-subtle' : 'text-accent';
              return (
                <li key={item.food_id} className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-label={have ? 'In your kitchen' : 'Not in your kitchen'} />
                  <IngredientIcon name={item.name} category={item.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{item.name}</p>
                    <p className="text-sm text-subtle">
                      {[item.quantity, item.is_optional && 'optional', item.is_staple && 'kitchen basic'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="text-2xl font-semibold text-fg">Method</h2>
          <ol className="mt-4 space-y-4">
            {steps.map((step, idx) => (
              <li key={idx} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                  {idx + 1}
                </span>
                <p className="pt-0.5 text-fg">{step}</p>
              </li>
            ))}
          </ol>
          {recipe.allergy_information?.length > 0 && (
            <p className="mt-6 rounded-xl bg-warn-soft p-3 text-sm font-medium text-fg">
              Contains: {recipe.allergy_information.join(', ')}
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-fg">
          <ChefHat className="h-6 w-6 text-brand" aria-hidden="true" /> Ask the chef
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">Questions about substitutions, timing or technique? Chef Assistant knows this recipe and your kitchen.</p>
        <ChefChat recipe={recipe} className="max-h-[32rem]" />
      </Card>

      <HealthNote className="mt-6" conditions={prefs?.health_conditions || []} compact={!prefs?.health_conditions?.length} />

      {cooking && <CookMode recipe={recipe} steps={steps} onClose={() => setCooking(false)} onFinish={openFinish} />}

      <Dialog
        open={finishing}
        onClose={() => setFinishing(false)}
        title="Nice work, chef"
        description="We will add this to your meal history. Tick what you used up so your kitchen stays accurate."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFinishing(false)}>
              Cancel
            </Button>
            <Button icon={Check} loading={logMeal.isPending || consume.isPending} onClick={confirmCooked}>
              Log this meal
            </Button>
          </>
        }
      >
        {usable.length === 0 ? (
          <p className="text-sm text-muted">None of this recipe&apos;s ingredients are tracked in your kitchen, so there is nothing to use up.</p>
        ) : (
          <div className="space-y-2">
            {usable.map((item) => (
              <Checkbox
                key={item.food_id}
                label={item.name}
                description={item.quantity ? `Recipe uses ${item.quantity}` : undefined}
                checked={Boolean(used[item.food_id])}
                onChange={(checked) => setUsed((current) => ({ ...current, [item.food_id]: checked }))}
              />
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default RecipeDetail;
