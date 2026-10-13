export const ProgressBar = ({
  value = 0,
  max = 100,
  label,
  subLabel,
  color = 'emerald',
  size = 'md',
  showPercent = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  const colorVariants = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
  };

  const heightVariants = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || subLabel || showPercent) && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
          <span className="text-slate-700">{label}</span>
          <span className="text-slate-500">
            {subLabel || (showPercent ? `${Math.round(percentage)}%` : `${value} / ${max}`)}
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightVariants[size]}`}>
        <div
          className={`${colorVariants[color] || 'bg-emerald-500'} ${heightVariants[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
