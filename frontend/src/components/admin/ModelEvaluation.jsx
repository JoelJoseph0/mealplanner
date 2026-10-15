import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown } from 'lucide-react';
import { adminService } from '../../services';
import { Badge, Card, SectionTitle, Skeleton } from '../ui';

const pct = (value) => (value == null ? 'n/a' : `${(value * 100).toFixed(1)}%`);

const scoreTone = (value) => (value >= 0.9 ? 'brand' : value >= 0.75 ? 'saffron' : 'danger');

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  f1: (a, b) => a.f1 - b.f1,
  precision: (a, b) => a.precision - b.precision,
  recall: (a, b) => a.recall - b.recall,
};

const ConfusionMatrix = ({ names, matrix }) => {
  const [hover, setHover] = useState(null);
  const rowTotals = matrix.map((row) => row.reduce((sum, n) => sum + n, 0));
  const short = (name) => (name.length > 9 ? `${name.slice(0, 8)}…` : name);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          Rows are the true ingredient, columns the prediction. Darker cells hold a larger share of that row.
        </p>
        <p className="min-h-[1.25rem] font-semibold text-fg" aria-live="polite">
          {hover
            ? `${hover.actual} predicted as ${hover.predicted}: ${hover.count} of ${hover.total}`
            : 'Hover a cell for details'}
        </p>
      </div>
      <div className="overflow-x-auto pb-2">
        <table className="border-separate" style={{ borderSpacing: 2 }} role="grid" aria-label="Confusion matrix">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface" />
              {names.map((name) => (
                <th key={name} className="h-24 w-6 align-bottom" scope="col">
                  <span className="block w-6 origin-bottom-left translate-x-4 -rotate-60 whitespace-nowrap text-left text-[10px] font-semibold text-subtle">
                    {short(name)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={names[i]}>
                <th scope="row" className="sticky left-0 whitespace-nowrap bg-surface pr-2 text-right text-[11px] font-semibold text-muted">
                  {names[i]}
                </th>
                {row.map((count, j) => {
                  const share = rowTotals[i] ? count / rowTotals[i] : 0;
                  const diagonal = i === j;
                  const color = diagonal ? 'var(--brand)' : 'var(--accent)';
                  const info = { actual: names[i], predicted: names[j], count, total: rowTotals[i] };
                  return (
                    <td
                      key={names[j]}
                      onMouseEnter={() => setHover(info)}
                      onMouseLeave={() => setHover(null)}
                      title={`${names[i]} → ${names[j]}: ${count}`}
                      className="h-6 w-6 rounded-[4px] text-center text-[9px] font-bold"
                      style={{
                        background: count ? `color-mix(in srgb, ${color} ${Math.round(18 + share * 82)}%, var(--surface))` : 'var(--surface-2)',
                        color: share > 0.5 ? '#fff' : 'var(--fg)',
                        outline: hover && hover.actual === names[i] && hover.predicted === names[j] ? '2px solid var(--fg)' : 'none',
                      }}
                    >
                      {count > 0 && !diagonal ? count : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-brand" aria-hidden="true" /> Correct (diagonal)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-accent" aria-hidden="true" /> Confused, with count
        </span>
      </div>
    </div>
  );
};

export const ModelEvaluation = () => {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'model-evaluation'], queryFn: adminService.modelEvaluation });
  const [sort, setSort] = useState({ key: 'f1', dir: 1 });

  const rows = useMemo(() => {
    const list = [...(data?.per_class || [])];
    list.sort((a, b) => SORTS[sort.key](a, b) * sort.dir);
    return list;
  }, [data, sort]);

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data?.available) {
    return (
      <Card>
        <p className="text-sm text-muted">
          No evaluation report yet. Run <code className="rounded bg-surface-2 px-1.5 py-0.5">python ml/evaluation/evaluate.py</code> after training.
        </p>
      </Card>
    );
  }

  const toggleSort = (key) => setSort((current) => ({ key, dir: current.key === key ? -current.dir : 1 }));
  const header = (key, label) => (
    <th className="px-4 py-2.5 font-semibold" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-fg">
        {label}
        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Accuracy', data.accuracy],
          ['Top-3 accuracy', data.top3_accuracy],
          ['Precision (macro)', data.precision_macro],
          ['Recall (macro)', data.recall_macro],
          ['F1-score (macro)', data.f1_macro],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-line bg-surface p-4 shadow-card">
            <p className="text-sm font-semibold text-muted">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-fg">{pct(value)}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        Measured on {data.test_images} held-out test images across {data.class_names?.length} ingredients
        {data.model?.architecture ? ` with ${data.model.architecture} transfer learning` : ''}.
      </p>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="xl:col-span-3">
          <SectionTitle title="Confusion matrix" className="mb-4" />
          <Card>
            {data.confusion_matrix ? (
              <ConfusionMatrix names={data.class_names} matrix={data.confusion_matrix} />
            ) : (
              <p className="text-sm text-muted">Re-run the evaluation script to include the confusion matrix.</p>
            )}
          </Card>
        </section>

        <section className="xl:col-span-2">
          <SectionTitle title="Most confused pairs" className="mb-4" />
          <Card>
            {data.most_confused?.length ? (
              <ul className="space-y-3">
                {data.most_confused.map((pair) => (
                  <li key={`${pair.actual}-${pair.predicted}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-fg">
                      <span className="font-semibold">{pair.actual}</span>
                      <span className="text-subtle"> taken for </span>
                      <span className="font-semibold">{pair.predicted}</span>
                    </span>
                    <Badge tone="accent">{pair.count}x</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No confusions recorded.</p>
            )}
          </Card>
        </section>
      </div>

      <section>
        <SectionTitle title="Per-ingredient metrics" description="Click a column to sort. Weakest classes first by default." className="mb-4" />
        <Card padded={false} className="overflow-hidden">
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="sticky top-0 border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-subtle">
                <tr>
                  {header('name', 'Ingredient')}
                  {header('precision', 'Precision')}
                  {header('recall', 'Recall')}
                  {header('f1', 'F1-score')}
                  <th className="px-4 py-2.5 font-semibold">Test images</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td className="px-4 py-2.5 font-semibold text-fg">{row.name}</td>
                    <td className="px-4 py-2.5 text-muted">{pct(row.precision)}</td>
                    <td className="px-4 py-2.5 text-muted">{pct(row.recall)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={scoreTone(row.f1)}>{pct(row.f1)}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{row.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default ModelEvaluation;
