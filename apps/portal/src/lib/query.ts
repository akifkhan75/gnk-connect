import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@gnk/api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Don't retry client errors (403/404/422); retry transient ones once.
      retry: (count, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
    },
  },
});

export const keys = {
  dashboard: ['dashboard'] as const,
  account: ['account'] as const,
  team: ['team'] as const,
  groups: (q: object) => ['groups', q] as const,
  group: (id: string) => ['group', id] as const,
  groupFilters: ['group-filters'] as const,
  bookings: (q: object) => ['bookings', q] as const,
  bookingCounts: ['booking-counts'] as const,
  booking: (id: string) => ['booking', id] as const,
  payments: ['payments'] as const,
  instructions: ['payment-instructions'] as const,
  balance: ['balance'] as const,
  statement: (q: object) => ['statement', q] as const,
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoice', id] as const,
  notifications: ['notifications'] as const,
  sessions: ['sessions'] as const,
};
