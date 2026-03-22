import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04]',
        'animate-pulse motion-reduce:animate-none',
        className,
      )}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/45">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-6 border-b border-white/5 px-4 py-3 last:border-b-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton(): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-5 space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-64" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}
