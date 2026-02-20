import { cn } from '@/lib/cn';

interface SectionHeadingProps {
  title: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeading({ title, description, centered, className }: SectionHeadingProps): JSX.Element {
  return (
    <div className={cn(centered && 'text-center', className)}>
      <h2 className="ef-heading-gradient text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
      {description ? (
        <p className={cn('mt-4 max-w-2xl text-sm text-zinc-300 md:text-base', centered && 'mx-auto')}>{description}</p>
      ) : null}
    </div>
  );
}
