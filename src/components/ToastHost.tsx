import React from 'react';
import { subscribeToasts, dismissToast, ToastItem } from '../utils/toast';

const styles: Record<ToastItem['type'], string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-500',
  info: 'bg-gray-900 dark:bg-gray-700',
};

const ToastHost: React.FC = () => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles[t.type]} text-white p-4 rounded-lg shadow-lg`}
          role={t.type === 'error' ? 'alert' : 'status'}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-sm pr-2 whitespace-pre-line">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-xl font-bold leading-none shrink-0"
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
