import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  className?: string;
}

export function FilterBar({ searchValue, onSearchChange, searchPlaceholder = 'Search...', filters, className }: FilterBarProps): JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {onSearchChange && (
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder ?? 'Search'}
            className="w-full rounded-xl border border-border-input bg-surface-input py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-ring hover:border-border-strong"
          />
        </div>
      )}

      {filters?.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          aria-label={f.label}
          className="appearance-none rounded-xl border border-border-input bg-surface-input px-3 py-2 text-xs text-fg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring hover:border-border-strong"
        >
          <option value="">{f.label}</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
