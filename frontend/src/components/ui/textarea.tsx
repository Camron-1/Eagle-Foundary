import * as React from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-xl border bg-surface-input px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-page',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'min-h-[80px] resize-y',
            error ? 'border-red-500/50' : 'border-border-input hover:border-border-strong',
            className,
          )}
          {...props}
        />
        {error && <p id={errorId} className="text-xs text-red-400" aria-live="polite">{error}</p>}
        {hint && !error && <p id={hintId} className="text-xs text-fg-subtle">{hint}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
