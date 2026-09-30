import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Gift,
  RefreshCw,
  Send,
  Ticket,
  X,
} from 'lucide-react';

import type {
  AdminBookingDetailDto,
  AdminBookingListItem,
  BookingConcessionRequestDto,
} from '@gnk/types';
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataTable,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Input,
  KeyValue,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  Spinner,
  StatusBadge,
  Tabs,
  Textarea,
  Timeline,
  formatDate,
  formatDateTime,
  saveBlob,
  statusLabel,
  statusTone,
  titleCase,
  useToast,
  type Column,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

/** Statuses on the inventory (group-PNR) lifecycle where confirm/extend apply —
 *  separate from the legacy supplier-push flow below. */
const INVENTORY_ACTIVE = ['HELD', 'PAYMENT_PENDING', 'AWAITING_RECEIPT', 'RECEIPT_ADDED'];

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
  const { id } = useParams();
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
              selectedKey={id}
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
      <Drawer
        open={!!id}
        onOpenChange={(o) => !o && navigate({ pathname: '/bookings', search: params.toString() })}
        title={id ? <BookingTitle id={id} /> : ''}
        width="max-w-3xl"
      >
        {id && <BookingDetail id={id} />}
      </Drawer>
    </>
  );
}

function BookingTitle({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => api.bookings.get(id) });
  return (
    <span className="flex items-center gap-2">
      <span className="tabular">{q.data?.reference ?? 'Booking'}</span>
      {q.data && <StatusBadge status={q.data.status} />}
    </span>
  );
}

