import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  Package,
  RefreshCw,
  Shuffle,
  SkipForward,
  Undo2,
  ShoppingCart,
  WandSparkles,
} from 'lucide-react';
import {
  useCompleteMeal,
  useGenerateDay,
  useGenerateWeek,
  useLockMeal,
  useShoppingFromPlan,
  useSkipMeal,
  usePreferences,
  useSwapMeal,
  useWeek,
} from '../../lib/queries';
import { addDays, formatLong, mondayOf, toISODate, todayISO, weekDays } from '../../lib/dates';
import { getErrorMessage } from '../../services/api';
import { RecipeImage } from '../../components/food/visuals';
import {
  Badge,
  Button,
  Card,
  Chip,
  HealthNote,
  EmptyState,
  ErrorState,
  Meter,
  PageHeader,
  ProgressRing,
  SectionTitle,
  Skeleton,
  useToast,
} from '../../components/ui';

const SLOTS = ['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MealRow = ({ slot, meal, busy, onSwap, onLock, onComplete, onSkip }) => {
  if (!meal) {
    return (
      <li className="flex items-center gap-3 p-4 text-sm text-subtle">
        <span className="w-28 text-xs font-semibold uppercase tracking-wide">{slot}</span>
        Nothing planned
      </li>
    );
  }
  return (
    <li className={`flex flex-wrap items-center gap-3 p-3 transition-colors sm:p-4 ${meal.skipped ? 'bg-surface-2/60' : ''}`}>
      <button
        type="button"
        onClick={() => onComplete(meal)}
        aria-pressed={meal.completed}
        aria-label={meal.completed ? `Mark ${meal.food_name} as not eaten` : `Mark ${meal.food_name} as eaten`}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          meal.completed ? 'border-brand bg-brand text-brand-fg' : 'border-line text-transparent hover:border-brand'
        }`}
      >
        <Check className="h-4 w-4" />
      </button>
      <Link to={`/recipes/${meal.recipe_id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-24">
        <RecipeImage recipe={meal.recipe} emojiSize="text-3xl" />
      </Link>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
          {slot} · {meal.meal_time}
        </p>
        <Link
          to={`/recipes/${meal.recipe_id}`}
          className={`line-clamp-2 font-semibold hover:text-brand ${meal.completed || meal.skipped ? 'text-subtle line-through' : 'text-fg'}`}
        >
          {meal.food_name}
        </Link>
        {meal.skipped && <Badge tone="warn">Skipped</Badge>}
        <p className="text-sm text-muted">
          {Math.round(meal.calories)} kcal · {Math.round(meal.protein)} g protein
          {meal.servings > 1 && ` · ${meal.servings} servings`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSkip(meal)}
          aria-pressed={meal.skipped}
          aria-label={meal.skipped ? `Undo skipping ${meal.food_name}` : `Skip ${meal.food_name}`}
          title={meal.skipped ? 'Undo skip' : 'Skip this meal'}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            meal.skipped ? 'bg-warn-soft text-warn' : 'text-subtle hover:bg-surface-2 hover:text-fg'
          }`}
        >
          {meal.skipped ? <Undo2 className="h-5 w-5" /> : <SkipForward className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => onLock(meal)}
          aria-pressed={meal.locked}
          aria-label={meal.locked ? `Unlock ${meal.food_name}` : `Lock ${meal.food_name} so it is kept when refreshing`}
          title={meal.locked ? 'Locked: kept when you refresh the plan' : 'Lock this meal'}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            meal.locked ? 'bg-brand-soft text-brand' : 'text-subtle hover:bg-surface-2 hover:text-fg'
          }`}
        >
          {meal.locked ? <Lock className="h-5 w-5" /> : <LockOpen className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => onSwap(meal)}
          disabled={meal.locked || busy}
          aria-label={`Swap ${meal.food_name} for another recipe`}
          title={meal.locked ? 'Unlock to swap' : 'Swap for another recipe'}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40"
        >
          <Shuffle className="h-5 w-5" />
        </button>
      </div>
    </li>
  );
};

