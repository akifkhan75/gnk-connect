import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatMoney, initials } from '../lib/format';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-link',
        className,
      )}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}

export function Money({
  value,
  className,
  decimals,
  signed,
}: {
  value: number | null | undefined;
  className?: string;
  decimals?: boolean;
  signed?: boolean;
}) {
  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        signed && value != null && value < 0 && 'text-danger',
        className,
      )}
    >
      {formatMoney(value, { decimals })}
    </span>
  );
}

export function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label={`${label}: ${value}`}
    >
      {done ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

/**
 * GNK Connect mark + wordmark. Placeholder artwork: swap the <svg> for the
 * official logo file when available; every app renders the logo through this.
 */
export function Logo({
  className,
  onDark,
  product,
  compact,
}: {
  className?: string;
  onDark?: boolean;
  product?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="size-8 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="10" fill={onDark ? '#ffffff' : '#00205B'} />
        <path
          d="M27.5 14.2A9.5 9.5 0 1 0 29.5 21h-9"
          fill="none"
          stroke={onDark ? '#00205B' : '#ffffff'}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <circle cx="30.5" cy="10.5" r="3" fill="#F59E0B" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'text-[15px] font-bold tracking-tight',
              onDark ? 'text-white' : 'text-foreground',
            )}
          >
            GNK <span className="font-medium">Connect</span>
          </span>
          {product && (
            <span
              className={cn(
                'mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                onDark ? 'text-white/55' : 'text-muted-foreground',
              )}
            >
              {product}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
