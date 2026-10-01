import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { BookingConcessionRequestDto } from '@gnk/types';
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
  titleCase,
  type Column,
} from '@gnk/ui';
import { api } from '@/lib/api';

export function ConcessionQueuePage() {
  const queue = useQuery({
    queryKey: ['concession-queue'],
    queryFn: () => api.bookings.concessionQueue(),
  });

  if (queue.error) return <ErrorState error={queue.error} onRetry={() => queue.refetch()} />;

  const columns: Column<BookingConcessionRequestDto>[] = [
    {
      key: 'ref',
      header: 'Booking',
      cell: (r) => (
        <Link to={`/bookings/${r.bookingId}`} className="tabular text-link hover:underline">
          View booking
        </Link>
      ),
    },
    { key: 'kind', header: 'Type', cell: (r) => titleCase(r.kind) },
    {
      key: 'req',
      header: 'Requested',
      cell: (r) =>
        r.kind === 'DISCOUNT' ? (
          r.requestedDiscountAmount != null ? (
            <Money value={r.requestedDiscountAmount} />
          ) : (
            '—'
          )
        ) : r.kind === 'CHILD_SEATS' ? (
          (r.requestedChildSeats ?? '—')
        ) : (
          (r.requestedInfantSeats ?? '—')
        ),
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Concession requests"
        description="Track pending and recent child seat, infant seat, and discount requests."
      />
      <Card>
        {queue.isLoading ? (
          <Spinner className="py-16" />
        ) : !queue.data?.length ? (
          <EmptyState
            title="No requests"
            description="Request concessions from a booking detail page."
          />
        ) : (
          <DataTable dense rowKey={(r) => r.id} rows={queue.data} columns={columns} />
        )}
      </Card>
    </>
  );
}
