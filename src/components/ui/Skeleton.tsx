import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card';
  className?: string;
  lines?: number;
}

const base = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

/**
 * Loading placeholder. `card` renders a generic content block;
 * `lines` renders stacked text rows.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  className = '',
  lines = 3,
}) => {
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${base} h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }
  if (variant === 'circle') {
    return <div className={`${base} rounded-full h-12 w-12 ${className}`} aria-hidden="true" />;
  }
  if (variant === 'card') {
    return (
      <div className={`glass-panel rounded-xl p-6 ${className}`} aria-hidden="true">
        <div className={`${base} h-5 w-1/3 mb-4`} />
        <div className={`${base} h-8 w-1/2 mb-2`} />
        <div className={`${base} h-4 w-2/3`} />
      </div>
    );
  }
  return <div className={`${base} ${className}`} aria-hidden="true" />;
};

export default Skeleton;
