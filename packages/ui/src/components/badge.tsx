import * as React from 'react';
import { cn } from '../lib/cn';
import { titleCase } from '../lib/format';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'gold';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  primary: 'bg-accent-soft text-link',
  gold: 'bg-highlight-soft text-highlight-strong',
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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-medium leading-none tracking-[-0.005em]',
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
  CONFIRMED: ['Seats Confirmed', 'success'],
  CANCELLATION_REQUESTED: ['Cancellation requested', 'warning'],
  CANCELLED: ['Cancelled', 'neutral'],
  COMPLETED: ['Completed', 'success'],
  EXPIRED: ['Expired', 'danger'],
  REJECTED: ['Rejected', 'danger'],
  HELD: ['On hold', 'warning'],
  PAYMENT_PENDING: ['Awaiting payment', 'warning'],
  AWAITING_RECEIPT: ['Awaiting receipt', 'warning'],
  RECEIPT_ADDED: ['Receipt added', 'info'],
  TICKETED: ['Ticketed', 'success'],
  EXPIRED_HOLD: ['Expired', 'danger'],
  QUOTED: ['Quoted', 'neutral'],
  // partner accounts
  SUBMITTED: ['Submitted', 'warning'],
  UNDER_REVIEW: ['Under review', 'warning'],
  MORE_INFO_REQUIRED: ['More info needed', 'warning'],
  SUSPENDED: ['Suspended', 'danger'],
  CLOSED: ['Closed', 'neutral'],
  // payments
  PENDING: ['Pending', 'warning'],
  VERIFIED: ['Verified', 'success'],
  // vouchers
  POSTED: ['Posted', 'success'],
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
