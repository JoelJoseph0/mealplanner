const TONES = {
  neutral: 'bg-surface-2 text-muted ring-line',
  brand: 'bg-brand-soft text-brand ring-brand/15',
  accent: 'bg-accent-soft text-accent ring-accent/15',
  saffron: 'bg-saffron-soft text-warn ring-saffron/20',
  warn: 'bg-warn-soft text-warn ring-warn/15',
  danger: 'bg-danger-soft text-danger ring-danger/15',
  info: 'bg-info-soft text-info ring-info/15',
  solid: 'bg-brand text-brand-fg ring-transparent',
};

export const Badge = ({ children, tone = 'neutral', icon: Icon, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${TONES[tone]} ${className}`}>
    {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
    {children}
  </span>
);

export default Badge;
