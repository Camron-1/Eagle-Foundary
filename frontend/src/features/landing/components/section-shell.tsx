import { cn } from '@/lib/cn';
import type { PropsWithChildren } from 'react';

interface SectionShellProps {
  className?: string;
  id?: string;
}

export function SectionShell({ children, className, id }: PropsWithChildren<SectionShellProps>): JSX.Element {
  return (
    <section id={id} className={cn('mx-auto w-full max-w-6xl px-6 py-20 md:px-8 md:py-28', className)}>
      {children}
    </section>
  );
}
