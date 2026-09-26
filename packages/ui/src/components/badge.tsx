import * as React from 'react';
import { cn } from '../lib/cn';
import { titleCase } from '../lib/format';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'gold';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground ring-border',
  info: 'bg-info-soft text-info ring-info/20',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/25',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  primary: 'bg-accent-soft text-link ring-accent/25',
  gold: 'bg-highlight-soft text-highlight-strong ring-highlight/30',
};

const dotClass: Record<Tone, string> = {
  neutral: 'bg-muted-foreground/60',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-accent',
  gold: 'bg-highlight',
};

export function Badge({
  tone = 'neutral',
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dotClass[tone])} aria-hidden />}
      {children}
    </span>
  );
}

// One label and tone per status across the platform (plan 08 §4).
const STATUS: Record<string, [string, Tone]> = {
  // bookings
  DRAFT: ['Draft', 'neutral'],
  PENDING_APPROVAL: ['Pending approval', 'warning'],
  APPROVED: ['Approved', 'info'],
  SUBMITTED_TO_SUPPLIER: ['Processing', 'info'],
  SUPPLIER_PENDING: ['Awaiting supplier', 'info'],
  SUPPLIER_FAILED: ['Supplier failed', 'danger'],
  CONFIRMED: ['Confirmed', 'success'],
  CANCELLATION_REQUESTED: ['Cancellation requested', 'warning'],
  CANCELLED: ['Cancelled', 'neutral'],
  COMPLETED: ['Completed', 'success'],
  EXPIRED: ['Expired', 'neutral'],
  REJECTED: ['Rejected', 'danger'],
  // partner accounts
  SUBMITTED: ['Submitted', 'warning'],
  UNDER_REVIEW: ['Under review', 'warning'],
  MORE_INFO_REQUIRED: ['More info needed', 'warning'],
  SUSPENDED: ['Suspended', 'danger'],
  CLOSED: ['Closed', 'neutral'],
  // payments
  PENDING: ['Pending', 'warning'],
  VERIFIED: ['Verified', 'success'],
  FAILED: ['Failed', 'danger'],
  REFUNDED: ['Refunded', 'neutral'],
  // booking payment state
  UNPAID: ['Not charged', 'neutral'],
  PARTIALLY_PAID: ['Partly paid', 'warning'],
  PAID: ['Charged', 'success'],
  REFUND_PENDING: ['Refund pending', 'warning'],
  // departures
  OPEN: ['Open', 'success'],
  FILLING_FAST: ['Filling fast', 'gold'],
  SOLD_OUT: ['Sold out', 'neutral'],
  // users
  ACTIVE: ['Active', 'success'],
  INVITED: ['Invited', 'info'],
  LOCKED: ['Locked', 'danger'],
  DISABLED: ['Disabled', 'neutral'],
  MAINTENANCE: ['Maintenance', 'warning'],
  INACTIVE: ['Inactive', 'neutral'],
};

export const statusLabel = (status: string) => STATUS[status]?.[0] ?? titleCase(status);
export const statusTone = (status: string): Tone => STATUS[status]?.[1] ?? 'neutral';

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <Badge tone={statusTone(status)} dot className={className}>
      {label ?? statusLabel(status)}
    </Badge>
  );
}
