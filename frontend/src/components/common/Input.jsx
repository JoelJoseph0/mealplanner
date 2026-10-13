import { useId } from 'react';

export const Input = ({
  label,
  error,
  helperText,
  id,
  type = 'text',
  icon: Icon,
  endIcon,
  required = false,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          type={type}
          className={`block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:border-transparent ${
            Icon ? 'pl-10' : ''
          } ${endIcon ? 'pr-11' : ''} ${
            error
              ? 'border-red-300 focus:ring-red-400 focus:border-red-400 bg-red-50/20'
              : 'border-slate-200 hover:border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
          } ${className}`}
          {...props}
        />

        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
            {endIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
