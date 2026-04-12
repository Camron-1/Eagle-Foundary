import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/ThemeProvider';
import { cn } from '@/lib/cn';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps): JSX.Element {
  const { resolved, toggleTheme } = useTheme();
  const Icon = resolved === 'light' ? Sun : Moon;
  const label = resolved === 'light' ? 'Light theme' : 'Dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`${label} — switch to ${resolved === 'light' ? 'dark' : 'light'}`}
      aria-label={`${label}. Click to switch to ${resolved === 'light' ? 'dark' : 'light'} mode.`}
      className={cn(
        'ef-button ef-button-ghost no-border-effect inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-fg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-strong focus-visible:ring-offset-2 focus-visible:ring-offset-page',
        className
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
