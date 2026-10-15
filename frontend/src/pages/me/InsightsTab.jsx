import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Camera, CalendarCheck, Flame, SkipForward } from 'lucide-react';
import { useInsights, usePreferences } from '../../lib/queries';
import { MEAL_SLOTS } from '../../utils/constants';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  HealthNote,
  Meter,
  SectionTitle,
  Segmented,
  Skeleton,
  Stat,
} from '../../components/ui';

const AXIS = { fill: 'var(--subtle)', fontSize: 12 };

const CalorieTooltip = ({ active, payload, target }) => {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lift">
      <p className="font-semibold text-fg">{day.label}</p>
      <p className="text-muted">
        {Math.round(day.calories)} kcal from {day.meals} meal{day.meals === 1 ? '' : 's'}
      </p>
      <p className="text-xs text-subtle">Target {Math.round(target)} kcal</p>
    </div>
  );
};

export const InsightsTab = () => {
  const [days, setDays] = useState(14);
  const { data, isLoading, isError, refetch } = useInsights(days);
  const { data: prefs } = usePreferences();

  if (isError) return <ErrorState message="Could not load your insights." onRetry={refetch} />;

  const range = (
    <Segmented
      options={[
        { value: 7, label: '7 days' },
        { value: 14, label: '14 days' },
        { value: 30, label: '30 days' },
      ]}
      value={days}
      onChange={setDays}
    />
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        {range}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { trend, targets, averages, actions, top_recipes: topRecipes, scans, by_meal_type: bySlot } = data;
  const tracked = actions.cooked + actions.skipped;
  const followRate = tracked ? Math.round((actions.cooked / tracked) * 100) : null;
  const topScan = scans.top.find((item) => item.name && item.name.toLowerCase() !== 'unknown');
  const slotMax = Math.max(1, ...MEAL_SLOTS.map((slot) => bySlot[slot] || 0));

  if (data.active_days === 0 && scans.total === 0 && actions.skipped === 0) {
    return (
      <div className="space-y-6">
        {range}
        <EmptyState
          emoji="📈"
          title="Your insights will appear here"
          description="Cook recipes, tick meals in your plan or scan ingredients. We will chart your calories, macros and habits over time."
          action={<Button to="/plan">Open my plan</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Based on meals you marked as cooked in the last {days} days.</p>
        {range}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Average a day"
          value={`${Math.round(averages.calories)} kcal`}
          sub={`Target ${Math.round(targets.calories)} kcal`}
          icon={Flame}
          tone="accent"
        />
        <Stat label="Days logged" value={`${data.active_days} / ${days}`} sub="Days with a cooked meal" icon={CalendarCheck} />
        <Stat
          label="Plan followed"
          value={followRate == null ? 'No data' : `${followRate}%`}
          sub={`${actions.cooked} cooked, ${actions.skipped} skipped`}
          icon={SkipForward}
          tone="info"
        />
        <Stat label="Ingredients scanned" value={scans.total} sub={topScan ? `Most often ${topScan.name}` : scans.total ? 'Mostly unrecognised' : 'No scans yet'} icon={Camera} tone="warn" />
      </div>

      <section>
        <SectionTitle title="Calories each day" description="Bars show what you cooked; the dashed line is your daily target." className="mb-4" />
        <Card>
          <div className="h-72" role="img" aria-label={`Daily calories over the last ${days} days`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: -12, right: 8, top: 12 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} interval={days <= 7 ? 0 : days <= 14 ? 1 : 4} />
                <YAxis tick={AXIS} allowDecimals={false} />
                <Tooltip content={<CalorieTooltip target={targets.calories} />} cursor={{ fill: 'var(--surface-2)' }} />
                <ReferenceLine
                  y={targets.calories}
                  stroke="var(--subtle)"
                  strokeDasharray="5 4"
                  label={{ value: 'Target', position: 'insideTopRight', fill: 'var(--muted)', fontSize: 12 }}
                />
                <Bar dataKey="calories" name="Calories" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-3 text-sm">
            <summary className="font-semibold text-brand">Show as a table</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="py-1.5 pr-4">Day</th>
                    <th className="py-1.5 pr-4">Meals</th>
                    <th className="py-1.5 pr-4">Calories</th>
                    <th className="py-1.5 pr-4">Protein</th>
                    <th className="py-1.5 pr-4">Carbs</th>
                    <th className="py-1.5">Fat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-fg">
                  {trend.map((day) => (
                    <tr key={day.date}>
                      <td className="py-1.5 pr-4">{day.label}</td>
                      <td className="py-1.5 pr-4">{day.meals}</td>
                      <td className="py-1.5 pr-4">{Math.round(day.calories)} kcal</td>
                      <td className="py-1.5 pr-4">{Math.round(day.protein)} g</td>
                      <td className="py-1.5 pr-4">{Math.round(day.carbohydrates)} g</td>
                      <td className="py-1.5">{Math.round(day.fat)} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="font-display text-lg font-semibold text-fg">Average macros on logged days</h3>
          <div className="mt-4 space-y-4">
            {[
              ['Protein', averages.protein, targets.protein, 'brand'],
              ['Carbs', averages.carbohydrates, targets.carbohydrates, 'accent'],
              ['Fat', averages.fat, targets.fat, 'info'],
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

        <Card>
          <h3 className="font-display text-lg font-semibold text-fg">When you cook</h3>
          <ul className="mt-4 space-y-3">
            {MEAL_SLOTS.map((slot) => (
              <li key={slot}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-fg">{slot}</span>
                  <span className="text-muted">{bySlot[slot] || 0}</span>
                </div>
                <Meter value={bySlot[slot] || 0} max={slotMax} tone="saffron" />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-semibold text-fg">Your favourites</h3>
          {topRecipes.length ? (
            <ol className="mt-4 space-y-3">
              {topRecipes.map((item, index) => (
                <li key={item.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-fg">{item.name}</span>
                  <span className="text-sm text-muted">{item.count}x</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted">Cook a few recipes to see your favourites.</p>
          )}
          {data.average_rating != null && <p className="mt-4 text-sm text-muted">Average rating {data.average_rating} / 5</p>}
        </Card>
      </div>

      <HealthNote conditions={prefs?.health_conditions || []} />
    </div>
  );
};

export default InsightsTab;
