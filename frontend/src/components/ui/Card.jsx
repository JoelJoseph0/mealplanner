export const Card = ({ children, className = '', padded = true, hover = false, as: Tag = 'div', ...props }) => (
  <Tag
    className={`bg-surface border border-line rounded-3xl shadow-card ${hover ? 'card-hover' : ''} ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
    {...props}
  >
    {children}
  </Tag>
);

export const SectionTitle = ({ title, description, action, icon: Icon, className = '' }) => (
  <div className={`flex items-end justify-between gap-3 ${className}`}>
    <div className="flex items-center gap-3">
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      )}
      <div>
        <h2 className="text-xl font-semibold text-fg">{title}</h2>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);

export default Card;
