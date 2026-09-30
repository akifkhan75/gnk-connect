import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BookOpen, Download } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  SearchInput,
  Tabs,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { downloadCsv } from '@/lib/csv';
import { BookingsTable } from '@/components/BookingsTable';
import { ApprovedGate, can } from '@/components/guards';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAYMENT_PENDING', label: 'Payment pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'TICKETED', label: 'Ticketed' },
  { value: 'EXPIRED_HOLD', label: 'Expired holds' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export function BookingsPage() {
  return (
    <ApprovedGate>
      <Bookings />
    </ApprovedGate>
  );
}

function Bookings() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const q = {
    tab: (params.get('tab') ?? 'all') as (typeof TABS)[number]['value'],
    q: params.get('q') || undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };
  const counts = useQuery({ queryKey: keys.bookingCounts, queryFn: api.bookings.counts });
  const list = useQuery({
    queryKey: keys.bookings(q),
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
    downloadCsv(`gnk-bookings-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        'Reference',
        'Created',
        'Sector',
        'Airline',
        'Departure',
        'Seats',
        'Lead passenger',
        'Total (PKR)',
        'Status',
        'Booked by',
      ],
      ...all.items.map((b) => [
        b.reference,
        b.createdAt.slice(0, 10),
        b.sector ?? b.title,
        b.airline,
        b.departureDate,
        b.seats,
        b.leadPassenger,
        b.totalPrice,
        b.status,
        b.createdByName,
      ]),
    ]);
  };

  return (
    <>
      <PageHeader
        title="My bookings"
        description={
          session!.account.role === 'STAFF'
            ? 'Bookings you have created.'
            : 'All bookings for your agency.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
            {can.book(session!.account.role) && (
              <Button asChild>
                <Link to="/book/groups">New booking</Link>
              </Button>
            )}
          </>
        }
      />
      <Card>
        <div className="px-4">
          <Tabs
            value={q.tab}
            onChange={(v) => set('tab', v === 'all' ? undefined : v)}
            items={TABS.map((t) => ({ ...t, count: counts.data?.[t.value] }))}
          />
        </div>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <SearchInput
            placeholder="Reference, passenger surname or sector"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Search bookings"
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
        {list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <BookingsTable
              rows={list.data?.items}
              loading={list.isLoading}
              showCreator={session!.account.role !== 'STAFF'}
              empty={
                <EmptyState
                  icon={<BookOpen />}
                  title="No bookings here"
                  description={
                    q.q ? 'Nothing matches your search.' : 'Bookings you request will appear here.'
                  }
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
