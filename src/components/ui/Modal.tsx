import React from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '4xl';
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
}

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '4xl': 'max-w-4xl',
};

/**
 * Accessible modal shell: backdrop, Escape-to-close, body scroll lock,
 * initial focus on the close button, blurred backdrop.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  footer,
  headerAction,
}) => {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 glass-panel animated-border rounded-xl shadow-xl w-full ${widths[maxWidth]} max-h-[90vh] flex flex-col`}
      >
        <header className="flex items-center justify-between gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold gradient-text truncate">{title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              ref={closeRef}
              onClick={onClose}
              className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={`Close ${title}`}
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="p-6 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
