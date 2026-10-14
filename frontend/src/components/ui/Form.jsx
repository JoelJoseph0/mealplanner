import { useId } from 'react';
import { Search, X } from 'lucide-react';

const FIELD =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.03)] placeholder:text-subtle transition-all hover:border-subtle/50 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-surface-2 disabled:text-subtle';

export const Field = ({ label, hint, error, required, htmlFor, children }) => (
  <div className="w-full">
    {label && (
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="mt-1.5 text-sm text-danger" role="alert">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>
    )}
  </div>
);

export const Input = ({ label, hint, error, required, icon: Icon, className = '', id, ...props }) => {
  const generated = useId();
  const inputId = id || generated;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />}
        <input
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          className={`${FIELD} ${Icon ? 'pl-10' : ''} ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        />
      </div>
    </Field>
  );
};

export const Select = ({ label, hint, error, required, options = [], className = '', id, ...props }) => {
  const generated = useId();
  const selectId = id || generated;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId}>
      <select id={selectId} required={required} className={`${FIELD} ${className}`} {...props}>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          return (
            <option key={String(value)} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
};

export const Textarea = ({ label, hint, error, required, className = '', id, rows = 4, ...props }) => {
  const generated = useId();
  const areaId = id || generated;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={areaId}>
      <textarea id={areaId} rows={rows} required={required} className={`${FIELD} ${className}`} {...props} />
    </Field>
  );
};

export const Checkbox = ({ label, description, checked, onChange, className = '' }) => (
  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors hover:bg-surface-2 ${checked ? 'border-brand/50 bg-brand-soft/50' : 'border-line'} ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
    />
    <span>
      <span className="block text-sm font-semibold text-fg">{label}</span>
      {description && <span className="block text-xs text-muted">{description}</span>}
    </span>
  </label>
);

export const SearchBar = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${FIELD} pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden`}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-fg"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

export const Chip = ({ children, active = false, onClick, onRemove, icon: Icon, className = '' }) => {
  const base = `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
    active ? 'border-brand bg-brand text-brand-fg shadow-glow' : 'border-line bg-surface text-muted shadow-card hover:-translate-y-px hover:border-brand/40 hover:text-fg'
  } ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={base}>
        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
        {children}
      </button>
    );
  }
  return (
    <span className={base}>
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${typeof children === 'string' ? children : ''}`} className="-mr-1 rounded-full p-0.5 hover:bg-black/10">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
};
