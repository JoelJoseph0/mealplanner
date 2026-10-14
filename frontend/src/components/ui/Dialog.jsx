import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
};

export const Dialog = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-2xl outline-none animate-sheet-up sm:rounded-3xl sm:animate-pop-in ${SIZES[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
};

export default Dialog;
