import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationPrefsDto,
} from '@gnk/types';
import { cn } from '../lib/cn';

type Channel = 'email' | 'whatsapp';
const CHANNEL_LABEL: Record<Channel, string> = { email: 'Email', whatsapp: 'WhatsApp' };

/** Per-category switches for email (and WhatsApp for partners). In-app is always on. */
export function NotificationPreferences({
  value,
  onChange,
  categories = Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[],
  channels = ['email'],
  disabled,
}: {
  value: NotificationPrefsDto | undefined;
  onChange: (category: NotificationCategory, patch: Partial<Record<Channel, boolean>>) => void;
  categories?: NotificationCategory[];
  channels?: Channel[];
  disabled?: boolean;
}) {
  const isOn = (c: NotificationCategory, ch: Channel) =>
    ch === 'email' ? (value?.[c]?.email ?? true) : (value?.[c]?.whatsapp ?? false);
  return (
    <ul className="divide-y divide-border/60">
      {categories.map((c) => {
        const summary = channels
          .map((ch) => `${CHANNEL_LABEL[ch].toLowerCase()} ${isOn(c, ch) ? 'on' : 'off'}`)
          .join(' · ');
        return (
          <li key={c} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{NOTIFICATION_CATEGORIES[c]}</p>
              <p className="text-xs text-muted-foreground">In the app always · {summary}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {channels.map((ch) => {
                const on = isOn(c, ch);
                return (
                  <label key={ch} className="flex items-center gap-2">
                    {channels.length > 1 && (
                      <span className="text-xs text-muted-foreground">{CHANNEL_LABEL[ch]}</span>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${CHANNEL_LABEL[ch]} for ${NOTIFICATION_CATEGORIES[c]}`}
                      disabled={disabled || !value}
                      onClick={() => onChange(c, { [ch]: !on })}
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
                  </label>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
