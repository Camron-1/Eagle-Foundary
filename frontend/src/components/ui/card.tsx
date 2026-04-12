import { cn } from '@/lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export function Card({ children, className, interactive }: CardProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-panel p-5 backdrop-blur-sm',
        interactive && 'ef-card',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <h3 className={cn('text-lg font-semibold text-fg', className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <p className={cn('mt-1 text-sm text-fg-muted', className)}>{children}</p>;
}
