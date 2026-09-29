import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * The top of every inner page: generous whitespace, a tight display headline and a
 * soft brand glow. Works in light and dark. Extra controls (search, filters) go in children.
 */
export const PageHero: React.FC<{
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ eyebrow, title, subtitle, className = '', children }) => (
  <section
    className={`relative overflow-hidden bg-canvas pb-20 pt-28 sm:pb-24 sm:pt-36 ${className}`}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[-280px] h-[520px] w-[min(980px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(10_92_230/0.14),transparent)] dark:bg-[radial-gradient(closest-side,rgb(27_124_240/0.28),transparent)]"
    />
    <div className="relative mx-auto max-w-3xl px-5 text-center">
      {eyebrow && (
        <p className="text-brand-gradient inline-flex items-center gap-1.5 text-[13px] font-semibold sm:text-sm">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 text-balance text-[34px] font-semibold leading-[1.07] tracking-[-0.035em] text-ink sm:text-[52px] md:text-[60px]">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-[17px] leading-relaxed text-ink-3 sm:mt-5 sm:text-[20px]">
          {subtitle}
        </p>
      )}
      {children && <div className="mt-8">{children}</div>}
    </div>
  </section>
);

/** Pill search field for page heroes. */
export const HeroSearch: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  trailing?: React.ReactNode;
}> = ({ value, onChange, placeholder, label, trailing }) => (
  <div className="mx-auto flex h-12 max-w-xl items-center gap-2 rounded-full bg-surface pl-4 pr-1.5 shadow-[0_1px_2px_rgb(11_26_51/0.06),0_8px_24px_-12px_rgb(11_26_51/0.2)] ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-brand/50">
    <Search className="size-[18px] shrink-0 text-ink-3" aria-hidden />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
    />
    {value && !trailing && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
        aria-label="Clear search"
      >
        <X className="size-4" />
      </button>
    )}
    {trailing}
  </div>
);

/** A row of filter chips; the active one is filled. Scrolls sideways on narrow screens. */
export function Chips<T extends string>({
  items,
  value,
  onChange,
  className = '',
}: {
  items: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {items.map((i) => (
        <button
          key={i.value}
          type="button"
          role="tab"
          aria-selected={value === i.value}
          onClick={() => onChange(i.value)}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium transition-colors ${
            value === i.value
              ? 'bg-ink text-canvas'
              : 'bg-surface text-ink-2 ring-1 ring-line hover:text-ink'
          }`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
