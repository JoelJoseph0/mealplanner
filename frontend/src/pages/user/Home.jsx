import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, ChefHat, Flame, Package, Sparkles, Timer, WandSparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { greeting, todayISO, formatLong } from '../../lib/dates';
import {
  useCompleteMeal,
  useDay,
  useGenerateDay,
  usePantry,
  useRatings,
  useRateRecipe,
  useSuggestions,
} from '../../lib/queries';
import { getErrorMessage } from '../../services/api';
import { QUICK_PICK_INGREDIENTS } from '../../utils/constants';
import IngredientPicker from '../../components/pantry/IngredientPicker';
import RecipeCard from '../../components/food/RecipeCard';
import { RecipeImage, IngredientIcon } from '../../components/food/visuals';
import { Button, Card, EmptyState, Meter, ProgressRing, SectionTitle, Skeleton, useToast } from '../../components/ui';

const SLOT_ORDER = ['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'];

const TodayPlan = () => {
  const date = todayISO();
  const { data: day, isLoading } = useDay(date);
  const generate = useGenerateDay();
  const complete = useCompleteMeal();
  const toast = useToast();

  const create = async (usePantry) => {
    try {
      await generate.mutateAsync({ date, usePantry, force: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) return <Skeleton className="h-72 w-full" />;

  if (!day?.generated) {
    return (
      <EmptyState
        emoji="🗓️"
        title="No plan for today yet"
        description="Create a balanced five-meal day that fits your diet and calorie target."
        action={
          <>
            <Button icon={WandSparkles} loading={generate.isPending} onClick={() => create(false)}>
              Create today&apos;s plan
            </Button>
            <Button variant="secondary" icon={Package} loading={generate.isPending} onClick={() => create(true)}>
              Use my pantry
            </Button>
          </>
        }
      />
    );
  }

  return (
    <Card padded={false}>
      <ul className="divide-y divide-line">
        {SLOT_ORDER.map((slot) => {
          const meal = day.meals[slot];
          if (!meal) return null;
          return (
            <li key={slot} className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2/60 sm:p-4">
              <button
                type="button"
                onClick={() => complete.mutate({ id: meal.id, completed: !meal.completed })}
                aria-pressed={meal.completed}
                aria-label={meal.completed ? `Mark ${meal.food_name} as not eaten` : `Mark ${meal.food_name} as eaten`}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  meal.completed ? 'border-brand bg-brand text-brand-fg' : 'border-line text-transparent hover:border-brand'
                }`}
              >
                <Check className="h-4 w-4" />
              </button>
              <Link to={`/recipes/${meal.recipe_id}`} className="group h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-card">
                <RecipeImage recipe={meal.recipe} emojiSize="text-2xl" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  {slot} · {meal.meal_time}
                </p>
                <Link
                  to={`/recipes/${meal.recipe_id}`}
                  className={`block truncate font-semibold hover:text-brand ${meal.completed || meal.skipped ? 'text-subtle line-through' : 'text-fg'}`}
                >
                  {meal.food_name}
                </Link>
              </div>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted">{Math.round(meal.calories)} kcal</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

const ReadyCarousel = ({ pantryCount }) => {
  const { data, isLoading } = useSuggestions({ maxMissing: 0, limit: 8 }, pantryCount > 0);
  const { data: ratings = {} } = useRatings();
  const rate = useRateRecipe();
  const results = (data?.results || []).filter((r) => r.status === 'ready');

  if (pantryCount === 0) {
    return (
      <EmptyState
        emoji="🧺"
        title="Your kitchen is empty"
        description="Add a few ingredients above and we will show what you can cook right now."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        emoji="👩‍🍳"
        title="Nothing is fully ready yet"
        description="You are close. See the recipes that need just one or two more ingredients."
        action={
          <Button to="/cook?tab=almost" iconRight={ArrowRight}>
            See almost-ready recipes
          </Button>
        }
      />
    );
  }

  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
      {results.map((item) => (
        <div key={item.recipe.id} className="w-72 shrink-0 snap-start">
          <RecipeCard
            recipe={item.recipe}
            match={item}
            compact
            rating={ratings[item.recipe.id]}
            onRate={(id, feedback) => rate.mutate({ id, feedback })}
          />
        </div>
      ))}
    </div>
  );
};

export const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pantry = [] } = usePantry();
  const { data: day } = useDay(todayISO());
  const [typed, setTyped] = useState([]);
  const expiring = pantry.filter((item) => item.expires_soon);
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const goCook = () => navigate('/cook', { state: { ingredients: typed } });

  return (
    <div className="space-y-10">
      <section className="hero-gradient relative overflow-hidden rounded-[2rem] p-5 text-white shadow-lift animate-rise-in sm:p-8">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-4 top-4 hidden select-none gap-2 text-6xl md:flex" aria-hidden="true">
          <span className="animate-float">🍅</span>
          <span className="animate-float [animation-delay:1.2s]">🥑</span>
          <span className="animate-float [animation-delay:2.4s]">🌶️</span>
        </div>

        <div className="relative">
          <p className="text-sm font-semibold text-white/80">{formatLong(todayISO())}</p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-5xl">
            {greeting()}, {firstName} <span className="inline-block origin-bottom-right">👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-white/85 sm:text-lg">Tell us what is in your kitchen and we will find something delicious to cook.</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ['🧺', `${pantry.length} in your kitchen`],
              ['🔥', day?.generated ? `${Math.round(day.totals.calories)} / ${Math.round(day.target.calories)} kcal today` : 'No plan yet today'],
              ...(expiring.length ? [['⏳', `${expiring.length} expiring soon`]] : []),
            ].map(([icon, text]) => (
              <span key={text} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/20 backdrop-blur">
                <span aria-hidden="true">{icon}</span>
                {text}
              </span>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-surface p-4 text-fg shadow-lift sm:p-5">
            <p className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-saffron" aria-hidden="true" />
              What is in your kitchen?
            </p>
            <IngredientPicker value={typed} onChange={setTyped} quickPicks={QUICK_PICK_INGREDIENTS.slice(0, 8)} onSubmit={goCook} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button icon={Sparkles} disabled={typed.length === 0} onClick={goCook}>
                Find recipes
              </Button>
              {pantry.length > 0 && (
                <Button variant="secondary" to="/cook" iconRight={ArrowRight}>
                  Use my kitchen ({pantry.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Ready to cook now"
          description="You have everything for these."
          icon={ChefHat}
          action={
            <Link to="/cook" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          }
          className="mb-4"
        />
        <ReadyCarousel pantryCount={pantry.length} />
      </section>

      {expiring.length > 0 && (
        <Card className="border-saffron/40 bg-gradient-to-br from-saffron-soft to-surface">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-saffron text-white shadow-card">
                <Timer className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-fg">Use these soon</h2>
                <p className="text-sm text-muted">Cook them before they go to waste.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {expiring.map((item) => (
                    <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface py-1 pl-1 pr-3 text-sm font-semibold text-fg shadow-card">
                      <IngredientIcon name={item.name} category={item.category} size="sm" />
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/cook', { state: { ingredients: expiring.map((i) => i.name) } })}
            >
              Find recipes using them
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle
            title="Today's plan"
            icon={CalendarDays}
            action={
              <Link to="/plan" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                Open plan <ArrowRight className="h-4 w-4" />
              </Link>
            }
            className="mb-4"
          />
          <TodayPlan />
        </section>

        <section>
          <SectionTitle title="Nutrition" icon={Flame} className="mb-4" />
          <Card>
            {day?.generated ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={day.totals.calories}
                    max={day.target.calories}
                    size={104}
                    stroke={10}
                    label={`${Math.round(day.totals.calories)}`}
                    sub="kcal"
                  />
                  <div>
                    <p className="text-sm text-muted">of your daily target</p>
                    <p className="text-lg font-bold text-fg">{Math.round(day.target.calories)} kcal</p>
                  </div>
                </div>
                {[
                  ['Protein', day.totals.protein, day.target.protein, 'brand'],
                  ['Carbs', day.totals.carbohydrates, day.target.carbohydrates, 'accent'],
                  ['Fat', day.totals.fat, day.target.fat, 'info'],
                ].map(([label, value, max, tone]) => (
                  <div key={label}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold text-fg">{label}</span>
                      <span className="text-muted">
                        {Math.round(value)} / {Math.round(max)} g
                      </span>
                    </div>
                    <Meter value={value} max={max} tone={tone} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Create today&apos;s plan to see how your meals match your targets.</p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Home;
