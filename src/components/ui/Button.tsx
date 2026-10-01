import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-brand-primary hover:bg-brand-primary/90 focus:ring-brand-primary',
  secondary:
    'text-light-text dark:text-dark-text bg-transparent border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-brand-primary',
  ghost:
    'text-brand-primary hover:underline focus:ring-brand-primary bg-transparent',
  danger: 'text-white bg-red-500 hover:bg-red-600 focus:ring-red-500',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'py-1.5 px-3 text-xs',
  md: 'py-2 px-4 text-sm',
};

/**
 * Standard button: brand focus ring, disabled state, optional spinner.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`flex items-center justify-center gap-2 rounded-md shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    {...rest}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
    {children}
  </button>
);

export default Button;
