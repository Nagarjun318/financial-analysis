import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Standard empty state: icon, title, hint, optional primary action.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6">
    <div className="mb-3 text-gray-400 dark:text-gray-500">
      {icon ?? <Inbox className="h-12 w-12" aria-hidden="true" />}
    </div>
    <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
      {title}
    </h3>
    {description && (
      <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-sm">
        {description}
      </p>
    )}
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
