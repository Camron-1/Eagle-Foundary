import * as React from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'ghost' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  withBorderEffect?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'ef-button-primary text-black',
  ghost: 'ef-button-ghost text-white',
  outline: 'ef-button-outline text-white',
};

export function Button({
  className,
  variant = 'primary',
  withBorderEffect = true,
  children,
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        'ef-button inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        withBorderEffect ? 'with-border-effect' : 'no-border-effect',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
