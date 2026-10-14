import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { Badge, Card, ErrorState, PageHeader, SectionTitle, Skeleton, Stat } from '../../components/ui';
import { Camera, CalendarDays, Package, Target } from 'lucide-react';

const TOOLTIP = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' };
const AXIS = { fill: 'var(--subtle)', fontSize: 12 };

const Empty = ({ children }) => <p className="py-10 text-center text-sm text-muted">{children}</p>;

export const Reports = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'reports'], queryFn: adminService.reports });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const vision = data.computer_vision_performance || {};
  const model = vision.model || {};
  const planning = data.meal_planning || {};
  const pantry = data.pantry || {};
  const satisfaction = data.user_satisfaction || {};
  const monthly = data.monthly_activity || [];
  const confidence = vision.confidence_distribution || [];
  const recognized = vision.most_recognized_ingredients || [];
  const cooked = planning.most_cooked_recipes?.length ? planning.most_cooked_recipes : planning.most_planned_recipes || [];
  const feedback = satisfaction.feedback_breakdown || {};

  return (
    <div>
      <PageHeader title="Reports" emoji="📊" description="Model quality, usage trends and what people cook." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total scans" value={vision.total_inferences ?? 0} sub={`${vision.high_confidence_rate_percentage ?? 0}% above 50% confidence`} icon={Camera} />
        <Stat label="Days planned" value={planning.planned_days ?? 0} sub={`${planning.plan_entries ?? 0} meals`} icon={CalendarDays} tone="info" />
        <Stat label="Pantry items" value={pantry.total_items ?? 0} sub="Across all kitchens" icon={Package} tone="accent" />
        <Stat
          label="Model test accuracy"
          value={model.test_accuracy != null ? `${(model.test_accuracy * 100).toFixed(1)}%` : 'Not trained'}
          sub={model.trained ? `Top 3: ${(model.test_top3_accuracy * 100).toFixed(1)}%` : 'Run the training pipeline'}
          icon={Target}
          tone="warn"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle title="Activity, last 6 months" className="mb-4" />
          <Card>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="month" tick={AXIS} />
                  <YAxis allowDecimals={false} tick={AXIS} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend />
                  <Line type="monotone" dataKey="scans" name="Scans" stroke="var(--brand)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="pantry_additions" name="Pantry additions" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="meals_logged" name="Meals logged" stroke="var(--info)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="new_users" name="New users" stroke="var(--warn)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle title="Scan confidence" className="mb-4" />
          <Card>
            {vision.total_inferences ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confidence} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="range" tick={AXIS} />
                    <YAxis allowDecimals={false} tick={AXIS} />
                    <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'var(--surface-2)' }} />
                    <Bar dataKey="count" name="Scans" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty>No scans recorded yet.</Empty>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle title="Most scanned ingredients" className="mb-4" />
          <Card>
            {recognized.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recognized} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid stroke="var(--line)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={AXIS} />
                    <YAxis type="category" dataKey="name" width={90} tick={AXIS} />
                    <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'var(--surface-2)' }} />
                    <Bar dataKey="count" name="Scans" fill="var(--accent)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty>No scans recorded yet.</Empty>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle
            title={planning.most_cooked_recipes?.length ? 'Most cooked recipes' : 'Most planned recipes'}
            className="mb-4"
          />
          <Card>
            {cooked.length ? (
              <ol className="space-y-3">
                {cooked.map((item, index) => (
                  <li key={item.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{index + 1}</span>
                    <span className="flex-1 font-semibold text-fg">{item.name}</span>
                    <span className="text-sm text-muted">{item.count}x</span>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>No plans or cooked meals yet.</Empty>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Badge tone="brand">Average rating {satisfaction.average_rating ?? 0} / 5</Badge>
              {Object.entries(feedback).map(([label, count]) => (
                <Badge key={label}>
                  {label}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Reports;
