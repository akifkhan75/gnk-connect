import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Baby,
  Check,
  ChevronDown,
  CircleDot,
  FileText,
  Minus,
  Pencil,
  Percent,
  Plus,
  Send,
  Ticket,
  Timer,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  MAX_SEATS_PER_BOOKING,
  partyFromSeats,
  seatDiscountTotal,
  validatePassengerList,
  type PassengerInput,
  type RequestConcessionInput,
} from '@gnk/validation';
import type { BookingDetailDto, ConcessionDto, ConcessionType } from '@gnk/types';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  Input,
  KeyValue,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
  Textarea,
  cn,
  formatDate,
  formatDateTime,
  formatMoney,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import {
  applyFieldIssues,
  applyServerErrors,
  errorMessage,
  focusFirstIssue,
  passengerFormError,
} from '@/lib/forms';
import { FlightLeg } from '@/components/GroupsTable';
import { can } from '@/components/guards';
import { TealCard } from '@/components/TealCard';
import { PassengerRows, buildPassengers } from '@/components/PassengerEditor';

const LIFECYCLE = ['Quoted', 'Payment Pending', 'Seats Confirmed', 'Ticketed'] as const;
const CLOSED = ['REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'EXPIRED'];

function lifecycleIndex(b: BookingDetailDto) {
  if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') return 3;
  if (
    b.paymentState === 'PAID' ||
    ['SUBMITTED_TO_SUPPLIER', 'SUPPLIER_PENDING', 'SUPPLIER_FAILED'].includes(b.status)
  )
    return 2;
  return 1;
}

function useHoldClock(expiresAt?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!expiresAt) return { expired: false, label: '' };
  const ms = new Date(expiresAt).getTime() - now;
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    expired: ms <= 0,
    label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

export function BookingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { session } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<null | 'all' | string>(null);
  const [concession, setConcession] = useState<ConcessionType | null>(null);
  const q = useQuery({ queryKey: keys.booking(id), queryFn: () => api.bookings.get(id) });
  const balance = useQuery({
    queryKey: keys.balance,
    queryFn: api.ledger.balance,
    enabled: q.data?.status === 'APPROVED',
  });

  const onBooking = (b: BookingDetailDto) => qc.setQueryData(keys.booking(id), b);

  const cancel = useMutation({
    mutationFn: (reason: string) => api.bookings.cancel(id, reason),
    onSuccess: (b) => {
      onBooking(b);
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: keys.bookingCounts });
      toast.success(`Booking ${b.reference} cancelled`);
    },
  });

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const b = q.data;
  const confirmed = b.status === 'CONFIRMED' || b.status === 'COMPLETED';
  const shortfall =
    b.status === 'APPROVED' && balance.data ? b.totalPrice - balance.data.availableFunds : 0;
  const book = can.book(session!.account.role);
  const concessions = b.concessions ?? {
    grantedChildSeats: 0,
    grantedInfantSeats: 0,
    discountAmount: 0,
    requests: [],
    canRequestChild: false,
    canRequestInfant: false,
    canRequestDiscount: false,
  };
  const adultsFilled = b.passengers.filter((p) => p.type === 'ADULT').length;
  const childrenFilled = b.passengers.filter((p) => p.type === 'CHILD').length;
  const infantsFilled = b.passengers.filter((p) => p.type === 'INFANT').length;
  const childSeats = b.childSeats ?? 0;
  const infantSeats = b.infantSeats ?? 0;
  const adultSlots = b.seats - childSeats;
  const seatedRemaining = b.seats - adultsFilled - childrenFilled;
  const infantRemaining = infantSeats - infantsFilled;
  const remaining = seatedRemaining + infantRemaining;
  const holdOpen = ['PENDING_APPROVAL', 'APPROVED'].includes(b.status);
  const canAddPax = book && holdOpen && remaining > 0;
  const canEditPax = book && holdOpen && b.passengers.length > 0;

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Bookings', onClick: () => navigate('/bookings') },
              { label: 'Detail' },
            ]}
          />
        }
        title={
          <span className="flex items-center gap-2">
            <span className="tabular">{b.reference}</span>
            <StatusBadge status={b.status} />
          </span>
        }
        actions={
          <>
            {confirmed && (
              <Button asChild variant="secondary">
                <Link to={`/bookings/${b.id}/voucher`}>
                  <Ticket /> Voucher
                </Link>
              </Button>
            )}
            {b.invoice && (
              <Button asChild variant="secondary">
                <Link to={`/invoices/${b.invoice.id}`}>
                  <FileText /> Invoice {b.invoice.number}
                </Link>
              </Button>
            )}
            {b.canCancel && (
              <Button variant="danger-outline" onClick={() => setCancelOpen(true)}>
                <XCircle /> Cancel request
              </Button>
            )}
          </>
        }
      />

      {!CLOSED.includes(b.status) && <Lifecycle current={lifecycleIndex(b)} />}

      <div className="mb-5 space-y-3">
        {b.status === 'PENDING_APPROVAL' && (
          <Alert tone="info">
            GNK Connect is reviewing this request and checking seats with the airline.
          </Alert>
        )}
        {b.status === 'APPROVED' &&
          (shortfall > 0 ? (
            <Alert
              tone="warning"
              title="Deposit needed before we can issue"
              action={
                can.money(session!.account.role) && (
                  <Button asChild size="sm">
                    <Link to="/payments?new=1">
                      <Wallet /> Record a payment
                    </Link>
                  </Button>
                )
              }
            >
              Approved. Your available balance and credit are <Money value={shortfall} /> short of
              the total. Deposit funds and upload the slip so GNK can issue the booking.
            </Alert>
          ) : (
            <Alert tone="success">
              Approved. Your balance covers this booking; GNK will issue it with the airline
              shortly.
            </Alert>
          ))}
        {b.status === 'SUBMITTED_TO_SUPPLIER' && (
          <Alert tone="info">We're confirming this booking with the airline.</Alert>
        )}
        {b.status === 'REJECTED' && (
          <Alert tone="danger" title="Not approved">
            {b.rejectionReason}
          </Alert>
        )}
      </div>

      <div className="space-y-5">
        <HoldBanner booking={b} />

        <ConcessionsCard
          booking={b}
          canRequest={book}
          onRequest={setConcession}
          onChanged={onBooking}
        />

        <TealCard
          title="Manage Passengers"
          icon={<Users className="size-4" />}
          actions={
            (canAddPax || canEditPax) && (
              <div className="flex flex-wrap gap-2">
                {canEditPax && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-white/30 bg-white/15 text-accent-foreground hover:bg-white/25"
                    onClick={() => {
                      setAdding(false);
                      setEditing((v) => (v ? null : 'all'));
                    }}
                  >
                    <Pencil /> Edit passengers
                  </Button>
                )}
                {canAddPax && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-white/30 bg-white/15 text-accent-foreground hover:bg-white/25"
                    onClick={() => {
                      setEditing(null);
                      setAdding((v) => !v);
                    }}
                  >
                    <Plus /> Add Passengers
                  </Button>
                )}
              </div>
            )
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-sm text-muted-foreground">
            <p className="leading-relaxed">
              {[
                `${adultsFilled} of ${adultSlots} adult${adultSlots === 1 ? '' : 's'} filled`,
                childSeats > 0
                  ? `${childrenFilled} of ${childSeats} child${childSeats === 1 ? '' : 'ren'} filled`
                  : null,
                infantSeats > 0
                  ? `${infantsFilled} of ${infantSeats} infant${infantSeats === 1 ? '' : 's'} filled`
                  : null,
                remaining > 0
                  ? `${remaining} slot${remaining === 1 ? '' : 's'} remaining`
                  : 'all slots filled',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          {adding && canAddPax && (
            <AddPassengersForm
              booking={b}
              onAdded={(next) => {
                onBooking(next);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          )}
          {editing && canEditPax && (
            <EditPassengersForm
              booking={b}
              passengerIds={editing === 'all' ? b.passengers.map((p) => p.id) : [editing]}
              onSaved={(next) => {
                onBooking(next);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
          {b.passengers.length === 0 && !adding ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium">Passengers</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No passengers listed yet. Add traveller details
                {canAddPax ? ' with Add Passengers.' : '.'}
              </p>
            </div>
          ) : b.passengers.length > 0 ? (
            <DataTable
              rowKey={(p) => p.id}
              selectedKey={editing && editing !== 'all' ? editing : undefined}
              rows={b.passengers}
              columns={[
                {
                  key: 'n',
                  header: 'Name',
                  cell: (p) => (
                    <span className="font-medium">{`${titleCase(p.title)} ${p.firstName} ${p.lastName}`}</span>
                  ),
                },
                { key: 't', header: 'Type', hideBelow: 'sm', cell: (p) => titleCase(p.type) },
                {
                  key: 'dob',
                  header: 'Date of birth',
                  hideBelow: 'md',
                  cell: (p) => formatDate(p.dateOfBirth),
                },
                {
                  key: 'pp',
                  header: 'Passport',
                  cell: (p) => <span className="tabular">{p.passportMasked}</span>,
                },
                {
                  key: 'exp',
                  header: 'Expiry',
                  hideBelow: 'md',
                  cell: (p) => formatDate(p.passportExpiry),
                },
                ...(canEditPax
                  ? [
                      {
                        key: 'edit',
                        header: <span className="sr-only">Edit</span>,
                        align: 'right' as const,
                        cell: (p: (typeof b.passengers)[number]) => (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAdding(false);
                              setEditing(p.id);
                            }}
                          >
                            <Pencil /> Edit
                          </Button>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          ) : null}
        </TealCard>

        <Accordion
          title="Booking details"
          hint="Booking metadata and linked documents"
          defaultOpen={false}
        >
          <KeyValue
            columns={3}
            items={[
              { label: 'Group', value: b.title, wide: true },
              { label: 'Sector', value: b.sector },
              { label: 'Airline', value: b.airline },
              {
                label: 'PNR',
                value: b.pnr ? (
                  <span className="font-mono">{b.pnr}</span>
                ) : confirmed ? (
                  '—'
                ) : (
                  'Issued on confirmation'
                ),
              },
              { label: 'Departure', value: formatDate(b.departureDate, 'weekday') },
              { label: 'Return', value: formatDate(b.returnDate, 'weekday') },
              { label: 'Baggage', value: b.baggage },
              { label: 'Requested', value: formatDateTime(b.createdAt) },
              { label: 'Requested by', value: b.createdByName },
            ]}
          />
          {(b.outbound || b.inbound) && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3">
              <FlightLeg leg={b.outbound} dir="out" />
              <FlightLeg leg={b.inbound} dir="in" />
            </div>
          )}
          {b.agentNotes && (
            <p className="mt-4 whitespace-pre-line border-t pt-3 text-sm">{b.agentNotes}</p>
          )}
        </Accordion>

        <Accordion
          title="Financial summary"
          hint={`Booking value ${formatMoney(b.totalPrice, { decimals: true })}`}
          defaultOpen={false}
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                <Money value={b.unitPrice} decimals /> × {b.seats} seat
                {b.seats > 1 ? 's' : ''}
              </span>
              <Money value={b.unitPrice * b.seats} decimals />
            </div>
            {concessions.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <Money value={-concessions.discountAmount} decimals signed />
              </div>
            )}
            <div className="flex items-baseline justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <Money value={b.totalPrice} className="text-lg font-semibold" decimals />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Payment</span>
              <StatusBadge status={b.paymentState} />
            </div>
            {b.amountPaid > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Paid</span>
                <Money value={b.amountPaid} decimals />
              </div>
            )}
          </div>
        </Accordion>
      </div>

      {concession && (
        <ConcessionDialog
          booking={b}
          type={concession}
          onClose={() => setConcession(null)}
          onSaved={(next) => {
            onBooking(next);
            setConcession(null);
          }}
        />
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${b.reference}?`}
        description="The held seats will be released. This can't be undone."
        confirmLabel="Cancel booking"
        tone="danger"
        reasonLabel="Reason"
        onConfirm={async (reason) => {
          try {
            await cancel.mutateAsync(reason);
          } catch (e) {
            throw new Error(errorMessage(e), { cause: e });
          }
        }}
      />
    </>
  );
}

function Lifecycle({ current }: { current: number }) {
  return (
    <Card className="mb-5 px-4 py-5 sm:px-8">
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Booking lifecycle
      </p>
      <ol className="flex w-full">
        {LIFECYCLE.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const last = i === LIFECYCLE.length - 1;
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    'h-0.5 min-w-0 flex-1',
                    i === 0 ? 'bg-transparent' : i <= current ? 'bg-accent' : 'bg-border',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs',
                    done && 'border-accent bg-accent text-accent-foreground',
                    active && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    !done && !active && 'border-border-strong bg-surface text-muted-foreground',
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : active ? (
                    <Ticket className="size-3.5" />
                  ) : (
                    <CircleDot className="size-3.5 opacity-40" />
                  )}
                </span>
                <span
                  className={cn(
                    'h-0.5 min-w-0 flex-1',
                    last ? 'bg-transparent' : i < current ? 'bg-accent' : 'bg-border',
                  )}
                  aria-hidden
                />
              </div>
              <span
                className={cn(
                  'max-w-full px-1 text-center text-[11px] font-medium leading-snug sm:text-xs',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function HoldBanner({ booking: b }: { booking: BookingDetailDto }) {
  const clock = useHoldClock(b.holdExpiresAt);
  const holding = ['PENDING_APPROVAL', 'APPROVED'].includes(b.status) && b.paymentState !== 'PAID';
  if (!holding) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-soft px-5 py-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          <Timer className="size-3.5" />
          {clock.expired ? 'Hold expired' : 'Hold active'}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {b.seats} seat{b.seats > 1 ? 's' : ''} · <Money value={b.totalPrice} decimals />
          </p>
          <p className="text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</p>
        </div>
      </div>
      {b.holdExpiresAt && (
        <div className="text-right">
          <p className="font-mono text-xl font-semibold tabular tracking-tight">{clock.label}</p>
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-wide',
              clock.expired ? 'text-danger' : 'text-success',
            )}
          >
            <span
              className={cn(
                'mr-1 inline-block size-1.5 rounded-full',
                clock.expired ? 'bg-danger' : 'animate-pulse bg-success',
              )}
            />
            {clock.expired ? 'Expired' : 'Live'}
          </p>
        </div>
      )}
    </div>
  );
}

function ConcessionsCard({
  booking: b,
  canRequest,
  onRequest,
  onChanged,
}: {
  booking: BookingDetailDto;
  canRequest: boolean;
  onRequest: (type: ConcessionType) => void;
  onChanged: (b: BookingDetailDto) => void;
}) {
  const toast = useToast();
  const withdraw = useMutation({
    mutationFn: (id: string) => api.bookings.cancelConcession(b.id, id),
    onSuccess: (next) => {
      onChanged(next);
      toast.success('Request withdrawn');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const c = b.concessions ?? {
    grantedChildSeats: 0,
    grantedInfantSeats: 0,
    discountAmount: 0,
    requests: [],
    canRequestChild: false,
    canRequestInfant: false,
    canRequestDiscount: false,
  };
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Concessions
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Child seats, infant seats, and booking discounts
          </p>
        </div>
        {canRequest && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!c.canRequestChild}
              title={
                c.canRequestChild
                  ? 'Request extra child seats after booking. Charged at the adult fare.'
                  : 'A child-seat request is already pending, or the hold is closed'
              }
              onClick={() => onRequest('CHILD_SEATS')}
            >
              <Baby /> Child seats
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!c.canRequestInfant}
              title={
                c.canRequestInfant
                  ? 'Lap infants do not take a seat. 1 infant per adult.'
                  : 'An infant request is already pending, or the hold is closed'
              }
              onClick={() => onRequest('INFANT_SEATS')}
            >
              <Baby /> Infant seats
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!c.canRequestDiscount}
              title={
                c.canRequestDiscount
                  ? 'Request a fixed per-seat discount by adult, child, or infant'
                  : 'A discount is already applied or pending'
              }
              onClick={() => onRequest('DISCOUNT')}
            >
              <Percent /> Discount
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-3 border-t px-5 py-4 sm:grid-cols-3">
        <Stat label="Granted child seats" value={String(c.grantedChildSeats)} icon={<Baby />} />
        <Stat label="Granted infant seats" value={String(c.grantedInfantSeats)} icon={<Baby />} />
        <Stat
          label="Discount applied"
          value={c.discountAmount > 0 ? formatMoney(c.discountAmount, { decimals: true }) : '—'}
          icon={<Percent />}
        />
      </div>
      <div className="border-t px-5 py-4">
        {c.requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No concession requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {c.requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={r.status}
                      label={r.status === 'PENDING' ? 'Requested' : undefined}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {concessionTypeLabel(r.type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatConcessionStamp(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{concessionDetail(r)}</p>
                  {(r.note || r.staffNote || r.pnr) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.pnr ? `PNR ${r.pnr}` : ''}
                      {r.pnr && (r.note || r.staffNote) ? ' · ' : ''}
                      {r.note}
                      {r.note && r.staffNote ? ' · ' : ''}
                      {r.staffNote}
                    </p>
                  )}
                </div>
                {r.status === 'PENDING' && canRequest && (
                  <Button
                    size="xs"
                    variant="ghost"
                    loading={withdraw.isPending}
                    onClick={() => withdraw.mutate(r.id)}
                  >
                    Withdraw
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular tracking-tight">{value}</p>
    </div>
  );
}

function concessionTypeLabel(type: ConcessionType) {
  return type === 'CHILD_SEATS'
    ? 'Child seats'
    : type === 'INFANT_SEATS'
      ? 'Infant seats'
      : 'Discount';
}

function concessionDetail(r: ConcessionDto) {
  if (r.type === 'DISCOUNT') {
    const parts = [
      r.adultAmount > 0 ? `Adult ${Math.round(r.adultAmount)}` : null,
      r.childAmount > 0 ? `Child ${Math.round(r.childAmount)}` : null,
      r.infantAmount > 0 ? `Infant ${Math.round(r.infantAmount)}` : null,
    ].filter(Boolean);
    return parts.join(' · ') || 'Discount';
  }
  const n = r.status === 'GRANTED' ? r.grantedSeats : r.seats;
  return r.type === 'CHILD_SEATS' ? `${n} extra child seat(s)` : `${n} infant seat(s)`;
}

function formatConcessionStamp(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi',
  }).formatToParts(new Date(value));
  const g = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('day')}/${g('month')}/${g('year')}, ${g('hour')}:${g('minute')}:${g('second')}`;
}

function ConcessionDialog({
  booking,
  type,
  onClose,
  onSaved,
}: {
  booking: BookingDetailDto;
  type: ConcessionType;
  onClose: () => void;
  onSaved: (b: BookingDetailDto) => void;
}) {
  const toast = useToast();
  const adults = booking.seats - booking.childSeats;
  const maxInfant = Math.max(0, adults - booking.infantSeats);
  const [seats, setSeats] = useState(1);
  const [adultAmount, setAdultAmount] = useState('');
  const [childAmount, setChildAmount] = useState('');
  const [infantAmount, setInfantAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const party = partyFromSeats(booking.seats, booking.childSeats, booking.infantSeats);
  const rates = {
    adultAmount: Number(adultAmount) || 0,
    childAmount: Number(childAmount) || 0,
    infantAmount: Number(infantAmount) || 0,
  };
  const estimate = seatDiscountTotal(rates, party);

  const submit = useMutation({
    mutationFn: (dto: RequestConcessionInput) => api.bookings.requestConcession(booking.id, dto),
    onSuccess: (b) => {
      toast.success('Concession requested');
      onSaved(b);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const title =
    type === 'CHILD_SEATS'
      ? 'Request child seats'
      : type === 'INFANT_SEATS'
        ? 'Request infant seats'
        : 'Request discount';
  const description =
    type === 'CHILD_SEATS'
      ? 'Request extra child seats on this hold. Granted seats are charged at the adult fare. The 1 child per 10 adults limit applies only when first creating a booking.'
      : type === 'INFANT_SEATS'
        ? 'Infants do not take a seat. 1 lap infant is allowed per adult. There is no infant fare on this group — GNK must grant the slot first.'
        : `Request a per-seat discount by adult, child, or infant for booking ${booking.reference}.`;

  const send = () => {
    setError(undefined);
    if (type === 'DISCOUNT') {
      if (rates.adultAmount <= 0 && rates.childAmount <= 0 && rates.infantAmount <= 0) {
        setError('Enter a discount for at least one passenger type');
        return;
      }
      submit.mutate({
        type,
        adultAmount: rates.adultAmount,
        childAmount: rates.childAmount,
        infantAmount: rates.infantAmount,
        note: note || undefined,
      });
      return;
    }
    submit.mutate({ type, seats, note: note || undefined });
  };

  const max = type === 'CHILD_SEATS' ? MAX_SEATS_PER_BOOKING : Math.max(1, maxInfant);

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} loading={submit.isPending}>
            <Send /> Submit request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {type === 'DISCOUNT' ? (
          <div className="space-y-3">
            <Field label="Adult discount / seat">
              <Input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                value={adultAmount}
                onChange={(e) => setAdultAmount(e.target.value)}
              />
            </Field>
            <Field label="Child discount / seat">
              <Input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                value={childAmount}
                onChange={(e) => setChildAmount(e.target.value)}
              />
            </Field>
            <Field
              label="Infant discount / seat"
              hint="Fixed amount per seat of that type. Leave a kind blank for no discount. Infants have no fare unless GNK priced one."
            >
              <Input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                value={infantAmount}
                onChange={(e) => setInfantAmount(e.target.value)}
              />
            </Field>
            {estimate > 0 && (
              <p className="text-sm text-muted-foreground">
                Estimated on this hold:{' '}
                <span className="font-medium text-foreground">
                  <Money value={estimate} decimals />
                </span>
                {` · ${party.adults} adult${party.adults === 1 ? '' : 's'}`}
                {party.children > 0
                  ? `, ${party.children} child${party.children === 1 ? '' : 'ren'}`
                  : ''}
                {party.infants > 0
                  ? `, ${party.infants} infant${party.infants === 1 ? '' : 's'}`
                  : ''}
              </p>
            )}
          </div>
        ) : (
          <Field
            label={type === 'CHILD_SEATS' ? 'Child seats' : 'Infant seats'}
            hint={
              type === 'CHILD_SEATS'
                ? `Up to ${MAX_SEATS_PER_BOOKING} extra child seats on this request`
                : maxInfant < 1
                  ? 'Need an adult seat first'
                  : `Up to ${maxInfant} on this hold`
            }
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                disabled={seats <= 1}
                onClick={() => setSeats((n) => n - 1)}
              >
                <Minus />
              </Button>
              <span className="w-8 text-center text-sm font-semibold tabular">{seats}</span>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                disabled={seats >= max}
                onClick={() => setSeats((n) => n + 1)}
              >
                <Plus />
              </Button>
            </div>
          </Field>
        )}
        <Field label={type === 'DISCOUNT' ? 'Reason' : 'Note for GNK (optional)'}>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={type === 'DISCOUNT' ? 'Optional note for platform review' : undefined}
          />
        </Field>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}

function AddPassengersForm({
  booking,
  onAdded,
  onCancel,
}: {
  booking: BookingDetailDto;
  onAdded: (b: BookingDetailDto) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string>();
  const trip = {
    departureDate: booking.departureDate,
    returnDate: booking.returnDate ?? booking.departureDate,
  };
  const adultsFilled = booking.passengers.filter((p) => p.type === 'ADULT').length;
  const childrenFilled = booking.passengers.filter((p) => p.type === 'CHILD').length;
  const infantsFilled = booking.passengers.filter((p) => p.type === 'INFANT').length;
  const remainingAdults = Math.max(0, booking.seats - booking.childSeats - adultsFilled);
  const remainingChildren = Math.max(0, booking.childSeats - childrenFilled);
  const remainingInfants = Math.max(0, booking.infantSeats - infantsFilled);
  const rules = {
    exactSeats: false,
    grantedInfantSeats: booking.infantSeats,
    childSeatQuota: booking.childSeats,
  };
  const form = useForm<{ passengers: PassengerInput[] }>({
    defaultValues: {
      passengers: buildPassengers(remainingAdults, remainingChildren, [], remainingInfants),
    },
    mode: 'onTouched',
  });
  const { control, register, setValue, getValues, setError, clearErrors, formState } = form;
  const { fields } = useFieldArray({ control, name: 'passengers' });

  const submit = useMutation({
    mutationFn: (passengers: PassengerInput[]) =>
      api.bookings.addPassengers(booking.id, { passengers }),
    onSuccess: (next) => {
      toast.success('Passenger details saved');
      onAdded(next);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError)),
  });

  const save = () => {
    setFormError(undefined);
    if (!accepted) {
      setFormError('Confirm the information is accurate to continue.');
      return;
    }
    const existing: PassengerInput[] = booking.passengers.map((p) => ({
      type: p.type,
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      nationality: p.nationality,
      passportNumber: `X${p.id.replace(/-/g, '').slice(0, 8)}`,
      passportExpiry: p.passportExpiry,
    }));
    const incoming = getValues('passengers');
    const parsed = validatePassengerList([...existing, ...incoming], booking.seats, trip, rules);
    if (!parsed.ok) {
      const shifted = parsed.issues.map((issue) => {
        const m = /^passengers\.(\d+)\.(.+)$/.exec(issue.path);
        if (!m) return issue;
        const idx = Number(m[1]) - existing.length;
        return idx >= 0 ? { ...issue, path: `passengers.${idx}.${m[2]}` } : issue;
      });
      applyFieldIssues(
        shifted.filter((i) => i.path.startsWith('passengers.') && !i.path.includes('passengers.-')),
        setError,
      );
      setFormError(passengerFormError(parsed.issues));
      focusFirstIssue(shifted);
      return;
    }
    submit.mutate(incoming);
  };

  if (fields.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">All passenger slots are filled.</p>
    );
  }

  return (
    <div className="border-b">
      <p className="px-5 py-3 text-sm leading-relaxed text-muted-foreground">
        {remainingAdults > 0
          ? `Add ${remainingAdults} adult${remainingAdults === 1 ? '' : 's'}. `
          : adultsFilled > 0
            ? 'Adult names are already on this booking. '
            : ''}
        {remainingChildren > 0
          ? `Add ${remainingChildren} granted child seat${remainingChildren === 1 ? '' : 's'} (age 2–11 on departure). `
          : ''}
        {remainingInfants > 0
          ? `Add ${remainingInfants} granted infant${remainingInfants === 1 ? '' : 's'} (under 2 on departure). `
          : ''}
        Scan a passport or type names as printed.
      </p>
      <PassengerRows
        fields={fields}
        register={register}
        setValue={setValue}
        getValues={getValues}
        setError={setError}
        clearErrors={clearErrors}
        errors={formState.errors.passengers}
        trip={trip}
        lockType
        rules={rules}
      />
      <div className="space-y-3 border-t px-5 py-4">
        <Checkbox
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          label="I confirm these names match the passports."
        />
        {formError && <p className="text-xs font-medium text-danger">{formError}</p>}
        <div className="flex gap-2">
          <Button onClick={save} loading={submit.isPending}>
            Save passengers
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function keepPassportToken(id: string) {
  return `X${id.replace(/-/g, '').slice(0, 8)}`;
}

function EditPassengersForm({
  booking,
  passengerIds,
  onSaved,
  onCancel,
}: {
  booking: BookingDetailDto;
  passengerIds: string[];
  onSaved: (b: BookingDetailDto) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string>();
  const trip = {
    departureDate: booking.departureDate,
    returnDate: booking.returnDate ?? booking.departureDate,
  };
  const rules = {
    exactSeats: false,
    grantedInfantSeats: booking.infantSeats,
    childSeatQuota: booking.childSeats,
  };
  const targets = booking.passengers.filter((p) => passengerIds.includes(p.id));
  const form = useForm<{ passengers: PassengerInput[] }>({
    defaultValues: {
      passengers: targets.map((p) => ({
        type: p.type,
        title: p.title,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        nationality: p.nationality,
        passportNumber: '',
        passportExpiry: p.passportExpiry,
      })),
    },
    mode: 'onTouched',
  });
  const { control, register, setValue, getValues, setError, clearErrors, formState } = form;
  const { fields } = useFieldArray({ control, name: 'passengers' });

  const submit = useMutation({
    mutationFn: () =>
      api.bookings.updatePassengers(booking.id, {
        passengers: getValues('passengers').map((p, i) => ({
          id: targets[i]!.id,
          title: p.title,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth,
          nationality: p.nationality,
          passportNumber: p.passportNumber.trim(),
          passportExpiry: p.passportExpiry,
        })),
      }),
    onSuccess: (next) => {
      toast.success(targets.length === 1 ? 'Passenger updated' : 'Passengers updated');
      onSaved(next);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError)),
  });

  const save = () => {
    setFormError(undefined);
    if (!accepted) {
      setFormError('Confirm the information is accurate to continue.');
      return;
    }
    const incoming = getValues('passengers');
    const others = booking.passengers
      .filter((p) => !passengerIds.includes(p.id))
      .map((p) => ({
        type: p.type,
        title: p.title,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        nationality: p.nationality,
        passportNumber: keepPassportToken(p.id),
        passportExpiry: p.passportExpiry,
      }));
    const edited = incoming.map((p, i) => ({
      ...p,
      type: targets[i]!.type,
      passportNumber: p.passportNumber.trim() || keepPassportToken(targets[i]!.id),
    }));
    const parsed = validatePassengerList([...others, ...edited], booking.seats, trip, rules);
    if (!parsed.ok) {
      const shifted = parsed.issues.map((issue) => {
        const m = /^passengers\.(\d+)\.(.+)$/.exec(issue.path);
        if (!m) return issue;
        const idx = Number(m[1]) - others.length;
        return idx >= 0 ? { ...issue, path: `passengers.${idx}.${m[2]}` } : issue;
      });
      applyFieldIssues(
        shifted.filter((i) => i.path.startsWith('passengers.') && !i.path.includes('passengers.-')),
        setError,
      );
      setFormError(passengerFormError(parsed.issues));
      focusFirstIssue(shifted);
      return;
    }
    submit.mutate();
  };

  if (targets.length === 0) {
    return <p className="px-5 py-4 text-sm text-muted-foreground">Passenger not found.</p>;
  }

  return (
    <div className="border-b">
      <p className="px-5 py-3 text-sm leading-relaxed text-muted-foreground">
        {targets.length === 1
          ? `Edit ${titleCase(targets[0]!.type)} ${titleCase(targets[0]!.title)} ${targets[0]!.firstName} ${targets[0]!.lastName}. `
          : `Edit ${targets.length} passengers on this hold. `}
        Type stays as granted. Leave passport blank to keep the current number.
      </p>
      <PassengerRows
        fields={fields}
        register={register}
        setValue={setValue}
        getValues={getValues}
        setError={setError}
        clearErrors={clearErrors}
        errors={formState.errors.passengers}
        trip={trip}
        lockType
        rules={rules}
        passportOptional
        passportPlaceholders={Object.fromEntries(
          targets.map((p, i) => [i, p.passportMasked || 'PASSPORT #']),
        )}
      />
      <div className="space-y-3 border-t px-5 py-4">
        <Checkbox
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          label="I confirm these names match the passports."
        />
        {formError && <p className="text-xs font-medium text-danger">{formError}</p>}
        <div className="flex gap-2">
          <Button onClick={save} loading={submit.isPending}>
            Save changes
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function Accordion({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <span className="block text-[15px] font-semibold tracking-[-0.015em]">{title}</span>
          {hint && <span className="mt-0.5 block text-[13px] text-muted-foreground">{hint}</span>}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <CardBody className="border-t pt-4">{children}</CardBody>}
    </Card>
  );
}
