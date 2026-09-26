import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatMoney, initials } from '../lib/format';
import logoSrc from '../assets/logo.png';
import logoWhiteSrc from '../assets/logo-white.png';
import markSrc from '../assets/mark.png';
import markWhiteSrc from '../assets/mark-white.png';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white',
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
 * The GNK Connect logo (brand artwork in ../assets). The navy-ink version is used on
 * light surfaces and switches to the white-ink version in dark mode; `onDark` forces
 * white for dark panels. `compact` shows only the G-and-plane mark.
 */
export function Logo({
  className,
  onDark,
  product,
  compact,
  size = 30,
  variant,
}: {
  className?: string;
  /** Shorthand for variant="white". */
  onDark?: boolean;
  /** auto: navy ink, white in dark mode (default). ink/white: always that version. */
  variant?: 'auto' | 'ink' | 'white';
  product?: string;
  compact?: boolean;
  /** Rendered height in px. */
  size?: number;
}) {
  const [light, dark] = compact ? [markSrc, markWhiteSrc] : [logoSrc, logoWhiteSrc];
  const img = (src: string, cls?: string) => (
    <img
      src={src}
      alt="GNK Connect"
      height={size}
      style={{ height: size }}
      className={cn('w-auto shrink-0 select-none', cls)}
      draggable={false}
    />
  );
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {(variant ?? (onDark ? 'white' : 'auto')) === 'white' ? (
        img(dark)
      ) : variant === 'ink' ? (
        img(light)
      ) : (
        <>
          {img(light, 'dark:hidden')}
          {img(dark, 'hidden dark:block')}
        </>
      )}
      {product && !compact && (
        <span
          className={cn(
            'border-l pl-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.12em]',
            onDark ? 'border-white/20 text-white/60' : 'border-border text-muted-foreground',
          )}
        >
          {product}
        </span>
      )}
    </span>
  );
}
