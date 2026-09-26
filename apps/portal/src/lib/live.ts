import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeTopic } from '@gnk/types';
import { useEvents } from './api';

// Which cached queries each kind of change makes stale (matched by key prefix).
const STALE: Record<RealtimeTopic, string[]> = {
  booking: [
    'bookings',
    'booking',
    'booking-counts',
    'dashboard',
    'balance',
    'statement',
    'invoices',
  ],
  payment: ['payments', 'balance', 'statement', 'dashboard'],
  voucher: ['balance', 'statement'],
  notification: ['notifications'],
  partner: ['account', 'dashboard'],
  team: ['team'],
  queues: [],
};

/** Subscribes to live updates and refreshes affected screens. Returns the connection state. */
export function useLiveUpdates() {
  const qc = useQueryClient();
  return useEvents((e) => {
    for (const key of STALE[e.topic] ?? []) void qc.invalidateQueries({ queryKey: [key] });
  });
}
