import * as React from 'react';
import { cn } from '../lib/cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl bg-surface shadow-card', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-6 tracking-[-0.015em]">{title}</h3>
          {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-border/70 px-5 py-3',
        className,
      )}
      {...props}
    />
  );
}

const tones = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-accent-soft text-link',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  gold: 'bg-highlight-soft text-highlight-strong',
};

/** KPI tile: label, big value, optional hint and icon. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
  onClick,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-xl bg-surface p-4 text-left shadow-card',
        onClick &&
          'transition-[box-shadow,transform] duration-200 ease-[var(--ease)] hover:shadow-pop active:scale-[0.99]',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="tabular mt-1 text-[24px] font-semibold leading-tight tracking-[-0.025em] [overflow-wrap:anywhere]">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {icon && (
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-[17px]',
            tones[tone],
          )}
        >
          {icon}
        </div>
      )}
    </Comp>
  );
}

/** Definition list for detail panels. */
export function KeyValue({
  items,
  columns = 2,
  className,
}: {
  items: { label: React.ReactNode; value: React.ReactNode; wide?: boolean }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3.5',
        columns === 1
          ? 'grid-cols-1'
          : columns === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-3',
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={i} className={cn('min-w-0', item.wide && 'sm:col-span-full')}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
