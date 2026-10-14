import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BookOpen, Camera, Carrot, Clock, Cpu, Package, Users } from 'lucide-react';
import { adminService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { relativeTime } from '../../lib/dates';
import { Badge, Card, ErrorState, Meter, PageHeader, SectionTitle, Skeleton, Stat } from '../../components/ui';

const percent = (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`);

export const AdminDashboard = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminService.dashboard });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const stats = data.statistics || {};
  const model = data.model || {};
  const topPantry = data.top_pantry_ingredients || [];
  const activity = data.recent_activity || [];

  return (
    <div>
      <PageHeader
        title="Overview"
        emoji="📈"
        description="Usage, content and model health at a glance."
        actions={
          <Badge tone={model.trained ? 'brand' : 'warn'} icon={Cpu} className="px-3 py-1.5 text-sm">
            {model.trained ? `Model trained · ${model.num_classes} ingredients` : 'Model not trained'}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={stats.total_users} sub={`${stats.active_users} active`} icon={Users} tone="info" />
        <Stat label="Ingredients" value={stats.total_foods} sub={`${stats.total_pantry_items} in ${stats.users_with_pantry} kitchens`} icon={Carrot} />
        <Stat label="Recipes" value={stats.total_recipes} sub={`${stats.total_meal_plans} planned meals`} icon={BookOpen} tone="accent" />
        <Stat label="Scans" value={stats.total_recognitions} sub={`Avg confidence ${percent(stats.avg_recognition_confidence)}`} icon={Camera} tone="warn" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle title="Recent activity" className="mb-4" />
          <Card padded={false}>
            {activity.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">Nothing has happened yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Clock className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-fg">{item.action}</p>
                      <p className="truncate text-sm text-muted">
                        {item.user} · {item.detail}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-subtle">{relativeTime(item.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <div className="space-y-6">
          <section>
            <SectionTitle title="Recognition model" className="mb-4" />
            <Card>
              {model.trained ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold text-fg">Test accuracy</span>
                      <span className="text-muted">{percent(model.test_accuracy ?? model.validation_accuracy)}</span>
                    </div>
                    <Meter value={(model.test_accuracy ?? model.validation_accuracy ?? 0) * 100} max={100} />
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold text-fg">Right answer in top 3</span>
                      <span className="text-muted">{percent(model.test_top3_accuracy)}</span>
                    </div>
                    <Meter value={(model.test_top3_accuracy ?? 0) * 100} max={100} tone="info" />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-surface-2 p-3">
                      <dt className="text-subtle">Architecture</dt>
                      <dd className="font-semibold text-fg">{model.architecture}</dd>
                    </div>
                    <div className="rounded-xl bg-surface-2 p-3">
                      <dt className="text-subtle">Trained on</dt>
                      <dd className="font-semibold text-fg">{model.train_images} images</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No trained model was found. Run the dataset and training scripts in <code>backend/ml</code>. Until then scans return
                  low-confidence guesses.
                </p>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle title="Most stocked ingredients" className="mb-4" />
            <Card>
              {topPantry.length === 0 ? (
                <p className="text-sm text-muted">No pantry data yet.</p>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topPantry} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid horizontal={false} stroke="var(--line)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--subtle)', fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                      <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                      <Bar dataKey="count" name="Kitchens" fill="var(--brand)" barSize={16} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-subtle">
        <Activity className="h-4 w-4" aria-hidden="true" />
        <Package className="h-4 w-4" aria-hidden="true" />
        Figures are computed live from the database.
      </p>
    </div>
  );
};

export default AdminDashboard;
