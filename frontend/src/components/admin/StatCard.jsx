import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = 'up',
  subText,
  color = 'emerald',
}) => {
  const colorSchemes = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'hover:border-emerald-200',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'hover:border-blue-200',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'hover:border-purple-200',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'hover:border-amber-200',
    },
  };

  const scheme = colorSchemes[color] || colorSchemes.emerald;

  return (
    <div
      className={`rounded-2xl bg-white border border-slate-200 p-5 shadow-xs transition-all duration-200 ${scheme.border} flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${scheme.bg} ${scheme.text}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>

        {(trend || subText) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center font-bold ${
                  trendDirection === 'up' ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {trendDirection === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                )}
                {trend}
              </span>
            )}
            {subText && <span className="text-slate-400">{subText}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
