export const Tabs = ({ tabs, value, onChange, className = '' }) => (
  <div
    role="tablist"
    className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 shadow-card no-scrollbar ${className}`}
  >
    {tabs.map((tab) => {
      const active = tab.id === value;
      return (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={active}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            active ? 'bg-brand text-brand-fg shadow-glow' : 'text-muted hover:bg-surface-2 hover:text-fg'
          }`}
        >
          {tab.icon && <tab.icon className="h-4 w-4" aria-hidden="true" />}
          {tab.label}
          {tab.count != null && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                active ? 'bg-white/20 text-brand-fg' : 'bg-surface-2 text-muted'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export const Segmented = ({ options, value, onChange, className = '', size = 'md' }) => (
  <div className={`inline-flex rounded-xl border border-line bg-surface-2 p-1 ${className}`} role="radiogroup">
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(option.value)}
          className={`rounded-lg font-semibold transition-all ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${
            active ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default Tabs;
