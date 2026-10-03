import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BookOpen, Download } from 'lucide-react';
import type { AdminBookingListItem } from '@gnk/types';
import {
  Avatar,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  StatusBadge,
  Tabs,
  formatDate,
  formatDateTime,
  type Column,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

// Statuses where someone is waiting on us: show how long.
const WAITING = [
  'PENDING_APPROVAL',
  'APPROVED',
  'SUPPLIER_FAILED',
  'SUBMITTED_TO_SUPPLIER',
  'SUPPLIER_PENDING',
];

/** "3h 20m" since the booking entered its status; amber after 2h, red after 8h. */
function Waiting({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  const text =
    mins < 60
      ? `${mins}m`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
        : `${Math.floor(mins / 1440)}d`;
  return (
    <span
      className={`tabular text-[11px] ${mins >= 480 ? 'text-danger' : mins >= 120 ? 'text-warning' : 'text-muted-foreground'}`}
      title="Time in this status"
    >
      {text}
    </span>
  );
}

const TABS = [
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SUPPLIER', label: 'With supplier' },
  { value: 'SUPPLIER_FAILED', label: 'Failed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled / rejected' },
  { value: 'all', label: 'All' },
] as const;

export function BookingsPage() {
  return (
    <RequirePerm perm="bookings:read">
      <Bookings />
    </RequirePerm>
  );
}

function Bookings() {
  const can = useCan();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const q = {
    tab: (params.get('tab') ??
      (params.get('q') ? 'all' : 'PENDING_APPROVAL')) as (typeof TABS)[number]['value'],
    q: params.get('q') || undefined,
    accountId: params.get('accountId') || undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    owner: (params.get('owner') || undefined) as 'me' | 'unassigned' | undefined,
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };
  const counts = useQuery({ queryKey: ['booking-counts'], queryFn: api.bookings.counts });
  const list = useQuery({
    queryKey: ['bookings', q],
    queryFn: () => api.bookings.list(q),
    placeholderData: keepPreviousData,
  });

  const set = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => setText(params.get('q') ?? ''), [params]);
  useEffect(() => {
    const t = setTimeout(
      () => text !== (params.get('q') ?? '') && set('q', text.trim() || undefined),
      350,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const exportCsv = async () => {
    const all = await api.bookings.list({ ...q, page: 1, pageSize: 100 });
    downloadCsv(`bookings-${q.tab}-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        'Reference',
        'Partner',
        'Code',
        'Sector',
        'Airline',
        'Departure',
        'Seats',
        'Total',
        'Margin',
        'Status',
        'Supplier ref',
        'Created',
      ],
      ...all.items.map((b) => [
        b.reference,
        b.accountName,
        b.accountCode,
        b.sector,
        b.airline,
        b.departureDate,
        b.seats,
        b.totalPrice,
        b.margin ?? '',
        b.status,
        b.supplierBookingRef ?? '',
        b.createdAt.slice(0, 10),
      ]),
    ]);
  };

  const columns: Column<AdminBookingListItem>[] = [
    {
      key: 'ref',
      header: 'Booking',
      cell: (b) => (
        <div>
          <p className="font-semibold tabular">{b.reference}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'p',
      header: 'Partner',
      cell: (b) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{b.accountName}</p>
          <p className="text-xs text-muted-foreground">
            {b.accountCode} · {b.createdByName}
          </p>
        </div>
      ),
    },
    {
      key: 't',
      header: 'Trip',
      cell: (b) => (
        <div>
          <p className="font-medium">{b.sector ?? b.title}</p>
          <p className="text-xs text-muted-foreground">
            {b.airline} · {formatDate(b.departureDate)}
          </p>
        </div>
      ),
    },
    { key: 'x', header: 'Pax', align: 'right', hideBelow: 'md', cell: (b) => b.seats },
    {
      key: 'v',
      header: 'Total',
      align: 'right',
      cell: (b) => <Money value={b.totalPrice} className="font-medium" />,
    },
    ...(can('bookings:view_supplier_net')
      ? [
          {
            key: 'm',
            header: 'Margin',
            align: 'right' as const,
            hideBelow: 'lg' as const,
            cell: (b: AdminBookingListItem) => <Money value={b.margin} className="text-success" />,
          },
        ]
      : []),
    {
      key: 'o',
      header: 'Owner',
      hideBelow: 'xl',
      cell: (b) =>
        b.assignedTo ? (
          <span className="inline-flex items-center gap-1.5 text-[13px]">
            <Avatar name={b.assignedTo.name} className="size-5 text-[9px]" />{' '}
            {b.assignedTo.name.split(' ')[0]}
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground">—</span>
        ),
    },
    {
      key: 's',
      header: 'Status',
      align: 'right',
      cell: (b) => (
        <div className="flex flex-col items-end gap-0.5">
          <StatusBadge status={b.status} />
          {WAITING.includes(b.status) && <Waiting since={b.statusSince} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Approve requests, send approved bookings to the supplier and manage changes."
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download /> Export
          </Button>
        }
      />
      <Card>
        <div className="px-4">
          <Tabs
            value={q.tab}
            onChange={(v) => set('tab', v)}
            items={TABS.map((t) => ({ ...t, count: counts.data?.[t.value] }))}
          />
        </div>
        <div className="grid gap-3 border-b border-border/70 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
          <SegmentedControl
            size="sm"
            className="self-center"
            value={q.owner ?? 'all'}
            onChange={(v) => set('owner', v === 'all' ? undefined : v)}
            items={[
              { value: 'all', label: 'Everyone' },
              { value: 'me', label: 'Mine' },
              { value: 'unassigned', label: 'Unassigned' },
            ]}
          />
          <SearchInput
            placeholder="Reference, PNR, supplier ref, partner or surname"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input
            type="date"
            value={q.from ?? ''}
            onChange={(e) => set('from', e.target.value)}
            aria-label="Departing from"
            title="Departing from"
          />
          <Input
            type="date"
            value={q.to ?? ''}
            onChange={(e) => set('to', e.target.value)}
            aria-label="Departing until"
            title="Departing until"
          />
        </div>
        {q.accountId && (
          <div className="border-b bg-accent-soft/50 px-4 py-2 text-[13px]">
            Showing one partner's bookings.{' '}
            <button
              className="font-medium text-link hover:underline"
              onClick={() => set('accountId')}
            >
              Show all
            </button>
          </div>
        )}
        {list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.data?.items}
              loading={list.isLoading}
              rowKey={(b) => b.id}
              onRowClick={(b) =>
                navigate({ pathname: `/bookings/${b.id}`, search: params.toString() })
              }
              empty={
                <EmptyState
                  icon={<BookOpen />}
                  title="Nothing in this queue"
                  description="New requests appear here automatically."
                />
              }
            />
            {list.data && (
              <Pagination
                page={q.page}
                pageSize={q.pageSize}
                total={list.data.total}
                onChange={(p) => set('page', String(p))}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
