import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps): JSX.Element | null {
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);

  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <button
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
        aria-label="Previous page"
        className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-surface-tint hover:text-fg disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="px-2 text-xs text-fg-subtle">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={current === p ? 'page' : undefined}
            className={cn(
              'h-8 min-w-[32px] rounded-lg px-2 text-xs font-medium transition-colors',
              current === p ? 'bg-surface-tint-strong text-fg' : 'text-fg-muted hover:bg-surface-tint hover:text-fg',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        disabled={current >= totalPages}
        onClick={() => onPageChange(current + 1)}
        aria-label="Next page"
        className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-surface-tint hover:text-fg disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
