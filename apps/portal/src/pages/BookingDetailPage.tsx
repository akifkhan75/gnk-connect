import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Download,
  FileText,
  Gift,
  Mail,
  Plane,
  ScanLine,
  Ticket,
  Timer,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react';
import { z } from 'zod';
import {
  formatPassport,
  MAX_SEATS_PER_BOOKING,
  passengerSchema,
  setBookingPassengersSchema,
  type PassengerInput,
} from '@gnk/validation';
import {
  TITLES,
  type BookingDetailDto,
  type BookingConcessionRequestDto,
  type PassportOcrExtraction,
} from '@gnk/types';
import type { TimelineItem } from '@gnk/ui';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  CopyButton,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  Input,
  KeyValue,
  MaskedInput,
  Money,
  PageHeader,
  Select,
  Stepper,
  Spinner,
  StatusBadge,
  Textarea,
  Timeline,
  formatDate,
  formatDateTime,
  saveBlob,
  statusLabel,
  statusTone,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { applyServerErrors, errorMessage } from '@/lib/forms';
import { extractPassportFromPastedText } from '@/lib/passport-ocr';
import { FlightLeg } from '@/components/GroupsTable';
import { can } from '@/components/guards';

const PROGRESS = ['Requested', 'Approved', 'Issuing', 'Confirmed', 'Travelled'];
const PROGRESS_INDEX: Partial<Record<string, number>> = {
  PENDING_APPROVAL: 0,
  APPROVED: 1,
  SUBMITTED_TO_SUPPLIER: 2,
  CONFIRMED: 3,
  COMPLETED: 5,
};

/** Inventory (AirDesk) lifecycle — separate from the legacy quote-based stepper above. */
const INVENTORY_PROGRESS = ['Held', 'Payment', 'Confirmed', 'Ticketed'];
const INVENTORY_PROGRESS_INDEX: Partial<Record<string, number>> = {
  HELD: 0,
  PAYMENT_PENDING: 1,
  CONFIRMED: 2,
  TICKETED: 3,
};
/** A booking is on the inventory (group-PNR) path once it carries an inventoryLotId, or once
 *  its status only exists on that path (covers rows where the FK wasn't eagerly loaded). */