function BookingDetail({ id }: { id: string }) {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<null | 'reject' | 'cancel' | 'approve' | 'push'>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => api.bookings.get(id) });
  const concessions = useQuery({
    queryKey: ['booking', id, 'concessions'],
    queryFn: () => api.bookings.concessions(id),
  });
  const [notes, setNotes] = useState('');
  useEffect(() => setNotes(q.data?.internalNotes ?? ''), [q.data?.internalNotes]);

  const onDone = (b: AdminBookingDetailDto, message: string) => {
    qc.setQueryData(['booking', id], b);
    void qc.invalidateQueries({ queryKey: ['bookings'] });
    void qc.invalidateQueries({ queryKey: ['booking-counts'] });
    void qc.invalidateQueries({ queryKey: ['queues'] });
    toast.success(message);
  };
  const act = useMutation({
    mutationFn: async ({ action, reason }: { action: string; reason?: string }) => {
      switch (action) {
        case 'approve':
          return api.bookings.approve(id, reason || undefined);
        case 'approve_push': {
          await api.bookings.approve(id, reason || undefined);
          return api.bookings.push(id);
        }
        case 'reject':
          return api.bookings.reject(id, reason!);
        case 'push':
        case 'retry_push':
          return api.bookings.push(id);
        case 'sync_status':
          return api.bookings.sync(id);
        case 'cancel':
          return api.bookings.cancel(id, reason!);
        case 'complete':
          return api.bookings.complete(id);
        default:
          throw new Error('Unknown action');
      }
    },
    onSuccess: (b) => {
      if (b.status === 'SUPPLIER_FAILED') {
        qc.setQueryData(['booking', id], b);
        void qc.invalidateQueries({ queryKey: ['bookings'] });
        toast.error(
          'The supplier did not confirm this booking',
          'See the supplier calls section for details.',
        );
      } else {
        onDone(b, `${b.reference}: ${statusLabel(b.status).toLowerCase()}`);
      }
    },
    onError: (e) => toast.error('Action failed', errorMessage(e)),
  });
  const saveNotes = useMutation({
    mutationFn: () => api.bookings.setNotes(id, notes),
    onSuccess: (b) => onDone(b, 'Notes saved'),
  });
  const confirmInventory = useMutation({
    mutationFn: () => api.bookings.confirm(id),
    onSuccess: (b) => onDone(b, `${b.reference}: confirmed with the airline`),
    onError: (e) => toast.error('Could not confirm', errorMessage(e)),
  });
  const extendDeadline = useMutation({
    mutationFn: (extensionMinutes: number) => api.bookings.extendDeadline(id, { extensionMinutes }),
    onSuccess: (b) => {
      onDone(b, 'Deadline extended');
      setExtendOpen(false);
    },
    onError: (e) => toast.error('Could not extend', errorMessage(e)),
  });
  const decideConcession = useMutation({
    mutationFn: ({
      requestId,
      decision,
    }: {
      requestId: string;
      decision: 'APPROVED' | 'REJECTED';
    }) => api.bookings.decideConcession(requestId, { decision }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['booking', id, 'concessions'] });
      toast.success('Concession decided');
    },
    onError: (e) => toast.error('Could not decide', errorMessage(e)),
  });

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const b = q.data;
  const has = (a: AdminBookingDetailDto['allowedActions'][number]) => b.allowedActions.includes(a);
  const shortfall = b.totalPrice - b.balance.availableFunds;
  const run = (action: string, reason?: string) => act.mutateAsync({ action, reason });
  const isInventory = !!b.inventoryLotId;

  return (
    <div className="space-y-5">
      <Owner
        booking={b}
        onChanged={(x) => onDone(x, x.assignedTo ? `Assigned to ${x.assignedTo.name}` : 'Released')}
      />

      {/* Inventory (group-PNR) action bar — confirm/ticket/extend replace the supplier push flow. */}
      {isInventory && (
        <div className="flex flex-wrap gap-2">
          {INVENTORY_ACTIVE.includes(b.status) && can('bookings:approve') && (
            <>
              <Button
                onClick={() => confirmInventory.mutate()}
                loading={confirmInventory.isPending}
              >
                <Check /> Confirm booking
              </Button>
              <Button variant="secondary" onClick={() => setExtendOpen(true)}>
                <Clock /> Extend deadline
              </Button>
            </>
          )}
          {b.status === 'CONFIRMED' && can('bookings:approve') && (
            <Button onClick={() => setTicketOpen(true)}>
              <Ticket /> Mark ticketed
            </Button>
          )}
          {!['CANCELLED', 'EXPIRED_HOLD', 'TICKETED'].includes(b.status) &&
            can('bookings:cancel') && (
              <Button
                variant="danger-outline"
                onClick={() => setDialog('cancel')}
                className="ml-auto"
              >
                Cancel booking
              </Button>
            )}
        </div>
      )}

      {/* Action bar (legacy supplier-push flow — never shown for group-PNR/inventory bookings) */}
      {!isInventory && b.allowedActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {has('approve') && (
            <>
              <Button onClick={() => setDialog('approve')} disabled={act.isPending}>
                <Check /> Approve
              </Button>
              {can('bookings:push_supplier') && shortfall <= 0 && (
                <Button
                  variant="accent"
                  onClick={() => run('approve_push')}
                  loading={act.isPending}
                >
                  <Send /> Approve & issue
                </Button>
              )}
              <Button variant="danger-outline" onClick={() => setDialog('reject')}>
                <X /> Reject
              </Button>
            </>
          )}
          {(has('push') || has('retry_push')) && (
            <Button onClick={() => setDialog('push')} disabled={act.isPending}>
              <Send /> {has('retry_push') ? 'Retry supplier push' : 'Send to supplier'}
            </Button>
          )}
          {has('sync_status') && (
            <Button variant="secondary" onClick={() => run('sync_status')} loading={act.isPending}>
              <RefreshCw /> Sync status
            </Button>
          )}
          {has('complete') && (
            <Button variant="secondary" onClick={() => run('complete')} loading={act.isPending}>
              Mark completed
            </Button>
          )}
          {has('cancel') && (
            <Button
              variant="danger-outline"
              onClick={() => setDialog('cancel')}
              className="ml-auto"
            >
              Cancel booking
            </Button>
          )}
        </div>
      )}

      {(b.status === 'APPROVED' ||
        b.status === 'PENDING_APPROVAL' ||
        b.status === 'SUPPLIER_FAILED') && (
        <Alert
          tone={shortfall > 0 ? 'warning' : 'success'}
          title={
            shortfall > 0
              ? 'Partner funds do not cover this booking'
              : 'Partner funds cover this booking'
          }
        >
          Balance <Money value={b.balance.balance} /> + credit{' '}
          <Money value={b.balance.creditLimit} /> = <Money value={b.balance.availableFunds} />{' '}
          available.
          {shortfall > 0 && (
            <>
              {' '}
              Short by <Money value={shortfall} className="font-semibold" />. The supplier push is
              blocked until they deposit.
            </>
          )}
        </Alert>
      )}
      {b.status === 'REJECTED' && b.rejectionReason && (
        <Alert tone="danger" title="Rejected">
          {b.rejectionReason}
        </Alert>
      )}
      {isInventory &&
        INVENTORY_ACTIVE.includes(b.status) &&
        (b.heldUntil || b.paymentDeadlineAt) && (
          <Alert tone="warning" title={b.status === 'HELD' ? 'Hold expires' : 'Payment due'}>
            {formatDateTime((b.status === 'HELD' ? b.heldUntil : b.paymentDeadlineAt) ?? '')} —
            confirm or extend before it lapses and seats are released automatically.
          </Alert>
        )}
      {isInventory && b.status === 'EXPIRED_HOLD' && (
        <Alert tone="danger" title="Hold expired">
          Seats were released automatically. The partner can rebook if seats remain.
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Booking"
          actions={
            <div className="flex items-center gap-1.5">
              {isInventory &&
                ['HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'TICKETED'].includes(b.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () =>
                      saveBlob(
                        await api.bookings.documents.reservationPdf(b.id),
                        `${b.reference}-reservation.pdf`,
                      )
                    }
                  >
                    <Download /> Reservation
                  </Button>
                )}
              {isInventory && b.status === 'TICKETED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () =>
                    saveBlob(
                      await api.bookings.documents.confirmationPdf(b.id),
                      `${b.reference}-confirmation.pdf`,
                    )
                  }
                >
                  <Download /> Confirmation
                </Button>
              )}
              {b.invoice && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/invoices/${b.invoice.id}`}>
                    <FileText /> {b.invoice.number}
                  </Link>
                </Button>
              )}
            </div>
          }
        />
        <CardBody>
          <KeyValue
            columns={3}
            items={[
              {
                label: 'Partner',
                value: (
                  <Link to={`/partners/${b.account.id}`} className="text-link hover:underline">
                    {b.account.name}
                  </Link>
                ),
              },
              { label: 'Contact', value: `${b.account.phone} · ${b.account.email}`, wide: false },
              { label: 'Booked by', value: b.createdByName },
              { label: 'Group', value: b.title, wide: true },
              { label: 'Sector', value: `${b.sector} · ${b.airline}` },
              {
                label: 'Travel',
                value: `${formatDate(b.departureDate)} – ${formatDate(b.returnDate)}`,
              },
              {
                label: 'Seats',
                value: isInventory
                  ? [
                      b.bookedAdults
                        ? `${b.bookedAdults} adult${b.bookedAdults > 1 ? 's' : ''}`
                        : null,
                      b.bookedChildren
                        ? `${b.bookedChildren} child${b.bookedChildren > 1 ? 'ren' : ''}`
                        : null,
                      b.bookedInfants
                        ? `${b.bookedInfants} infant${b.bookedInfants > 1 ? 's' : ''}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || b.seats
                  : b.seats,
              },
              ...(isInventory
                ? []
                : [
                    { label: 'Supplier', value: b.supplierName },
                    { label: 'Supplier ref', value: b.supplierBookingRef },
                  ]),
              { label: 'PNR', value: b.pnr && <span className="font-mono">{b.pnr}</span> },
            ]}
          />
        </CardBody>
      </Card>

      {isInventory && (b.fareSubtotalAmount != null || b.discountAmount) && (
        <Card>
          <CardHeader title="Fare" />
          <CardBody className="space-y-2 text-sm">
            {b.fareSubtotalAmount != null && (
              <div className="flex justify-between text-muted-foreground">
                <span>Fare subtotal</span>
                <Money value={b.fareSubtotalAmount} />
              </div>
            )}
            {!!b.discountAmount && (
              <div className="flex justify-between text-muted-foreground">
                <span>Concession discount</span>
                <span>
                  -<Money value={b.discountAmount} />
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {isInventory && (
        <Card>
          <CardHeader title="Concession requests" icon={<Gift className="size-4" />} />
          {concessions.data && concessions.data.length > 0 ? (
            <DataTable
              dense
              rowKey={(r: BookingConcessionRequestDto) => r.id}
              rows={concessions.data}
              columns={[
                { key: 'k', header: 'Type', cell: (r) => titleCase(r.kind) },
                {
                  key: 'q',
                  header: 'Requested',
                  cell: (r) =>
                    r.kind === 'DISCOUNT' ? (
                      r.requestedDiscountAmount != null ? (
                        <Money value={r.requestedDiscountAmount} />
                      ) : (
                        '—'
                      )
                    ) : (
                      (r.requestedChildSeats ?? r.requestedInfantSeats ?? 0)
                    ),
                },
                { key: 's', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                {
                  key: 'a',
                  header: '',
                  align: 'right',
                  cell: (r) =>
                    r.status === 'REQUESTED' && can('bookings:approve') ? (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="xs"
                          onClick={() =>
                            decideConcession.mutate({ requestId: r.id, decision: 'APPROVED' })
                          }
                          loading={decideConcession.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="danger-outline"
                          onClick={() =>
                            decideConcession.mutate({ requestId: r.id, decision: 'REJECTED' })
                          }
                          loading={decideConcession.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null,
                },
              ]}
            />
          ) : (
            <CardBody className="text-sm text-muted-foreground">No concession requests.</CardBody>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Price" />
        <CardBody className="space-y-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              <Money value={b.unitPrice} /> × {b.seats}
            </span>
            <span>
              Total <Money value={b.totalPrice} className="text-lg font-semibold" />
            </span>
          </div>
          {b.priceAudit && (
            <div className="grid gap-3 rounded-md bg-surface-sunken p-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Supplier net / seat</p>
                <Money value={b.priceAudit.supplierNetUnit} className="font-medium" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Markup / seat</p>
                <Money value={b.priceAudit.markupUnit} className="font-medium" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GNK margin</p>
                <Money value={b.priceAudit.margin} className="font-semibold text-success" />
              </div>
              {b.priceAudit.supplierCost && (
                <p className="text-xs sm:col-span-3">
                  <span className="text-muted-foreground">Posted to supplier: </span>
                  <span className="font-medium tabular">
                    {b.priceAudit.supplierCost.currency}{' '}
                    {b.priceAudit.supplierCost.amount.toLocaleString('en-PK', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    @ {b.priceAudit.supplierCost.rate} = PKR{' '}
                    {Math.round(
                      b.priceAudit.supplierCost.amount * b.priceAudit.supplierCost.rate,
                    ).toLocaleString('en-PK')}
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground sm:col-span-3">
                Rules applied:{' '}
                {((b.priceAudit.snapshot as { applied?: { name: string }[] })?.applied ?? [])
                  .map((r) => r.name)
                  .join(' + ') || '—'}{' '}
                · quoted {formatDateTime(b.priceAudit.quotedAt)}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Passengers (${b.passengers.length})`} />
        <DataTable
          dense
          rows={b.passengers}
          rowKey={(p) => p.id}
          columns={[
            {
              key: 'n',
              header: 'Name',
              cell: (p) => (
                <span className="font-medium">{`${titleCase(p.title)} ${p.firstName} ${p.lastName}`}</span>
              ),
            },
            { key: 't', header: 'Type', cell: (p) => titleCase(p.type) },
            { key: 'd', header: 'DOB', hideBelow: 'sm', cell: (p) => formatDate(p.dateOfBirth) },
            {
              key: 'pp',
              header: 'Passport',
              cell: (p) => (
                <span className="inline-flex items-center gap-1.5 tabular">
                  {revealed[p.id] ?? p.passportMasked}
                  {!revealed[p.id] && can('bookings:reveal_pii') && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      title="Reveal (logged)"
                      aria-label="Reveal passport number"
                      onClick={async () => {
                        const r = await api.bookings.revealPassport(p.id);
                        setRevealed((x) => ({ ...x, [p.id]: r.passportNumber }));
                      }}
                    >
                      <Eye className="size-3.5" />
                    </button>
                  )}
                </span>
              ),
            },
            {
              key: 'e',
              header: 'Expiry',
              hideBelow: 'sm',
              cell: (p) => formatDate(p.passportExpiry),
            },
          ]}
        />
      </Card>

      {b.agentNotes && (
        <Card>
          <CardHeader title="Partner notes" />
          <CardBody className="whitespace-pre-line text-sm">{b.agentNotes}</CardBody>
        </Card>
      )}

      {can('bookings:approve') && (
        <Card>
          <CardHeader
            title="Internal notes"
            description="Staff only. Never shown to the partner."
          />
          <CardBody className="space-y-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => saveNotes.mutate()}
                loading={saveNotes.isPending}
                disabled={notes === (b.internalNotes ?? '')}
              >
                Save notes
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="History" />
        <CardBody>
          <Timeline
            items={b.timeline.map((e) => {
              const tone = statusTone(e.status);
              return {
                title: statusLabel(e.status),
                time: `${formatDateTime(e.at)}${e.actor ? ` · ${e.actor}` : ''}`,
                body: e.note,
                tone: tone === 'primary' || tone === 'gold' ? 'info' : tone,
              };
            })}
          />
        </CardBody>
      </Card>

      {b.payments.length > 0 && (
        <Card>
          <CardHeader title="Linked payments" />
          <DataTable
            dense
            rows={b.payments}
            rowKey={(p) => p.id}
            columns={[
              {
                key: 'r',
                header: 'Payment',
                cell: (p) => <span className="tabular">{p.reference}</span>,
              },
              { key: 'd', header: 'Date', cell: (p) => formatDate(p.paidAt ?? p.createdAt) },
              {
                key: 'a',
                header: 'Amount',
                align: 'right',
                cell: (p) => <Money value={p.amount} />,
              },
              {
                key: 's',
                header: 'Status',
                align: 'right',
                cell: (p) => <StatusBadge status={p.status} />,
              },
            ]}
          />
        </Card>
      )}

      {b.supplierCalls.length > 0 && (
        <Card>
          <CardHeader title="Supplier calls" />
          <ul className="divide-y text-[13px]">
            {b.supplierCalls.map((c) => (
              <li key={c.id} className="px-5 py-2.5">
                <details>
                  <summary className="flex cursor-pointer items-center gap-3">
                    <span className="w-16 font-semibold">{c.operation}</span>
                    <span className={c.errorKind ? 'text-danger' : 'text-success'}>
                      {c.errorKind ?? `${c.responseCode ?? ''} OK`}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {c.durationMs} ms · {formatDateTime(c.createdAt)}
                    </span>
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto rounded bg-surface-sunken p-2 text-xs">
                    {JSON.stringify({ request: c.requestBody, response: c.responseBody }, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Approve ${b.reference}?`}
        description="We'll check live availability with the supplier first. The partner is notified."
        confirmLabel="Approve"
        reasonLabel="Note to partner (optional)"
        reasonRequired={false}
        onConfirm={(r) => run('approve', r)}
      />
      <ConfirmDialog
        open={dialog === 'push'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Send to supplier?"
        description={`This books ${b.seats} seat(s) with ${b.supplierName} and charges ${b.totalPrice.toLocaleString('en-PK')} PKR to the partner's account when confirmed.`}
        confirmLabel="Send to supplier"
        onConfirm={() => run(has('retry_push') ? 'retry_push' : 'push')}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Reject ${b.reference}?`}
        description="Held seats are released and the partner is told the reason."
        confirmLabel="Reject booking"
        tone="danger"
        reasonLabel="Reason (sent to partner)"
        onConfirm={(r) => run('reject', r)}
      />
      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Cancel ${b.reference}?`}
        description={
          isInventory
            ? b.status === 'CONFIRMED'
              ? 'Confirmed seats are released back to the pool and the invoice is voided.'
              : 'Held/pending seats are released back to the pool.'
            : b.status === 'CONFIRMED'
              ? 'The supplier booking is cancelled and the full amount is credited back to the partner. The invoice is voided.'
              : 'Held seats are released.'
        }
        confirmLabel="Cancel booking"
        tone="danger"
        reasonLabel="Reason (sent to partner)"
        onConfirm={(r) => run('cancel', r)}
      />
      {isInventory && (
        <ExtendDeadlineDialog
          open={extendOpen}
          onOpenChange={setExtendOpen}
          onSubmit={(minutes) => extendDeadline.mutate(minutes)}
          loading={extendDeadline.isPending}
        />
      )}
      {isInventory && (
        <MarkTicketedDialog
          open={ticketOpen}
          onOpenChange={setTicketOpen}
          booking={b}
          onDone={(x) => {
            onDone(x, `${x.reference}: ticketed`);
            setTicketOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ExtendDeadlineDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (minutes: number) => void;
  loading: boolean;
}) {
  const [minutes, setMinutes] = useState(60);
  useEffect(() => {
    if (open) setMinutes(60);
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Extend deadline"
      description="Moves both the seat hold and payment deadline. Use a negative value to pull it in."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(minutes)} loading={loading}>
            Extend
          </Button>
        </>
      }
    >
      <Field label="Extension">
        <Select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          <option value={-60}>-1 hour</option>
          <option value={30}>+30 minutes</option>
          <option value={60}>+1 hour</option>
          <option value={120}>+2 hours</option>
          <option value={240}>+4 hours</option>
          <option value={1440}>+24 hours</option>
        </Select>
      </Field>
    </Dialog>
  );
}

function MarkTicketedDialog({
  open,
  onOpenChange,
  booking: b,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: AdminBookingDetailDto;
  onDone: (b: AdminBookingDetailDto) => void;
}) {
  const toast = useToast();
  const [tickets, setTickets] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) setTickets({});
  }, [open]);

  const ticket = useMutation({
    mutationFn: () =>
      api.bookings.ticket(b.id, {
        passengerTickets: b.passengers.map((p) => ({
          passengerId: p.id,
          ticketNumber: (tickets[p.id] ?? '').trim(),
        })),
      }),
    onSuccess: onDone,
    onError: (e) => toast.error('Could not mark ticketed', errorMessage(e)),
  });

  const complete = b.passengers.every((p) => (tickets[p.id] ?? '').trim().length >= 3);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Mark ${b.reference} ticketed`}
      description="Enter the airline e-ticket number issued for each passenger."
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={ticket.isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => ticket.mutate()} loading={ticket.isPending} disabled={!complete}>
            Mark ticketed
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {b.passengers.map((p) => (
          <Field key={p.id} label={`${titleCase(p.title)} ${p.firstName} ${p.lastName}`}>
            <Input
              placeholder="Ticket number"
              className="tabular"
              value={tickets[p.id] ?? ''}
              onChange={(e) => setTickets((t) => ({ ...t, [p.id]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
    </Dialog>
  );
}

function Owner({
  booking: b,
  onChanged,
}: {
  booking: AdminBookingDetailDto;
  onChanged: (b: AdminBookingDetailDto) => void;
}) {
  const { session } = useAuth();
  const toast = useToast();
  const me = session!.user.id;
  const assign = useMutation({
    mutationFn: (staffId: string | null) => api.bookings.assign(b.id, staffId),
    onSuccess: onChanged,
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken px-4 py-2.5 text-[13px]">
      {b.assignedTo ? (
        <span className="flex items-center gap-2">
          <Avatar name={b.assignedTo.name} className="size-6 text-[10px]" />
          {b.assignedTo.id === me
            ? 'You own this request'
            : `${b.assignedTo.name} owns this request`}
        </span>
      ) : (
        <span className="text-muted-foreground">Nobody has picked this up yet</span>
      )}
      {b.assignedTo?.id === me ? (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => assign.mutate(null)}
          loading={assign.isPending}
        >
          Release
        </Button>
      ) : (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => assign.mutate(me)}
          loading={assign.isPending}
        >
          {b.assignedTo ? 'Take over' : 'Take it'}
        </Button>
      )}
    </div>
  );
}