export const Plan = () => {
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => toISODate(mondayOf()));
  const [selected, setSelected] = useState(todayISO());
  const [usePantry, setUsePantry] = useState(false);

  const { data: week, isLoading, isError, error, refetch } = useWeek(weekStart);
  const generateDay = useGenerateDay();
  const generateWeek = useGenerateWeek();
  const swap = useSwapMeal();
  const lock = useLockMeal();
  const complete = useCompleteMeal();
  const skip = useSkipMeal();
  const { data: prefs } = usePreferences();
  const fromPlan = useShoppingFromPlan();

  const days = useMemo(() => weekDays(new Date(`${weekStart}T00:00:00`)), [weekStart]);

  useEffect(() => {
    if (!days.some((d) => d.iso === selected)) {
      setSelected(days.some((d) => d.iso === todayISO()) ? todayISO() : days[0].iso);
    }
  }, [days, selected]);

  const dayData = (iso) => {
    const index = days.findIndex((d) => d.iso === iso);
    return week?.days?.[DAY_NAMES[index]];
  };
  const current = dayData(selected);
  const anyPlanned = Boolean(week?.generated);

  const run = async (action, success) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const shopForWeek = () =>
    run(async () => {
      const result = await fromPlan.mutateAsync({ startDate: weekStart, days: 7 });
      if (!result.meals_considered) toast.info('Create the plan first.');
      else if (result.added) toast.success(`Added ${result.added} ingredient${result.added > 1 ? 's' : ''} to your shopping list`);
      else toast.info('You already have everything this plan needs.');
    });

  const weekLabel = `${days[0].month} ${days[0].day} to ${days[6].month} ${days[6].day}`;
  const isThisWeek = weekStart === toISODate(mondayOf());
  const busy = swap.isPending || lock.isPending || complete.isPending;

  return (
    <div>
      <PageHeader
        title="Plan"
        emoji="🗓️"
        description="Balanced meals for the week, sized to your calorie target."
        actions={
          anyPlanned ? (
            <>
              <Button variant="secondary" icon={ShoppingCart} loading={fromPlan.isPending} onClick={shopForWeek}>
                Shopping list for this week
              </Button>
              <Button
                icon={RefreshCw}
                loading={generateWeek.isPending}
                onClick={() =>
                  run(
                    () => generateWeek.mutateAsync({ start: weekStart, usePantry, force: true }),
                    'Week refreshed. Locked meals were kept.'
                  )
                }
              >
                Refresh unlocked meals
              </Button>
            </>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setWeekStart(toISODate(addDays(new Date(`${weekStart}T00:00:00`), -7)))}
            aria-label="Previous week"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-36 px-2 text-center text-sm font-semibold text-fg">{weekLabel}</span>
          <button
            type="button"
            onClick={() => setWeekStart(toISODate(addDays(new Date(`${weekStart}T00:00:00`), 7)))}
            aria-label="Next week"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {!isThisWeek && (
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(toISODate(mondayOf()))}>
            Back to this week
          </Button>
        )}
        <Chip active={usePantry} onClick={() => setUsePantry((v) => !v)} icon={Package}>
          Favour what is in my kitchen
        </Chip>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : !anyPlanned ? (
        <EmptyState
          icon={CalendarDays}
          title="No plan for this week yet"
          description="We will pick five meals a day that fit your diet and allergies, rotate recipes for variety, and size portions to your calorie target."
          action={
            <Button size="lg" icon={WandSparkles} loading={generateWeek.isPending} onClick={() => run(() => generateWeek.mutateAsync({ start: weekStart, usePantry, force: false }), 'Your week is planned.')}>
              Create this week&apos;s plan
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-7 gap-1.5 sm:gap-2" role="tablist" aria-label="Days of the week">
            {days.map((day) => {
              const data = dayData(day.iso);
              const active = day.iso === selected;
              const isToday = day.iso === todayISO();
              return (
                <button
                  key={day.iso}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(day.iso)}
                  className={`flex flex-col items-center rounded-2xl border px-1 py-2.5 transition-colors sm:py-3 ${
                    active ? 'border-brand bg-brand text-brand-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'
                  }`}
                >
                  <span className={`text-xs font-semibold ${active ? 'opacity-90' : 'text-subtle'}`}>{day.weekday}</span>
                  <span className="text-lg font-bold">{day.day}</span>
                  <span className={`text-[0.7rem] font-semibold ${active ? 'opacity-90' : 'text-subtle'}`}>
                    {data?.generated ? `${Math.round(data.totals.calories)}` : isToday ? 'Today' : '-'}
                  </span>
                </button>
              );
            })}
          </div>

          {current && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionTitle
                  title={formatLong(selected)}
                  className="mb-4"
                  action={
                    current.generated && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RefreshCw}
                        loading={generateDay.isPending}
                        onClick={() => run(() => generateDay.mutateAsync({ date: selected, usePantry, force: true }), 'Day refreshed.')}
                      >
                        Refresh day
                      </Button>
                    )
                  }
                />
                {current.generated ? (
                  <Card padded={false}>
                    <ul className="divide-y divide-line">
                      {SLOTS.map((slot) => (
                        <MealRow
                          key={slot}
                          slot={slot}
                          meal={current.meals[slot]}
                          busy={busy}
                          onSwap={(meal) => run(() => swap.mutateAsync({ id: meal.id, usePantry }), 'Meal swapped.')}
                          onLock={(meal) => run(() => lock.mutateAsync({ id: meal.id, locked: !meal.locked }))}
                          onComplete={(meal) =>
                            run(() => complete.mutateAsync({ id: meal.id, completed: !meal.completed }), meal.completed ? null : 'Added to your meal history.')
                          }
                          onSkip={(meal) =>
                            run(() => skip.mutateAsync({ id: meal.id, skipped: !meal.skipped }), meal.skipped ? null : 'Skipped. We will suggest it less often.')
                          }
                        />
                      ))}
                    </ul>
                  </Card>
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    title="Nothing planned for this day"
                    action={
                      <Button icon={WandSparkles} loading={generateDay.isPending} onClick={() => run(() => generateDay.mutateAsync({ date: selected, usePantry, force: false }), 'Day planned.')}>
                        Plan this day
                      </Button>
                    }
                  />
                )}
              </div>

              <div className="space-y-6">
                {current.generated && (
                  <Card>
                    <h3 className="mb-4 font-bold text-fg">Day totals</h3>
                    <div className="mb-5 flex items-center gap-4">
                      <ProgressRing
                        value={current.totals.calories}
                        max={current.target.calories}
                        size={92}
                        stroke={9}
                        label={`${Math.round(current.totals.calories)}`}
                        sub="kcal"
                      />
                      <p className="text-sm text-muted">
                        Target
                        <span className="block text-lg font-bold text-fg">{Math.round(current.target.calories)} kcal</span>
                      </p>
                    </div>
                    <div className="space-y-4">
                      {[
                        ['Protein', current.totals.protein, current.target.protein, 'brand'],
                        ['Carbs', current.totals.carbohydrates, current.target.carbohydrates, 'accent'],
                        ['Fat', current.totals.fat, current.target.fat, 'info'],
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
                  </Card>
                )}
                <Card>
                  <h3 className="font-bold text-fg">This week</h3>
                  <p className="mt-1 text-sm text-muted">
                    Average {Math.round(week.weekly_totals?.average_daily_calories || 0)} kcal a day,{' '}
                    {Math.round(week.weekly_totals?.average_protein || 0)} g protein.
                  </p>
                  <p className="mt-3 text-sm text-muted">
                    Lock meals you love, swap the ones you do not, then add the missing ingredients to your{' '}
                    <Link to="/pantry?tab=shopping" className="font-semibold text-brand hover:underline">
                      shopping list
                    </Link>
                    .
                  </p>
                </Card>
                <HealthNote conditions={prefs?.health_conditions || []} compact={!prefs?.health_conditions?.length} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Plan;
