import { useId } from 'react';

export const Select = ({
  label,
  options = [],
  error,
  helperText,
  id,
  required = false,
  className = '',
  placeholder = 'Select an option',
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || props.name || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={`block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors appearance-none focus:outline-none focus:ring-2 focus:border-transparent ${
            error
              ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
              : 'border-slate-200 hover:border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt, i) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const text = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={i} value={val}>
                {text}
              </option>
            );
          })}
        </select>

        {/* Dropdown Arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Select;
