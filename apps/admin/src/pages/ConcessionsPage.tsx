import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, TicketPercent } from 'lucide-react';
import type { AdminConcessionListItem } from '@gnk/types';
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  formatDateTime,
  type Column,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { RequirePerm } from '@/components/guards';

export function ConcessionsPage() {
  return (
    <RequirePerm perm="bookings:read">
      <Concessions />
    </RequirePerm>
  );
}

function Concessions() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = {
    status: 'PENDING' as const,
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };
  const list = useQuery({
    queryKey: ['concessions', q],
    queryFn: () => api.bookings.listConcessions(q),
    placeholderData: keepPreviousData,
  });

  const columns: Column<AdminConcessionListItem>[] = [
    {
      key: 'booking',
      header: 'Booking',
      cell: (r) => <p className="whitespace-nowrap font-semibold tabular">{r.bookingReference}</p>,
    },
    {
      key: 'agency',
      header: 'Agency',
      cell: (r) => <p className="truncate">{r.accountName}</p>,
    },
    {
      key: 'request',
      header: 'Request',
      cell: (r) => (
        <span className={r.requestLabel === '—' ? 'text-muted-foreground' : undefined}>
          {r.requestLabel}
        </span>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      cell: (r) => (
        <span className="tabular text-muted-foreground">{formatDateTime(r.createdAt)}</span>
      ),
    },
    {
      key: 'review',
      header: '',
      align: 'right',
      cell: (r) => (
        <Link
          to={`/bookings/${r.bookingId}?review=${r.id}`}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-link hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Review <ChevronRight className="size-4" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Concession Requests"
        description="Agent requests for extra child seats, infant seats, and booking discounts."
      />
      <Card>
        {list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.data?.items}
              loading={list.isLoading}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/bookings/${r.bookingId}?review=${r.id}`)}
              empty={
                <EmptyState
                  icon={<TicketPercent />}
                  title="No concession requests"
                  description="When agents request extra child seats, infant seats, or a discount, they appear here."
                />
              }
            />
            {list.data && (
              <Pagination
                page={q.page}
                pageSize={q.pageSize}
                total={list.data.total}
                onChange={(p) => {
                  const next = new URLSearchParams(params);
                  if (p > 1) next.set('page', String(p));
                  else next.delete('page');
                  setParams(next, { replace: true });
                }}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
