import * as React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  count?: number;
}

/** Underlined tab bar, used for list filters (with counts) and detail sections. */
export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('-mb-px flex gap-1 overflow-x-auto border-b [scrollbar-width:none]', className)}
    >
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  'tabular rounded-full px-1.5 text-[11px] font-semibold',
                  active ? 'bg-accent-soft text-link' : 'bg-muted text-muted-foreground',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { label: React.ReactNode; href?: string; onClick?: () => void }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="size-3" aria-hidden />}
          {item.href || item.onClick ? (
            <a href={item.href} onClick={item.onClick} className="hover:text-foreground">
              {item.label}
            </a>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {breadcrumbs}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">{title}</h1>
          {meta}
        </div>
        {description && (
          <p className="max-w-3xl text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn('flex items-center gap-2', className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                done && 'border-success bg-success text-white',
                active && 'border-primary bg-primary text-primary-foreground',
                !done && !active && 'border-border-strong text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'truncate text-xs font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
                'hidden sm:inline',
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1', done ? 'bg-success' : 'bg-border')} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export interface TimelineItem {
  title: React.ReactNode;
  time?: React.ReactNode;
  body?: React.ReactNode;
  tone?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

const timelineDot = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  neutral: 'bg-muted-foreground/50',
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('relative space-y-4', className)}>
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-3">
          {i < items.length - 1 && (
            <span
              className="absolute left-[5px] top-4 h-[calc(100%+4px)] w-px bg-border"
              aria-hidden
            />
          )}
          <span
            className={cn(
              'relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-surface',
              timelineDot[item.tone ?? 'neutral'],
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-medium">{item.title}</p>
              {item.time && <p className="text-xs text-muted-foreground">{item.time}</p>}
            </div>
            {item.body && (
              <div className="mt-0.5 text-[13px] text-muted-foreground">{item.body}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
