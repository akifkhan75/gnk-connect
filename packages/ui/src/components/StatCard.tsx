import * as React from 'react';
import { cn } from './Button';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn('rounded-xl border bg-surface text-foreground shadow-card p-6', className)}
      {...props}
    >
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground h-4 w-4">{icon}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  'font-medium flex items-center',
                  trend.isPositive ? 'text-success' : 'text-danger',
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            )}
            {description && <span>{description}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
