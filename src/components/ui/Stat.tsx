import React from 'react';

export interface StatProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'brand';
  icon?: React.ReactNode;
}

const tones: Record<NonNullable<StatProps['tone']>, string> = {
  neutral: 'text-light-text dark:text-dark-text',
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  brand: 'text-brand-primary',
};

/**
 * Standard KPI stat: label, prominent value, optional sub-line and icon.
 */
export const Stat: React.FC<StatProps> = ({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">
        {label}
      </p>
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {sub && (
        <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
          {sub}
        </p>
      )}
    </div>
    {icon && <div className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</div>}
  </div>
);

export default Stat;
