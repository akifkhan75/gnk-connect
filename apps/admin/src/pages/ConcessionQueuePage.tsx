import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingConcessionRequestDto } from '@gnk/types';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
  titleCase,
  useToast,
  type Column,
} from '@gnk/ui';
import {
  ConcessionDecideDialog,
  type ConcessionDecisionPayload,
} from '@/components/ConcessionDecideDialog';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

type QueueItem = BookingConcessionRequestDto & {
  bookingReference?: string;
  bookingStatus?: string;
};

export function ConcessionQueuePage() {
  return (
    <RequirePerm perm="bookings:read">
      <ConcessionQueue />
    </RequirePerm>
  );
}

function ConcessionQueue() {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [decide, setDecide] = useState<{
    request: QueueItem;
    decision: 'APPROVED' | 'REJECTED';
  } | null>(null);

  const queue = useQuery({
    queryKey: ['concession-queue'],
    queryFn: () => api.bookings.concessionQueue(),
  });

  const decideConcession = useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: ConcessionDecisionPayload;
    }) => api.bookings.decideConcession(requestId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['concession-queue'] });
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Concession decided');
      setDecide(null);
    },
    onError: (e) => toast.error('Could not decide', errorMessage(e)),
  });

  if (queue.error) return <ErrorState error={queue.error} onRetry={() => queue.refetch()} />;

  const columns: Column<QueueItem>[] = [
    {
      key: 'ref',
      header: 'Booking',
      cell: (r) => (
        <Link to={`/bookings/${r.bookingId}`} className="tabular text-link hover:underline">
          {r.bookingReference ?? r.bookingId.slice(0, 8)}
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
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'booking',
      header: 'Booking status',
      cell: (r) => (r.bookingStatus ? <StatusBadge status={r.bookingStatus} /> : '—'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (r) =>
        r.status === 'REQUESTED' && can('bookings:approve') ? (
          <div className="flex justify-end gap-1.5">
            <Button size="xs" onClick={() => setDecide({ request: r, decision: 'APPROVED' })}>
              Approve
            </Button>
            <Button
              size="xs"
              variant="danger-outline"
              onClick={() => setDecide({ request: r, decision: 'REJECTED' })}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Concession queue"
        description="Pending child/infant seat and discount requests across inventory bookings."
      />
      <Card>
        {queue.isLoading ? (
          <Spinner className="py-16" />
        ) : !queue.data?.length ? (
          <EmptyState title="No pending requests" description="New partner requests appear here." />
        ) : (
          <DataTable dense rowKey={(r) => r.id} rows={queue.data} columns={columns} />
        )}
      </Card>
      <ConcessionDecideDialog
        open={!!decide}
        onOpenChange={(o) => !o && setDecide(null)}
        request={decide?.request ?? null}
        decision={decide?.decision ?? 'APPROVED'}
        loading={decideConcession.isPending}
        onSubmit={(payload) =>
          decide && decideConcession.mutate({ requestId: decide.request.id, payload })
        }
      />
    </>
  );
}
