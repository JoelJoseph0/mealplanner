import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export const ErrorMessage = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center max-w-lg mx-auto ${className}`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-red-900 mb-1">{title}</h4>
      <p className="text-sm text-red-700 mb-4">{message || 'An unexpected error occurred. Please try again.'}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={onRetry}
          className="border-red-200 text-red-700 hover:bg-red-100/50"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorMessage;
