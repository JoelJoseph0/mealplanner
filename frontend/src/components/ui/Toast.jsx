import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, className: 'text-brand' },
  error: { icon: AlertCircle, className: 'text-danger' },
  info: { icon: Info, className: 'text-info' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current.slice(-2), { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const { icon: Icon, className } = STYLES[toast.type] || STYLES.success;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-fg shadow-card animate-sheet-up"
              role="status"
            >
              <Icon className={`h-5 w-5 shrink-0 ${className}`} aria-hidden="true" />
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="ml-1 rounded p-0.5 text-subtle hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return { success: () => {}, error: () => {}, info: () => {} };
  }
  return context;
};

export default ToastProvider;
