import * as React from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'ghost' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  withBorderEffect?: boolean;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'ef-button-primary text-fg-inverse',
  ghost: 'ef-button-ghost text-fg',
  outline: 'ef-button-outline text-fg',
};

const buttonClasses = (variant: ButtonVariant, withBorderEffect: boolean) =>
  cn(
    'ef-button inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:cursor-not-allowed disabled:opacity-60',
    variantClasses[variant],
    withBorderEffect ? 'with-border-effect' : 'no-border-effect'
  );

export function Button({
  className,
  variant = 'primary',
  withBorderEffect = true,
  asChild = false,
  children,
  ...props
}: ButtonProps): JSX.Element {
  const classes = cn(buttonClasses(variant, withBorderEffect), className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...props,
      className: cn(classes, (children as React.ReactElement<{ className?: string }>).props.className),
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