const INVENTORY_STATUSES = ['HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'TICKETED', 'EXPIRED_HOLD'];
const isInventoryBooking = (b: BookingDetailDto) =>
  !!b.inventoryLotId || INVENTORY_STATUSES.includes(b.status);
/** Passenger details can be added/edited any time before ticketing. */
const canEditInventoryPax = (b: BookingDetailDto) =>
  ['PAYMENT_PENDING', 'HELD', 'CONFIRMED'].includes(b.status);

const NATIONALITIES = [
  { code: 'PK', label: 'Pakistan' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'IN', label: 'India' },
  { code: 'BD', label: 'Bangladesh' },
];

const blankPax = (type: PassengerInput['type'] = 'ADULT'): PassengerInput => ({
  type,
  title: type === 'INFANT' ? 'MSTR' : 'MR',
  firstName: '',
  lastName: '',
  gender: 'MALE',
  dateOfBirth: '',
  nationality: 'PK',
  passportNumber: '',
  passportExpiry: '',
});

const genderFromTitle = (title: string): PassengerInput['gender'] =>
  title === 'MR' || title === 'MSTR' ? 'MALE' : 'FEMALE';

type PaxFormValues = z.input<typeof setBookingPassengersSchema>;

export function BookingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { session } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const q = useQuery({ queryKey: keys.booking(id), queryFn: () => api.bookings.get(id) });
  const balance = useQuery({
    queryKey: keys.balance,
    queryFn: api.ledger.balance,
    enabled: q.data?.status === 'APPROVED',
  });

  const cancel = useMutation({
    mutationFn: (reason: string) => api.bookings.cancel(id, reason),
    onSuccess: (b) => {
      qc.setQueryData(keys.booking(id), b);
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: keys.bookingCounts });
      toast.success(`Booking ${b.reference} cancelled`);
    },
  });

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const b = q.data;
  const onSaved = (updated: BookingDetailDto) => {
    qc.setQueryData(keys.booking(id), updated);
    void qc.invalidateQueries({ queryKey: ['bookings'] });
    void qc.invalidateQueries({ queryKey: keys.bookingCounts });
  };

  if (isInventoryBooking(b)) {
    return (
      <InventoryBookingDetail
        booking={b}
        onSaved={onSaved}
        cancel={cancel}
        cancelOpen={cancelOpen}
        setCancelOpen={setCancelOpen}
      />
    );
  }

  const confirmed = b.status === 'CONFIRMED' || b.status === 'COMPLETED';
  const shortfall =
    b.status === 'APPROVED' && balance.data ? b.totalPrice - balance.data.availableFunds : 0;
  const seatPax = b.passengers.filter((p) => p.type !== 'INFANT').length;
  const paxIncomplete = seatPax < b.seats;
  const canEditPax =
    paxIncomplete &&
    (b.status === 'PENDING_APPROVAL' || b.status === 'APPROVED') &&
    can.book(session!.account.role);

  const timeline: TimelineItem[] = b.timeline.map((e) => {
    const tone = statusTone(e.status);
    return {
      title: statusLabel(e.status),
      time: formatDateTime(e.at),
      body: e.note,
      tone: tone === 'primary' || tone === 'gold' ? 'info' : tone,
    };
  });

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Bookings', onClick: () => navigate('/bookings') },
              { label: b.reference },
            ]}
          />
        }
        title={
          <span className="flex items-center gap-2">
            Booking <span className="tabular">{b.reference}</span>
            <CopyButton value={b.reference} label="Copy" />
          </span>
        }
        meta={
          <>
            <StatusBadge
              status={b.status}
              label={
                b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'Seats Confirmed' : undefined
              }
            />
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                paxIncomplete
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}
            >
              Passengers: {paxIncomplete ? 'Pending' : 'Complete'}
            </span>
          </>
        }
        description={`Requested ${formatDateTime(b.createdAt)} by ${b.createdByName}`}
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

      {PROGRESS_INDEX[b.status] !== undefined && (
        <Card className="mb-5 px-5 py-4">
          <Stepper steps={PROGRESS} current={PROGRESS_INDEX[b.status]!} />
        </Card>
      )}

      <div className="mb-5 space-y-3">
        {canEditPax && (
          <Alert tone="warning" title="Passenger details needed">
            Seats are held. Add passport details for {b.seats} passenger
            {b.seats > 1 ? 's' : ''} before ticketing.
          </Alert>
        )}
        {b.status === 'PENDING_APPROVAL' && !canEditPax && (
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Trip" icon={<Plane className="size-4" />} />
            <CardBody className="space-y-4">
              <KeyValue
                columns={3}
                items={[
                  { label: 'Group', value: b.title, wide: true },
                  { label: 'Sector', value: b.sector },
                  { label: 'Airline', value: b.airline },
                  {
                    label: 'PNR',
                    value: b.pnr ? (
                      <span className="flex items-center gap-1 font-mono">
                        {b.pnr}
                        <CopyButton value={b.pnr} label="" />
                      </span>
                    ) : confirmed ? (
                      '—'
                    ) : (
                      'Issued on confirmation'
                    ),
                  },
                  { label: 'Departure', value: formatDate(b.departureDate, 'weekday') },
                  { label: 'Return', value: formatDate(b.returnDate, 'weekday') },
                  { label: 'Baggage', value: b.baggage },
                ]}
              />
              {(b.outbound || b.inbound) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3">
                  <FlightLeg leg={b.outbound} dir="out" />
                  <FlightLeg leg={b.inbound} dir="in" />
                </div>
              )}
            </CardBody>
          </Card>

          {canEditPax ? (
            <AddPassengersForm booking={b} onSaved={onSaved} />
          ) : (
            <PassengersTable booking={b} />
          )}

          {b.agentNotes && (
            <Card>
              <CardHeader title="Your notes" />
              <CardBody className="whitespace-pre-line text-sm">{b.agentNotes}</CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Price" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  <Money value={b.unitPrice} /> × {b.seats} seat{b.seats > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <Money value={b.totalPrice} className="text-lg font-semibold" />
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Payment</span>
                <StatusBadge status={b.paymentState} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Status history" />
            <CardBody>
              <Timeline items={timeline} />
            </CardBody>
          </Card>
        </div>
      </div>

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

function PassengersTable({ booking: b }: { booking: BookingDetailDto }) {
  return (
    <Card>
      <CardHeader title={`Passengers (${b.passengers.length})`} />
      <DataTable
        rowKey={(p) => p.id}
        rows={b.passengers}
        columns={[
          {
            key: 'n',
            header: 'Name',
            cell: (p) => (
              <span className="font-medium">
                {`${titleCase(p.title)} ${p.firstName} ${p.lastName}`}
              </span>
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
          ...(b.passengers.some((p) => p.ticketNumber)
            ? [
                {
                  key: 'tk',
                  header: 'Ticket #',
                  hideBelow: 'md' as const,
                  cell: (p: BookingDetailDto['passengers'][number]) => (
                    <span className="tabular">{p.ticketNumber || '—'}</span>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}

function AddPassengersForm({
  booking,
  onSaved,
}: {
  booking: BookingDetailDto;
  onSaved: (b: BookingDetailDto) => void;
}) {
  const toast = useToast();
  const [formError, setFormError] = useState<string>();
  const form = useForm<PaxFormValues>({
    resolver: zodResolver(
      z.object({
        passengers: z.array(passengerSchema).min(1).max(MAX_SEATS_PER_BOOKING),
      }),
    ),
    defaultValues: {
      passengers: Array.from({ length: booking.seats }, () => blankPax()),
    },
    mode: 'onTouched',
  });
  const { control, register, handleSubmit, setValue, setError, formState } = form;
  const { fields, replace } = useFieldArray({ control, name: 'passengers' });
  const errors = formState.errors;

  useEffect(() => {
    replace(Array.from({ length: booking.seats }, () => blankPax()));
  }, [booking.seats, replace]);

  const save = useMutation({
    mutationFn: (passengers: PassengerInput[]) =>
      api.bookings.setPassengers(booking.id, { passengers }),
    onSuccess: (b) => {
      onSaved(b);
      toast.success('Passenger details saved');
    },
    onError: (e) => {
      setFormError(applyServerErrors(e, setError));
      toast.error(errorMessage(e));
    },
  });

  return (
    <Card>
      <CardHeader
        title="Add passenger details"
        description={`Enter passport details for all ${booking.seats} seat${booking.seats > 1 ? 's' : ''}.`}
        icon={<UserPlus className="size-4" />}
      />
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((v) => {
            setFormError(undefined);
            save.mutate(v.passengers as PassengerInput[]);
          })}
          noValidate
        >
          {formError && <Alert tone="danger">{formError}</Alert>}
          {fields.map((f, i) => {
            const e = errors.passengers?.[i];
            return (
              <div
                key={f.id}
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">Passenger {i + 1}</span>
                </div>
                <Field label="Title" required error={e?.title?.message}>
                  <Select
                    {...register(`passengers.${i}.title`, {
                      onChange: (ev) =>
                        setValue(`passengers.${i}.gender`, genderFromTitle(ev.target.value), {
                          shouldValidate: true,
                        }),
                    })}
                  >
                    {TITLES.map((t) => (
                      <option key={t} value={t}>
                        {titleCase(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Surname" required error={e?.lastName?.message}>
                  <Input
                    placeholder="LAST NAME"
                    className="uppercase"
                    autoComplete="off"
                    {...register(`passengers.${i}.lastName`)}
                  />
                </Field>
                <Field label="Given name" required error={e?.firstName?.message}>
                  <Input
                    placeholder="FIRST NAME"
                    className="uppercase"
                    autoComplete="off"
                    {...register(`passengers.${i}.firstName`)}
                  />
                </Field>
                <Field label="Passport" required error={e?.passportNumber?.message}>
                  <MaskedInput
                    mask={formatPassport}
                    placeholder="PASSPORT #"
                    className="uppercase tabular"
                    autoComplete="off"
                    {...register(`passengers.${i}.passportNumber`)}
                  />
                </Field>
                <Field label="Date of birth" required error={e?.dateOfBirth?.message}>
                  <Input type="date" {...register(`passengers.${i}.dateOfBirth`)} />
                </Field>
                <Field label="Passport expiry" required error={e?.passportExpiry?.message}>
                  <Input type="date" {...register(`passengers.${i}.passportExpiry`)} />
                </Field>
                <Field label="Nationality" required error={e?.nationality?.message}>
                  <Select {...register(`passengers.${i}.nationality`)}>
                    {NATIONALITIES.map((n) => (
                      <option key={n.code} value={n.code}>
                        {n.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <input type="hidden" {...register(`passengers.${i}.type`)} />
                <input type="hidden" {...register(`passengers.${i}.gender`)} />
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={save.isPending}>
              Save passengers
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inventory (AirDesk group-PNR) booking detail
// ---------------------------------------------------------------------------

/** Ticking countdown to a deadline. Turns danger-toned inside the last 15 minutes. */
function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return <span className="font-semibold text-danger">Expired</span>;
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const s = Math.floor((ms % 60_000) / 1000);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  const danger = ms < 15 * 60_000;
  return (
    <span className={`font-semibold tabular ${danger ? 'text-danger' : 'text-foreground'}`}>
      {label}
    </span>
  );
}

function InventoryBookingDetail({
  booking: b,
  onSaved,
  cancel,
  cancelOpen,
  setCancelOpen,
}: {
  booking: BookingDetailDto;
  onSaved: (b: BookingDetailDto) => void;
  cancel: ReturnType<typeof useMutation<BookingDetailDto, unknown, string>>;
  cancelOpen: boolean;
  setCancelOpen: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { session } = useAuth();
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [concessionOpen, setConcessionOpen] = useState(false);
  const [emailTicketOpen, setEmailTicketOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const confirmed = b.status === 'CONFIRMED' || b.status === 'TICKETED';
  const deadline = b.status === 'HELD' ? b.heldUntil : b.paymentDeadlineAt;
  const showCountdown = ['HELD', 'PAYMENT_PENDING'].includes(b.status) && !!deadline;

  const totalPax = (b.bookedAdults ?? 0) + (b.bookedChildren ?? 0) + (b.bookedInfants ?? 0);
  const filledPax = b.passengers.length;
  const paxIncomplete = filledPax < totalPax;
  const canEditPax = canEditInventoryPax(b) && paxIncomplete && can.book(session!.account.role);

  const concessions = useQuery({
    queryKey: [...keys.booking(b.id), 'concessions'],
    queryFn: () => api.bookings.concessions(b.id),
  });

  const requestExtension = useMutation({
    mutationFn: (dto: { minutes: number; reason?: string }) =>
      api.bookings.requestExtension(b.id, dto),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Extension request sent');
      setExtensionOpen(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const emailTicket = useMutation({
    mutationFn: (to?: string) => api.bookings.emailTicket(b.id, to),
    onSuccess: (res) => {
      toast.success(res.message ?? 'E-ticket emailed');
      setEmailTicketOpen(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const requestRefund = useMutation({
    mutationFn: (reason: string) => api.bookings.requestRefund(b.id, { reason }),
    onSuccess: (res) => {
      onSaved(res);
      toast.success('Refund requested — our team will review it shortly');
      setRefundOpen(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const timeline: TimelineItem[] = b.timeline.map((e) => {
    const tone = statusTone(e.status);
    return {
      title: statusLabel(e.status),
      time: formatDateTime(e.at),
      body: e.note,
      tone: tone === 'primary' || tone === 'gold' ? 'info' : tone,
    };
  });

  const download = async (kind: 'reservation' | 'confirmation' | 'ticket') => {
    try {
      const blob = await api.bookings.documents[
        kind === 'reservation'
          ? 'reservationPdf'
          : kind === 'confirmation'
            ? 'confirmationPdf'
            : 'ticketPdf'
      ](b.id);
      saveBlob(blob, `${b.reference}-${kind}.pdf`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Bookings', onClick: () => navigate('/bookings') },
              { label: b.reference },
            ]}
          />
        }
        title={
          <span className="flex items-center gap-2">
            Booking <span className="tabular">{b.reference}</span>
            <CopyButton value={b.reference} label="Copy" />
          </span>
        }
        meta={
          <>
            <StatusBadge status={b.status} />
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                paxIncomplete
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}
            >
              Passengers: {paxIncomplete ? 'Pending' : 'Complete'}
            </span>
          </>
        }
        description={`Requested ${formatDateTime(b.createdAt)} by ${b.createdByName}`}
        actions={
          <>
            {b.status === 'TICKETED' && (
              <>
                <Button variant="secondary" onClick={() => download('confirmation')}>
                  <Download /> Confirmation
                </Button>
                <Button variant="secondary" onClick={() => download('ticket')}>
                  <Ticket /> E-ticket
                </Button>
                <Button variant="secondary" onClick={() => setEmailTicketOpen(true)}>
                  <Mail /> Email ticket
                </Button>
              </>
            )}
            {['HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'TICKETED'].includes(b.status) && (
              <Button variant="secondary" onClick={() => download('reservation')}>
                <Download /> Reservation
              </Button>
            )}
            {['HELD', 'PAYMENT_PENDING'].includes(b.status) && (
              <Button variant="secondary" onClick={() => setExtensionOpen(true)}>
                <Clock /> Request extension
              </Button>
            )}
            {b.invoice && (
              <Button asChild variant="secondary">
                <Link to={`/invoices/${b.invoice.id}`}>
                  <FileText /> Invoice {b.invoice.number}
                </Link>
              </Button>
            )}
            {b.status === 'TICKETED' && (
              <Button variant="danger-outline" onClick={() => setRefundOpen(true)}>
                <XCircle /> Request refund
              </Button>
            )}
            {b.canCancel && (
              <Button variant="danger-outline" onClick={() => setCancelOpen(true)}>
                <XCircle /> Cancel booking
              </Button>
            )}
          </>
        }
      />

      {INVENTORY_PROGRESS_INDEX[b.status] !== undefined && (
        <Card className="mb-5 px-5 py-4">
          <Stepper steps={INVENTORY_PROGRESS} current={INVENTORY_PROGRESS_INDEX[b.status]!} />
        </Card>
      )}

      <div className="mb-5 space-y-3">
        {showCountdown && deadline && (
          <Alert
            tone={new Date(deadline).getTime() - Date.now() < 15 * 60_000 ? 'danger' : 'warning'}
            title={
              <span className="flex items-center gap-2">
                <Timer className="size-4" />
                {b.status === 'HELD' ? 'Seats held until' : 'Payment due by'}{' '}
                <Countdown until={deadline} />
              </span>
            }
          >
            {b.status === 'HELD'
              ? 'Confirm payment before the hold expires or the seats will be released automatically.'
              : 'Complete payment before the deadline or the hold will expire.'}
          </Alert>
        )}
        {canEditPax && (
          <Alert tone="warning" title="Passenger details needed">
            Add passport details for {totalPax} passenger{totalPax > 1 ? 's' : ''} before ticketing
            — you can do this any time before the booking is ticketed.
          </Alert>
        )}
        {b.status === 'EXPIRED_HOLD' && (
          <Alert tone="danger" title="Hold expired">
            The seat hold expired before payment was completed. Contact GNK Connect if you still
            need these seats.
          </Alert>
        )}
        {b.status === 'CONFIRMED' && (
          <Alert tone="success">Confirmed with the airline. Ticketing is in progress.</Alert>
        )}
        {b.status === 'TICKETED' && (
          <Alert tone="success">Ticketed — download the confirmation for your records.</Alert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Trip" icon={<Plane className="size-4" />} />
            <CardBody className="space-y-4">
              <KeyValue
                columns={3}
                items={[
                  { label: 'Group', value: b.title, wide: true },
                  { label: 'Sector', value: b.sector },
                  { label: 'Airline', value: b.airline },
                  {
                    label: 'PNR',
                    value: b.pnr ? (
                      <span className="flex items-center gap-1 font-mono">
                        {b.pnr}
                        <CopyButton value={b.pnr} label="" />
                      </span>
                    ) : confirmed ? (
                      '—'
                    ) : (
                      'Issued on confirmation'
                    ),
                  },
                  { label: 'Departure', value: formatDate(b.departureDate, 'weekday') },
                  { label: 'Return', value: formatDate(b.returnDate, 'weekday') },
                  { label: 'Baggage', value: b.baggage },
                ]}
              />
              {(b.outbound || b.inbound) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3">
                  <FlightLeg leg={b.outbound} dir="out" />
                  <FlightLeg leg={b.inbound} dir="in" />
                </div>
              )}
            </CardBody>
          </Card>

          {canEditPax ? (
            <InventoryPassengersForm booking={b} onSaved={onSaved} />
          ) : (
            <PassengersTable booking={b} />
          )}

          <ConcessionsCard
            booking={b}
            requests={concessions.data ?? []}
            open={concessionOpen}
            onOpenChange={setConcessionOpen}
          />

          {b.agentNotes && (
            <Card>
              <CardHeader title="Your notes" />
              <CardBody className="whitespace-pre-line text-sm">{b.agentNotes}</CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Fare" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  {b.bookedAdults
                    ? `${b.bookedAdults} adult${b.bookedAdults > 1 ? 's' : ''}`
                    : null}
                  {b.bookedChildren
                    ? `, ${b.bookedChildren} child${b.bookedChildren > 1 ? 'ren' : ''}`
                    : ''}
                  {b.bookedInfants
                    ? `, ${b.bookedInfants} infant${b.bookedInfants > 1 ? 's' : ''}`
                    : ''}
                </span>
              </div>
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
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <Money value={b.totalPrice} className="text-lg font-semibold" />
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Payment</span>
                <StatusBadge status={b.paymentState} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center justify-between gap-2 py-3">
              <span className="text-sm text-muted-foreground">
                Need more seats for kids or infants?
              </span>
              <Button size="sm" variant="secondary" onClick={() => setConcessionOpen(true)}>
                <Gift /> Request concession
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Status history" />
            <CardBody>
              <Timeline items={timeline} />
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${b.reference}?`}
        description="The held/confirmed seats will be released. This can't be undone."
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

      <ConfirmDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title={`Request a refund for ${b.reference}?`}
        description="Our team will review this and get back to you. Seats stay ticketed until the refund is approved."
        confirmLabel="Request refund"
        tone="danger"
        reasonLabel="Reason"
        onConfirm={async (reason) => {
          try {
            await requestRefund.mutateAsync(reason);
          } catch (e) {
            throw new Error(errorMessage(e), { cause: e });
          }
        }}
      />

      <ExtensionRequestDialog
        open={extensionOpen}
        onOpenChange={setExtensionOpen}
        onSubmit={(dto) => requestExtension.mutate(dto)}
        loading={requestExtension.isPending}
      />

      <EmailTicketDialog
        open={emailTicketOpen}
        onOpenChange={setEmailTicketOpen}
        defaultEmail={session?.user?.email}
        onSubmit={(to) => emailTicket.mutate(to)}
        loading={emailTicket.isPending}
      />
    </>
  );
}

function EmailTicketDialog({
  open,
  onOpenChange,
  defaultEmail,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEmail?: string;
  onSubmit: (to?: string) => void;
  loading: boolean;
}) {
  const [to, setTo] = useState('');
  useEffect(() => {
    if (open) setTo(defaultEmail ?? '');
  }, [open, defaultEmail]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Email e-ticket"
      description="We'll send the e-ticket PDF to this address. Leave blank to notify your account's default recipients."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(to.trim() || undefined)} loading={loading}>
            <Mail /> Send
          </Button>
        </>
      }
    >
      <Field label="Recipient email (optional)">
        <Input
          type="email"
          placeholder="agent@example.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </Field>
    </Dialog>
  );
}

function ExtensionRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (dto: { minutes: number; reason?: string }) => void;
  loading: boolean;
}) {
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) {
      setMinutes(60);
      setReason('');
    }
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request more time"
      description="GNK Connect will review and extend your hold or payment deadline if possible."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ minutes, reason: reason.trim() || undefined })}
            loading={loading}
          >
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Extra time needed">
          <Select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={240}>4 hours</option>
            <option value={1440}>24 hours</option>
          </Select>
        </Field>
        <Field label="Reason (optional)">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function ConcessionsCard({
  booking: b,
  requests,
  open,
  onOpenChange,
}: {
  booking: BookingDetailDto;
  requests: BookingConcessionRequestDto[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<'CHILD_SEATS' | 'INFANT_SEATS' | 'DISCOUNT'>('CHILD_SEATS');
  const [seats, setSeats] = useState(1);
  const [reason, setReason] = useState('');

  const request = useMutation({
    mutationFn: () =>
      api.bookings.requestConcession(b.id, {
        kind,
        requestedChildSeats: kind === 'CHILD_SEATS' ? seats : undefined,
        requestedInfantSeats: kind === 'INFANT_SEATS' ? seats : undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Concession request sent');
      void qc.invalidateQueries({ queryKey: [...keys.booking(b.id), 'concessions'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  useEffect(() => {
    if (open) {
      setKind('CHILD_SEATS');
      setSeats(1);
      setReason('');
    }
  }, [open]);

  return (
    <>
      {requests.length > 0 && (
        <Card>
          <CardHeader title="Concession requests" icon={<Gift className="size-4" />} />
          <DataTable
            rowKey={(r) => r.id}
            rows={requests}
            columns={[
              { key: 'kind', header: 'Type', cell: (r) => titleCase(r.kind) },
              {
                key: 'qty',
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
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'at',
                header: 'Requested',
                hideBelow: 'md',
                cell: (r) => formatDateTime(r.createdAt),
              },
            ]}
          />
        </Card>
      )}

      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Request a concession"
        description="Ask GNK Connect for extra child or infant seats on this booking."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={request.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => request.mutate()} loading={request.isPending}>
              Send request
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="CHILD_SEATS">Extra child seats</option>
              <option value="INFANT_SEATS">Extra infant seats</option>
            </Select>
          </Field>
          <Field label="Seats requested">
            <Input
              type="number"
              min={1}
              max={50}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </Field>
          <Field label="Reason (optional)">
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

function InventoryPassengersForm({
  booking,
  onSaved,
}: {
  booking: BookingDetailDto;
  onSaved: (b: BookingDetailDto) => void;
}) {
  const toast = useToast();
  const [formError, setFormError] = useState<string>();
  const [scanIndex, setScanIndex] = useState<number | null>(null);
  const slots: PassengerInput['type'][] = [
    ...Array.from({ length: booking.bookedAdults ?? 0 }, () => 'ADULT' as const),
    ...Array.from({ length: booking.bookedChildren ?? 0 }, () => 'CHILD' as const),
    ...Array.from({ length: booking.bookedInfants ?? 0 }, () => 'INFANT' as const),
  ];
  const total = slots.length || booking.seats;

  const form = useForm<PaxFormValues>({
    resolver: zodResolver(
      z.object({
        passengers: z.array(passengerSchema).min(1).max(MAX_SEATS_PER_BOOKING),
      }),
    ),
    defaultValues: {
      passengers: slots.length
        ? slots.map(blankPax)
        : Array.from({ length: total }, () => blankPax()),
    },
    mode: 'onTouched',
  });
  const { control, register, handleSubmit, setValue, setError, formState } = form;
  const { fields, replace } = useFieldArray({ control, name: 'passengers' });
  const errors = formState.errors;

  useEffect(() => {
    replace(slots.length ? slots.map(blankPax) : Array.from({ length: total }, () => blankPax()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.bookedAdults, booking.bookedChildren, booking.bookedInfants, total, replace]);

  const save = useMutation({
    mutationFn: (passengers: PassengerInput[]) =>
      api.bookings.setPassengers(booking.id, { passengers }),
    onSuccess: (b) => {
      onSaved(b);
      toast.success('Passenger details saved');
    },
    onError: (e) => {
      setFormError(applyServerErrors(e, setError));
      toast.error(errorMessage(e));
    },
  });

  const applyOcrResult = (i: number, data: PassportOcrExtraction) => {
    if (data.lastName)
      setValue(`passengers.${i}.lastName`, data.lastName.toUpperCase(), {
        shouldValidate: true,
      });
    if (data.firstName)
      setValue(
        `passengers.${i}.firstName`,
        [data.firstName, data.middleName].filter(Boolean).join(' ').toUpperCase(),
        { shouldValidate: true },
      );
    if (data.passportNumber)
      setValue(`passengers.${i}.passportNumber`, data.passportNumber.toUpperCase(), {
        shouldValidate: true,
      });
    if (data.dateOfBirth)
      setValue(`passengers.${i}.dateOfBirth`, data.dateOfBirth, { shouldValidate: true });
    if (data.passportExpiry)
      setValue(`passengers.${i}.passportExpiry`, data.passportExpiry, { shouldValidate: true });
    if (data.nationalityCode)
      setValue(`passengers.${i}.nationality`, data.nationalityCode, { shouldValidate: true });
    if (data.gender === 'M' || data.gender === 'F')
      setValue(`passengers.${i}.gender`, data.gender === 'M' ? 'MALE' : 'FEMALE', {
        shouldValidate: true,
      });
  };

  return (
    <Card>
      <CardHeader
        title="Add passenger details"
        description={`Enter passport details for all ${total} passenger${total > 1 ? 's' : ''}. You can save and come back before ticketing.`}
        icon={<UserPlus className="size-4" />}
      />
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((v) => {
            setFormError(undefined);
            save.mutate(v.passengers as PassengerInput[]);
          })}
          noValidate
        >
          {formError && <Alert tone="danger">{formError}</Alert>}
          {fields.map((f, i) => {
            const e = errors.passengers?.[i];
            const type = slots[i] ?? 'ADULT';
            return (
              <div
                key={f.id}
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-4">
                  <span className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">
                      Passenger {i + 1} — {titleCase(type)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setScanIndex(i)}
                  >
                    <ScanLine /> Scan passport
                  </Button>
                </div>
                <Field label="Title" required error={e?.title?.message}>
                  <Select
                    {...register(`passengers.${i}.title`, {
                      onChange: (ev) =>
                        setValue(`passengers.${i}.gender`, genderFromTitle(ev.target.value), {
                          shouldValidate: true,
                        }),
                    })}
                  >
                    {TITLES.map((t) => (
                      <option key={t} value={t}>
                        {titleCase(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Surname" required error={e?.lastName?.message}>
                  <Input
                    placeholder="LAST NAME"
                    className="uppercase"
                    autoComplete="off"
                    {...register(`passengers.${i}.lastName`)}
                  />
                </Field>
                <Field label="Given name" required error={e?.firstName?.message}>
                  <Input
                    placeholder="FIRST NAME"
                    className="uppercase"
                    autoComplete="off"
                    {...register(`passengers.${i}.firstName`)}
                  />
                </Field>
                <Field label="Passport" required error={e?.passportNumber?.message}>
                  <MaskedInput
                    mask={formatPassport}
                    placeholder="PASSPORT #"
                    className="uppercase tabular"
                    autoComplete="off"
                    {...register(`passengers.${i}.passportNumber`)}
                  />
                </Field>
                <Field label="Date of birth" required error={e?.dateOfBirth?.message}>
                  <Input type="date" {...register(`passengers.${i}.dateOfBirth`)} />
                </Field>
                <Field label="Passport expiry" required error={e?.passportExpiry?.message}>
                  <Input type="date" {...register(`passengers.${i}.passportExpiry`)} />
                </Field>
                <Field label="Nationality" required error={e?.nationality?.message}>
                  <Select {...register(`passengers.${i}.nationality`)}>
                    {NATIONALITIES.map((n) => (
                      <option key={n.code} value={n.code}>
                        {n.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <input type="hidden" {...register(`passengers.${i}.type`)} />
                <input type="hidden" {...register(`passengers.${i}.gender`)} />
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={save.isPending}>
              Save passengers
            </Button>
          </div>
        </form>
      </CardBody>

      <PassportScanDialog
        open={scanIndex !== null}
        onOpenChange={(v) => !v && setScanIndex(null)}
        onExtracted={(data) => {
          if (scanIndex !== null) applyOcrResult(scanIndex, data);
        }}
      />
    </Card>
  );
}

/** "Scan passport" via pasted OCR/MRZ text — fills a passenger row's fields from the result.
 *  A future client-side scan (see `@/lib/passport-ocr`'s `loadTesseract`) could skip the paste
 *  step once `tesseract.js` is added to the portal's dependencies. */
function PassportScanDialog({
  open,
  onOpenChange,
  onExtracted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExtracted: (data: PassportOcrExtraction) => void;
}) {
  const toast = useToast();
  const [text, setText] = useState('');

  const extract = useMutation({
    mutationFn: () => extractPassportFromPastedText(text),
    onSuccess: (data) => {
      onExtracted(data);
      onOpenChange(false);
      toast.success('Passport details extracted — please double-check before saving');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  useEffect(() => {
    if (open) setText('');
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Scan passport"
      description="Paste the passport's MRZ lines (the two rows of letters/numbers at the bottom of the photo page) or other OCR text — we'll pull out the name, passport number, and dates."
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={extract.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => extract.mutate()}
            loading={extract.isPending}
            disabled={text.trim().length < 10}
          >
            Extract details
          </Button>
        </>
      }
    >
      <Textarea
        rows={6}
        placeholder={
          'P<PAKKHAN<<MUHAMMAD<<<<<<<<<<<<<<<<<<<<<<<<\nAB1234567PAK8501014M3001012<<<<<<<<<<<<<<04'
        }
        className="font-mono text-xs uppercase"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </Dialog>
  );
}
