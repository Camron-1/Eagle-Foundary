import { cn } from '@/lib/cn';

interface TabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps): JSX.Element {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
            active === tab
              ? 'border-border-strong bg-surface-tint-strong text-fg'
              : 'border-border-input bg-surface-faint text-fg-muted hover:border-border-strong hover:text-fg',
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
