import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

interface GlowCardProps {
  className?: string;
}

export function GlowCard({ children, className }: PropsWithChildren<GlowCardProps>): JSX.Element {
  return <div className={cn('glass-card ef-card rounded-2xl p-6', className)}>{children}</div>;
}
