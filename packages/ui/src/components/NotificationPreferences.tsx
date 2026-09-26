import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationPrefsDto,
} from '@gnk/types';
import { cn } from '../lib/cn';

/** Per-category email switches. In-app notifications are always on. */
export function NotificationPreferences({
  value,
  onChange,
  categories = Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[],
  disabled,
}: {
  value: NotificationPrefsDto | undefined;
  onChange: (category: NotificationCategory, email: boolean) => void;
  categories?: NotificationCategory[];
  disabled?: boolean;
}) {
  return (
    <ul className="divide-y divide-border/60">
      {categories.map((c) => {
        const on = value?.[c]?.email ?? true;
        return (
          <li key={c} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">{NOTIFICATION_CATEGORIES[c]}</p>
              <p className="text-xs text-muted-foreground">
                In the app always · email {on ? 'on' : 'off'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`Email for ${NOTIFICATION_CATEGORIES[c]}`}
              disabled={disabled || !value}
              onClick={() => onChange(c, !on)}
              className={cn(
                'relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200 ease-[var(--ease)] disabled:opacity-50',
                on ? 'bg-success' : 'bg-border-strong',
              )}
            >
              <span
                className={cn(
                  'absolute top-[2px] size-[22px] rounded-full bg-white shadow-[0_2px_4px_hsl(0_0%_0%/0.2)] transition-transform duration-200 ease-[var(--ease)]',
                  on ? 'translate-x-[20px]' : 'translate-x-[2px]',
                )}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
