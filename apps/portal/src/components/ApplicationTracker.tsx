import { Check, Circle, Clock, X } from 'lucide-react';
import type { PartnerAccountStatus } from '@gnk/types';
import { cn } from '@gnk/ui';

const STAGES = [
  { key: 'details', label: 'Details submitted', done: () => true },
  {
    key: 'submitted',
    label: 'Documents submitted',
    done: (s: PartnerAccountStatus) => s !== 'DRAFT' && s !== 'MORE_INFO_REQUIRED',
  },
  {
    key: 'review',
    label: 'Under review by GNK',
    done: (s: PartnerAccountStatus) => ['APPROVED', 'SUSPENDED', 'REJECTED'].includes(s),
  },
  { key: 'approved', label: 'Approved', done: (s: PartnerAccountStatus) => s === 'APPROVED' },
];

/** Horizontal progress of a partner application. */
export function ApplicationTracker({ status }: { status: PartnerAccountStatus }) {
  const current = STAGES.findIndex((s) => !s.done(status));
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {STAGES.map((stage, i) => {
        const done = stage.done(status);
        const failed = status === 'REJECTED' && stage.key === 'approved';
        const active = i === current && !failed;
        return (
          <li
            key={stage.key}
            className={cn(
              'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
              done && 'border-success/30 bg-success-soft',
              active && 'border-warning/40 bg-warning-soft',
              failed && 'border-danger/30 bg-danger-soft',
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full',
                done
                  ? 'bg-success text-white'
                  : failed
                    ? 'bg-danger text-white'
                    : active
                      ? 'bg-warning text-white'
                      : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="size-3.5" />
              ) : failed ? (
                <X className="size-3.5" />
              ) : active ? (
                <Clock className="size-3.5" />
              ) : (
                <Circle className="size-3" />
              )}
            </span>
            <span className="text-[13px] font-medium">{failed ? 'Not approved' : stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
