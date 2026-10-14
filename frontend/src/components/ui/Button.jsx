import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-gradient-to-b from-brand to-brand-hover text-brand-fg shadow-glow hover:brightness-110 active:brightness-95 ring-1 ring-inset ring-white/10',
  secondary: 'bg-surface text-fg border border-line shadow-card hover:bg-surface-2 hover:border-subtle/40',
  soft: 'bg-brand-soft text-brand hover:brightness-95',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white hover:brightness-110 shadow-sm',
  dangerSoft: 'bg-danger-soft text-danger hover:brightness-95',
  light: 'bg-white text-brand-strong shadow-lg hover:bg-white/90',
  glass: 'bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur hover:bg-white/25',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-10 w-10 justify-center',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  full = false,
  to,
  type = 'button',
  className = '',
  ...props
}) => {
  const classes = `inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled || loading} className={classes} {...props}>
      {content}
    </button>
  );
};

export default Button;
