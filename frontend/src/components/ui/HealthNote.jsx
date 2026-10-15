import { HeartPulse, Info } from 'lucide-react';

export const HealthNote = ({ conditions = [], compact = false, className = '' }) => {
  const hasConditions = conditions.length > 0;

  if (compact && !hasConditions) {
    return (
      <p className={`flex items-start gap-2 text-xs text-subtle ${className}`}>
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Nutrition values are estimates for general guidance, not medical or dietary advice.
      </p>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        hasConditions ? 'border-info/30 bg-info-soft text-fg' : 'border-line bg-surface-2/70 text-muted'
      } ${className}`}
      role="note"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          hasConditions ? 'bg-info text-white' : 'bg-surface text-subtle'
        }`}
      >
        {hasConditions ? <HeartPulse className="h-5 w-5" aria-hidden="true" /> : <Info className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div>
        {hasConditions ? (
          <>
            <p className="font-semibold text-fg">Talk to a professional about {conditions.join(', ')}</p>
            <p className="mt-0.5">
              Suggestions here are general and do not account for medical conditions. Please check your meal plan with a
              doctor or registered dietitian before relying on it.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-fg">For general guidance only</p>
            <p className="mt-0.5">
              Meal suggestions and nutrition values are estimates. They do not diagnose conditions, prescribe diets or
              replace advice from a doctor or registered dietitian.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default HealthNote;
