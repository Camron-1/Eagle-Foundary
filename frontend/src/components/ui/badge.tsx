import { cn } from '@/lib/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border-border-strong bg-surface-tint text-fg-muted',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
};

const statusVariantMap: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  PUBLISHED: 'success',
  ACCEPTED: 'success',
  SELECTED: 'success',

  PENDING: 'warning',
  PENDING_OTP: 'warning',
  SUBMITTED: 'warning',
  DRAFT: 'default',
  SHORTLISTED: 'info',
  INTERVIEW: 'info',

  REJECTED: 'error',
  SUSPENDED: 'error',
  CLOSED: 'error',
  WITHDRAWN: 'error',
  CANCELLED: 'error',
  ARCHIVED: 'error',
  NEEDS_CHANGES: 'warning',

  REVIEWING: 'info',
  RESOLVED: 'success',
  DISMISSED: 'default',

  paid: 'success',
  unpaid: 'default',
  equity: 'info',
  founder: 'info',
  member: 'default',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant, className }: BadgeProps): JSX.Element {
  const resolved = variant ?? statusVariantMap[String(children)] ?? 'default';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantStyles[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}
