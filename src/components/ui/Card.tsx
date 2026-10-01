import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * Standard surface card: glass panel + card radius.
 * Matches the legacy `glass-panel p-6 rounded-xl` pattern exactly.
 */
export const Card: React.FC<CardProps> = ({
  padding = 'md',
  className = '',
  children,
  ...rest
}) => (
  <div className={`glass-panel rounded-xl ${paddings[padding]} ${className}`} {...rest}>
    {children}
  </div>
);

export default Card;
