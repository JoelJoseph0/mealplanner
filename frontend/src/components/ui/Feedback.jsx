import { AlertCircle, Inbox } from 'lucide-react';
import Button from './Button';

export const PageHeader = ({ title, description, actions, back, emoji, eyebrow }) => (
  <div className="mb-7 flex flex-col gap-4 animate-rise-in sm:flex-row sm:items-end sm:justify-between">
    <div className="flex min-w-0 items-center gap-4">
      {emoji && (
        <span
          className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-3xl shadow-card sm:flex"
          aria-hidden="true"
        >
          {emoji}
        </span>
      )}
      <div className="min-w-0">
        {back}
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, emoji, title, description, action, className = '' }) => (
  <div
    className={`relative flex flex-col items-center overflow-hidden rounded-3xl border border-dashed border-line bg-surface/70 px-6 py-12 text-center ${className}`}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-soft/60 to-transparent" />
    <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-brand shadow-card">
      {emoji ? (
        <span className="text-3xl" aria-hidden="true">
          {emoji}
        </span>
      ) : (
        <Icon className="h-7 w-7" aria-hidden="true" />
      )}
    </div>
    <h3 className="relative font-display text-xl font-semibold text-fg">{title}</h3>
    {description && <p className="relative mt-1.5 max-w-md text-sm text-muted">{description}</p>}
    {action && <div className="relative mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center rounded-3xl border border-line bg-surface px-6 py-12 text-center" role="alert">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
      <AlertCircle className="h-7 w-7" aria-hidden="true" />
    </div>
    <h3 className="font-display text-xl font-semibold text-fg">Something went wrong</h3>
    <p className="mt-1.5 max-w-md text-sm text-muted">{message || 'We could not load this right now.'}</p>
    {onRetry && (
      <Button variant="secondary" className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

const RING_COLORS = { brand: 'var(--brand)', accent: 'var(--accent)', warn: 'var(--warn)', saffron: 'var(--saffron)', white: '#ffffff' };

export const ProgressRing = ({ value = 0, max = 100, size = 64, stroke = 7, label, sub, tone = 'brand', track = 'var(--surface-2)', textClass = 'text-fg', subClass = 'text-subtle' }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const color = RING_COLORS[tone] || RING_COLORS.brand;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        <span className={`text-base font-bold ${textClass}`}>{label}</span>
        {sub && <span className={`text-xs ${subClass}`}>{sub}</span>}
      </div>
    </div>
  );
};

export const Meter = ({ value = 0, max = 100, tone = 'brand', className = '' }) => {
  const ratio = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colors = {
    brand: 'bg-gradient-to-r from-brand to-[#2bb673]',
    accent: 'bg-gradient-to-r from-accent to-saffron',
    warn: 'bg-warn',
    info: 'bg-gradient-to-r from-info to-[#6c8ff0]',
    saffron: 'bg-saffron',
  };
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={Math.round(ratio)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-700 ${colors[tone] || colors.brand}`} style={{ width: `${ratio}%` }} />
    </div>
  );
};

const STAT_TONES = {
  brand: 'from-brand to-[#2bb673] text-white',
  accent: 'from-accent to-saffron text-white',
  info: 'from-info to-[#6c8ff0] text-white',
  warn: 'from-saffron to-[#f7c75c] text-white',
};

export const Stat = ({ label, value, sub, icon: Icon, tone = 'brand' }) => (
  <div className="card-hover relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card">
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm font-semibold text-muted">{label}</span>
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-card ${STAT_TONES[tone] || STAT_TONES.brand}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
    </div>
    <div className="mt-3 font-display text-3xl font-semibold text-fg">{value}</div>
    {sub && <div className="mt-1 text-sm text-subtle">{sub}</div>}
  </div>
);
