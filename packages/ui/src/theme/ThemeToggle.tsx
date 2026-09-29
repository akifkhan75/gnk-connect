import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/cn';
import { useTheme, type Theme } from './ThemeProvider';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/** Three-state segmented control: light / system / dark. */
export function ThemeToggle({
  className,
  showLabels = false,
}: {
  className?: string;
  showLabels?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border bg-surface-sunken p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
            theme === value && 'bg-surface text-foreground shadow-card',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {showLabels ? label : <span className="sr-only">{label}</span>}
        </button>
      ))}
    </div>
  );
}
