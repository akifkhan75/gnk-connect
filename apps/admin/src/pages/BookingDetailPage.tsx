import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Baby,
  Check,
  ChevronDown,
  CircleDot,
  Clock,
  Download,
  Eye,
  FileText,
  Minus,
  Pencil,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Ticket,
  Timer,
  Users,
  XCircle,
} from 'lucide-react';
import {
  genderFromTitle,
  MAX_SEATS_PER_BOOKING,
  maxInfantSeatsForAdults,
  partyFromSeats,
  seatDiscountTotal,
  titlesForType,
  validatePassengerList,
  type PassengerInput,
  type RequestConcessionInput,
} from '@gnk/validation';
import {
  GENDERS,
  TITLES,
  type AdminBookingDetailDto,
  type ConcessionDto,
  type ConcessionType,
} from '@gnk/types';
import {
  Alert,
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  Checkbox,
  ConfirmDialog,
  CopyButton,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  Input,
  KeyValue,
  Money,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
  Timeline,
  cn,
  formatDate,
  formatDateTime,
  formatMoney,
  formatRelative,
  statusLabel,
  statusTone,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import {
  applyFieldIssues,
  applyServerErrors,
  errorMessage,
  focusFirstIssue,
  passengerFormError,
} from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';
import { PassengerRows } from '@/components/PassengerEditor';

const LIFECYCLE = ['Quoted', 'Payment Pending', 'Seats Confirmed', 'Ticketed'] as const;
const HOLD_OPEN = ['PENDING_APPROVAL', 'APPROVED'];
const TITLE_LABEL: Record<(typeof TITLES)[number], string> = {
  MR: 'Mr',
  MRS: 'Mrs',
  MS: 'Ms',
  MISS: 'Miss',
  MSTR: 'Master',
};

const AIRPORTS: Record<string, string> = {
  ISB: 'Islamabad',
  LHE: 'Lahore',
  KHI: 'Karachi',
  PEW: 'Peshawar',
  JED: 'Jeddah',
  MED: 'Madinah',
  RUH: 'Riyadh',
  DXB: 'Dubai',
  AUH: 'Abu Dhabi',
  SHJ: 'Sharjah',
  DOH: 'Doha',
  MCT: 'Muscat',
};

const AIRLINES: Record<string, string> = {
  PIA: 'PIA',
  PK: 'PIA',
  SV: 'Saudia',
  PA: 'airblue',
  EK: 'Emirates',
  FZ: 'flydubai',
  QR: 'Qatar Airways',
  EY: 'Etihad',
  G9: 'Air Arabia',
};

function esc(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function airportLabel(code: string) {
  const city = AIRPORTS[code] ?? code;
  return `${city} (${code})`;
}

function airlineName(code: string | null | undefined) {
  if (!code) return 'GNK Connect';
  return AIRLINES[code] ?? AIRLINES[code.toUpperCase()] ?? code;
}

function formatTicketDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  })
    .format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:00` : value))
    .replace(',', '');
}

function formatTicketDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('day')} ${g('month')} ${g('year')}, ${g('hour')}:${g('minute')}`;
}

function lifecycleIndex(b: AdminBookingDetailDto) {
  if (b.status === 'COMPLETED') return 3;
  if (b.status === 'CONFIRMED') return 2;
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
  if (!expiresAt) return { expired: false, live: false, label: '' };
  const ms = new Date(expiresAt).getTime() - now;
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    expired: ms <= 0,
    live: ms > 0,
    label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

function addMinutes(iso: string | null | undefined, minutes: number) {
  const base = iso ? new Date(iso).getTime() : Date.now();
  return new Date(base + minutes * 60_000).toISOString();
}

function blankPax(type: PassengerInput['type']): PassengerInput {
  const title = type === 'ADULT' ? 'MR' : 'MSTR';
  return {
    type,
    title,
    firstName: '',
    lastName: '',
    gender: genderFromTitle(title),
    dateOfBirth: '',
    nationality: 'PK',
    passportNumber: '',
    passportExpiry: '',
  };
}

function buildPassengers(adults: number, children: number, infants: number): PassengerInput[] {
  return [
    ...Array.from({ length: adults }, () => blankPax('ADULT')),
    ...Array.from({ length: children }, () => blankPax('CHILD')),
    ...Array.from({ length: infants }, () => blankPax('INFANT')),
  ];
}

function printHtml(title: string, body: string) {
  const html = body.includes('<!doctype')
    ? body
    : `<!doctype html><html><head><title>${title}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;margin:32px;color:#111827}
  h1{font-size:22px;margin:0 0 4px}
  .muted{color:#6b7280;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{border-bottom:1px solid #e5e7eb;text-align:left;padding:8px;font-size:13px}
  th{color:#6b7280;font-weight:600}
</style></head><body>${body}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', title);
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  const cleanup = () => iframe.remove();
  if (!win || !doc) {
    cleanup();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  win.onafterprint = cleanup;
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(cleanup, 1500);
    }
  };
  if (doc.readyState === 'complete') requestAnimationFrame(trigger);
  else iframe.onload = () => requestAnimationFrame(trigger);
  return true;
}

function reservationDocument(
  b: AdminBookingDetailDto,
  opts: { holding: boolean; issuedBy: string; passports: Record<string, string> },
) {
  const brand = airlineName(b.airline);
  const sector = (b.sector ?? '').split('-');
  const outbound = b.outbound ?? {
    flightNo: '',
    from: sector[0] || '',
    to: sector[1] || '',
    departTime: '',
    arriveTime: '',
  };
  const inbound = b.inbound;
  const onHold = opts.holding;
  const status = onHold ? '(on hold)' : statusLabel(b.status);
  const paxRows =
    b.passengers.length > 0
      ? b.passengers
      : Array.from({ length: Math.max(1, b.seats) }, () => null);
  const flightBlock = (
    n: number,
    leg: { flightNo: string; from: string; to: string; departTime: string; arriveTime: string },
    date: string | null,
  ) => `
    <h2>Flight ${n} - ${esc(airportLabel(leg.from))} to ${esc(airportLabel(leg.to))}</h2>
    <table class="grid">
      <thead><tr><th>Airline</th><th>Flight #</th><th>Departure</th><th>Arrival</th></tr></thead>
      <tbody>
        <tr>
          <td>${esc(brand)}</td>
          <td>${esc(leg.flightNo || '—')}</td>
          <td>
            <strong>${esc(leg.departTime || '—')}</strong><br/>
            ${esc(airportLabel(leg.from))}<br/>
            ${esc(formatTicketDate(date))}
          </td>
          <td>
            <strong>${esc(leg.arriveTime || '—')}</strong><br/>
            ${esc(airportLabel(leg.to))}<br/>
            ${esc(formatTicketDate(date))}
          </td>
        </tr>
      </tbody>
    </table>
    <p class="bag">Baggage: ${esc(b.baggage || '—')}</p>`;
  return `<!doctype html><html><head><title>Reservation ${esc(b.reference)}</title>
<style>
  @page{size:A4;margin:12mm}
  *{box-sizing:border-box}
  body{margin:0;color:#111827;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:13px}
  .sheet{width:190mm}
  .brand{display:flex;align-items:center;justify-content:space-between;background:#0f6f6a;color:#fff;padding:14px 20px}
  .brand-name{font-size:22px;font-weight:500;letter-spacing:-.02em}
  .plane{opacity:.95}
  h1{margin:22px 0 16px;text-align:center;font-size:22px;font-weight:600}
  .facts{background:#0f6f6a;color:#fff;padding:14px 20px 16px}
  .facts dl{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:7px 24px;margin:0}
  .facts dt{opacity:.92}
  .facts dd{margin:0;font-weight:600;text-align:right}
  .hold{color:#ff6b6b;font-weight:700}
  h2{margin:22px 0 0;padding:8px 12px;background:#0f6f6a;color:#fff;font-size:13px;font-weight:600}
  table{width:100%;border-collapse:collapse}
  .grid th,.pax th{background:#0f6f6a;color:#fff;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;text-align:left;padding:8px 10px}
  .grid td{padding:10px;vertical-align:top;border-bottom:1px solid #e5e7eb}
  .grid td strong{font-size:16px}
  .bag{margin:8px 12px 0;color:#374151}
  .pax{margin-top:0}
  .pax td{padding:8px 10px;border-bottom:1px solid #e5e7eb}
  .terms{padding:0 4px 8px}
  .terms ol{margin:8px 0 0;padding-left:18px;color:#374151;line-height:1.55}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="sheet">
  <div class="brand">
    <div class="brand-name">${esc(brand)}</div>
    <svg class="plane" width="40" height="40" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M44 22 28 24.2 20 10h-3.2L21 24.2H10L5 19H2l4 6-4 6h3l5-5h11L16.8 38H20l8-14.2L44 26v-4z"/></svg>
  </div>
  <h1>Electronic Ticket Reservation</h1>
  <div class="facts">
    <dl>
      <dt>Booking Reference Number (PNR)</dt><dd>${esc(b.pnr || b.supplierBookingRef || '—')}</dd>
      <dt>Booking ID</dt><dd>${esc(b.reference)}</dd>
      <dt>Issued By</dt><dd>${esc(opts.issuedBy)}</dd>
      <dt>Agent Name</dt><dd>${esc(b.account.name)}</dd>
      <dt>Status</dt><dd class="${onHold ? 'hold' : ''}">${esc(status)}</dd>
      <dt>Expires</dt><dd>${esc(onHold ? formatTicketDateTime(b.holdExpiresAt) : '—')}</dd>
    </dl>
  </div>
  ${flightBlock(1, outbound, b.departureDate)}
  ${inbound ? flightBlock(2, inbound, b.returnDate) : ''}
  <h2>Passenger Information</h2>
  <table class="pax">
    <thead><tr><th>Sr #</th><th>Passenger Name</th><th>Ticket No</th><th>Passport #</th><th>Type</th><th>Meal</th></tr></thead>
    <tbody>${paxRows
      .map((p, i) => {
        const name = p
          ? `${TITLE_LABEL[p.title] ?? p.title} ${p.firstName} ${p.lastName}`.trim()
          : 'NTBA';
        const passport = p ? (opts.passports[p.id] ?? p.passportMasked) : '—';
        return `<tr><td>${i + 1}</td><td>${esc(name || 'NTBA')}</td><td>—</td><td>${esc(passport || '—')}</td><td>${esc(p ? titleCase(p.type) : '—')}</td><td>—</td></tr>`;
      })
      .join('')}</tbody>
  </table>
  <h2>Terms &amp; Conditions</h2>
  <div class="terms">
    <ol>
      <li>Passenger should report at check-in counter at least 04:00 hours prior to flight.</li>
      <li>Tickets are non-refundable and non-changeable any time.</li>
    </ol>
  </div>
</div>
</body></html>`;
}

function partyCounts(b: AdminBookingDetailDto) {
  const adultsFilled = b.passengers.filter((p) => p.type === 'ADULT').length;
  const childrenFilled = b.passengers.filter((p) => p.type === 'CHILD').length;
  const infantsFilled = b.passengers.filter((p) => p.type === 'INFANT').length;
  const childSeats = b.childSeats ?? 0;
  const infantSeats = b.infantSeats ?? 0;
  const adultSlots = b.seats - childSeats;
  return {
    adultsFilled,
    childrenFilled,
    infantsFilled,
    childSeats,
    infantSeats,
    adultSlots,
    remainingAdults: Math.max(0, adultSlots - adultsFilled),
    remainingChildren: Math.max(0, childSeats - childrenFilled),
    remainingInfants: Math.max(0, infantSeats - infantsFilled),
    seatedRemaining: Math.max(0, b.seats - adultsFilled - childrenFilled),
    slots: b.seats + infantSeats,
    added: b.passengers.length,
  };
}

export function BookingDetailPage() {
  return (
    <RequirePerm perm="bookings:read">
      <BookingDetail />
    </RequirePerm>
  );
}

function BookingDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const can = useCan();
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<null | 'reject' | 'cancel' | 'approve' | 'push' | 'hold'>(
    null,
  );
  const [grant, setGrant] = useState<ConcessionType | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<null | 'all' | string>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => api.bookings.get(id) });
  useEffect(() => setNotes(q.data?.internalNotes ?? ''), [q.data?.internalNotes]);
  const clock = useHoldClock(q.data?.holdExpiresAt);

  const onDone = (b: AdminBookingDetailDto, message: string) => {
    qc.setQueryData(['booking', id], b);
    void qc.invalidateQueries({ queryKey: ['bookings'] });
    void qc.invalidateQueries({ queryKey: ['booking-counts'] });
    void qc.invalidateQueries({ queryKey: ['queues'] });
    void qc.invalidateQueries({ queryKey: ['concessions'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
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
          'See Additional details for the supplier call log.',
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

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;

  const b = q.data;
  const has = (a: AdminBookingDetailDto['allowedActions'][number]) => b.allowedActions.includes(a);
  const shortfall = b.totalPrice - b.balance.availableFunds;
  const run = (action: string, reason?: string) => act.mutateAsync({ action, reason });
  const holding = HOLD_OPEN.includes(b.status) && b.paymentState !== 'PAID';
  const party = partyCounts(b);
  const remaining = party.seatedRemaining + party.remainingInfants;
  const canAddPax = can('bookings:approve') && HOLD_OPEN.includes(b.status) && remaining > 0;
  const canEditPax =
    can('bookings:approve') && HOLD_OPEN.includes(b.status) && b.passengers.length > 0;
  const canGrant = can('bookings:approve') && HOLD_OPEN.includes(b.status);
  const concessions = b.concessions ?? {
    grantedChildSeats: 0,
    grantedInfantSeats: 0,
    discountAmount: 0,
    requests: [],
    canRequestChild: false,
    canRequestInfant: false,
    canRequestDiscount: false,
  };
  const adults = b.seats - (b.childSeats ?? 0);
  const maxInfant = Math.max(0, maxInfantSeatsForAdults(adults) - (b.infantSeats ?? 0));
  const pending = (type: ConcessionType) =>
    concessions.requests.some((r) => r.type === type && r.status === 'PENDING');
  const confirmAction = has('approve')
    ? can('bookings:push_supplier') && shortfall <= 0
      ? 'approve_push'
      : 'approve'
    : has('retry_push')
      ? 'retry_push'
      : has('push')
        ? 'push'
        : null;

  const exportManifest = () => {
    downloadCsv(`${b.reference}-manifest.csv`, [
      [
        'Type',
        'Title',
        'First name',
        'Last name',
        'Gender',
        'Date of birth',
        'Nationality',
        'Passport',
        'Expiry',
      ],
      ...b.passengers.map((p) => [
        p.type,
        p.title,
        p.firstName,
        p.lastName,
        p.gender,
        p.dateOfBirth,
        p.nationality,
        revealed[p.id] ?? p.passportMasked,
        p.passportExpiry,
      ]),
    ]);
    toast.success('Manifest exported');
  };

  const printReservation = () => {
    const ok = printHtml(
      `Reservation ${b.reference}`,
      reservationDocument(b, {
        holding,
        issuedBy: session?.user.fullName || 'GNK Connect',
        passports: revealed,
      }),
    );
    if (!ok) toast.error('Could not open the print dialog');
  };

  const printManifest = () => {
    const ok = printHtml(
      `Passenger manifest ${b.reference}`,
      `<h1>Passenger manifest</h1>
      <p class="muted">${b.reference} · ${b.title} · ${formatDate(b.departureDate)}</p>
      <table><thead><tr><th>#</th><th>Name</th><th>Type</th><th>DOB</th><th>Nationality</th><th>Passport</th><th>Expiry</th></tr></thead>
      <tbody>${
        b.passengers.length
          ? b.passengers
              .map(
                (p, i) =>
                  `<tr><td>${i + 1}</td><td>${titleCase(p.title)} ${p.firstName} ${p.lastName}</td><td>${titleCase(p.type)}</td><td>${formatDate(p.dateOfBirth)}</td><td>${p.nationality}</td><td>${revealed[p.id] ?? p.passportMasked}</td><td>${formatDate(p.passportExpiry)}</td></tr>`,
              )
              .join('')
          : '<tr><td colspan="7">No passengers listed yet.</td></tr>'
      }</tbody></table>`,
    );
    if (!ok) toast.error('Could not open the print dialog');
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[{ label: 'Bookings', onClick: () => navigate('/bookings') }, { label: 'Detail' }]}
      />

      <div className="space-y-3">
        <div className="flex min-w-0 items-center gap-x-3 overflow-x-auto whitespace-nowrap">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] tabular">{b.reference}</h1>
          <CopyButton value={b.reference} label="Copy" />
          <StatusBadge
            status={holding ? 'PENDING' : b.status}
            label={holding ? 'Payment Pending' : undefined}
          />
          <span className="text-sm text-muted-foreground">
            {party.added} / {party.slots} passenger{party.slots === 1 ? '' : 's'}
          </span>
          <span className="text-sm text-muted-foreground">{formatRelative(b.createdAt)}</span>
          {clock.live && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Live
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {confirmAction && (
            <Button
              size="sm"
              onClick={() =>
                confirmAction === 'approve_push'
                  ? void run('approve_push')
                  : setDialog(confirmAction === 'approve' ? 'approve' : 'push')
              }
              loading={act.isPending}
            >
              <Check /> Confirm Booking
            </Button>
          )}
          {canGrant && holding && (
            <Button size="sm" variant="secondary" onClick={() => setDialog('hold')}>
              <Clock /> Adjust payment deadline
            </Button>
          )}
          {has('reject') && (
            <Button size="sm" variant="danger-outline" onClick={() => setDialog('reject')}>
              Reject
            </Button>
          )}
          {has('cancel') && (
            <Button size="sm" variant="danger-outline" onClick={() => setDialog('cancel')}>
              Cancel
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={printReservation}>
            <Printer /> Print Reservation
          </Button>
          <Button size="sm" variant="secondary" onClick={exportManifest}>
            <Download /> Export manifest
          </Button>
          <Button size="sm" variant="secondary" onClick={printManifest}>
            <FileText /> Download Passenger Manifest
          </Button>
          {has('sync_status') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void run('sync_status')}
              loading={act.isPending}
            >
              <RefreshCw /> Sync status
            </Button>
          )}
          {has('complete') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void run('complete')}
              loading={act.isPending}
            >
              Mark completed
            </Button>
          )}
        </div>
      </div>

      <Owner
        booking={b}
        onChanged={(x) => onDone(x, x.assignedTo ? `Assigned to ${x.assignedTo.name}` : 'Released')}
      />

      {!['REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'EXPIRED'].includes(b.status) && (
        <Lifecycle current={lifecycleIndex(b)} />
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
              Short by <Money value={shortfall} className="font-semibold" />. Confirm / supplier
              push stays blocked until they deposit.
            </>
          )}
        </Alert>
      )}
      {b.status === 'REJECTED' && b.rejectionReason && (
        <Alert tone="danger" title="Rejected">
          {b.rejectionReason}
        </Alert>
      )}

      <HoldBanner booking={b} clock={clock} />

      <ConcessionsCard
        booking={b}
        canGrant={canGrant}
        canReview={can('bookings:approve')}
        maxInfant={maxInfant}
        pending={pending}
        initialReviewId={params.get('review')}
        onReviewConsumed={() => {
          if (!params.has('review')) return;
          const next = new URLSearchParams(params);
          next.delete('review');
          setParams(next, { replace: true });
        }}
        onGrant={setGrant}
        onChanged={onDone}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Financial summary
            </p>
            <Line label={`Adult (${adults}×)`} value={b.unitPrice * adults} />
            {(b.childSeats ?? 0) > 0 && (
              <Line label={`Child (${b.childSeats}×)`} value={b.unitPrice * b.childSeats} />
            )}
            {(b.infantSeats ?? 0) > 0 && <Line label={`Infant (${b.infantSeats}×)`} value={0} />}
            <Line label="Taxes" value={0} />
            {concessions.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span>
                <Money value={-concessions.discountAmount} decimals signed />
              </div>
            )}
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="font-semibold">Booking value</span>
              <Money value={b.totalPrice} className="text-lg font-semibold" decimals />
            </div>
            <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Settlement
            </p>
            <Line label="Paid" value={b.amountPaid} dashZero />
            <Line label="Outstanding" value={Math.max(0, b.totalPrice - b.amountPaid)} dashZero />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice</span>
              {b.invoice ? (
                <Link to={`/invoices/${b.invoice.id}`} className="text-link hover:underline">
                  {b.invoice.number}
                </Link>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Supplier receipt</span>
              <span>{b.supplierBookingRef ?? '—'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              All amounts in PKR · {statusLabel(b.paymentState)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Booking details
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Detail label="Reference" value={b.reference} mono />
              <Detail
                label="Agency ID"
                value={
                  <Link to={`/partners/${b.account.id}`} className="text-link hover:underline">
                    {b.account.code}
                  </Link>
                }
              />
              <Detail label="Currency" value="PKR" />
              <Detail
                label="Booking status"
                value={
                  <StatusBadge
                    status={holding ? 'PENDING' : b.status}
                    label={holding ? 'Payment Pending' : undefined}
                  />
                }
              />
              <Detail
                label="Payment status"
                value={
                  <StatusBadge
                    status={holding ? 'PENDING' : b.paymentState}
                    label={holding ? 'Payment Pending' : undefined}
                  />
                }
              />
              <Detail
                label="Amount payable"
                value={<Money value={Math.max(0, b.totalPrice - b.amountPaid)} decimals />}
              />
              <Detail label="Created" value={formatDateTime(b.createdAt)} />
              <Detail label="Payment deadline" value={formatDateTime(b.holdExpiresAt)} />
              <Detail
                label="PNR"
                value={
                  b.pnr ? (
                    <span className="font-mono">{b.pnr}</span>
                  ) : (
                    `${b.seats} seat${b.seats === 1 ? '' : 's'} (${HOLD_OPEN.includes(b.status) || ['SUBMITTED_TO_SUPPLIER', 'SUPPLIER_PENDING', 'SUPPLIER_FAILED'].includes(b.status) ? `${b.seats} held` : '0 held'} · ${b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? b.seats : 0} confirmed)`
                  )
                }
              />
              <Detail
                label="Assigned at"
                value={b.assignedTo ? formatDateTime(b.createdAt) : '—'}
              />
            </dl>
          </CardBody>
        </Card>
      </div>

      <section className="overflow-hidden rounded-xl bg-surface shadow-card">
        <header className="flex items-center justify-between gap-3 bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-foreground">
          <span className="flex items-center gap-2">
            <Users className="size-4" /> Manage passengers
          </span>
          {(canAddPax || canEditPax) && (
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
                    setAdding(true);
                  }}
                >
                  <Plus /> Add passengers
                </Button>
              )}
            </div>
          )}
        </header>
        <div className="border-b px-5 py-3 text-sm text-muted-foreground">
          {[
            `${party.adultsFilled} of ${party.adultSlots} adult${party.adultSlots === 1 ? '' : 's'} filled`,
            party.childSeats > 0
              ? `${party.childrenFilled} of ${party.childSeats} child${party.childSeats === 1 ? '' : 'ren'} filled`
              : null,
            party.infantSeats > 0
              ? `${party.infantsFilled} of ${party.infantSeats} infant${party.infantSeats === 1 ? '' : 's'} filled`
              : null,
            remaining > 0
              ? `${remaining} slot${remaining === 1 ? '' : 's'} remaining`
              : 'all slots filled',
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
        {editing && canEditPax && (
          <EditPassengersForm
            booking={b}
            passengerIds={editing === 'all' ? b.passengers.map((p) => p.id) : [editing]}
            onSaved={(next) => {
              onDone(next, editing === 'all' ? 'Passengers updated' : 'Passenger updated');
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
        {b.passengers.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-warning-soft text-warning">
              <Users className="size-4" />
            </div>
            <p className="text-sm font-semibold">Passenger details pending</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add travellers to complete the manifest.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Chip>{b.seats} seat</Chip>
              <Chip>{party.adultSlots} A</Chip>
              <Chip>{party.childSeats} C</Chip>
              <Chip>{party.infantSeats} I</Chip>
              <Chip>{party.added} added</Chip>
              <Chip>{remaining} left</Chip>
            </div>
          </div>
        ) : (
          <DataTable
            dense
            rows={b.passengers}
            rowKey={(p) => p.id}
            selectedKey={editing && editing !== 'all' ? editing : undefined}
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
        )}
      </section>

      <Accordion
        title="Additional details"
        hint="Finance documents, supplier receipts, and payment status"
      >
        <div className="space-y-5">
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
              <p className="text-xs text-muted-foreground sm:col-span-3">
                Rules applied:{' '}
                {((b.priceAudit.snapshot as { applied?: { name: string }[] })?.applied ?? [])
                  .map((r) => r.name)
                  .join(' + ') || '—'}{' '}
                · quoted {formatDateTime(b.priceAudit.quotedAt)}
              </p>
            </div>
          )}
          {b.agentNotes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Partner notes
              </p>
              <p className="whitespace-pre-line text-sm">{b.agentNotes}</p>
            </div>
          )}
          {can('bookings:approve') && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Internal notes
              </p>
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
            </div>
          )}
          {b.payments.length > 0 && (
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
          )}
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
          {b.supplierCalls.length > 0 && (
            <ul className="divide-y rounded-lg border text-[13px]">
              {b.supplierCalls.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
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
                      {JSON.stringify(
                        { request: c.requestBody, response: c.responseBody },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Accordion>

      <Accordion
        title="Group information"
        hint={[
          b.airline,
          `${formatDate(b.departureDate)} – ${formatDate(b.returnDate)}`,
          `${b.seats} seat${b.seats === 1 ? '' : 's'}`,
          b.pnr ? `PNR ${b.pnr}` : null,
          b.sector,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <KeyValue
          columns={3}
          items={[
            { label: 'Group', value: b.title, wide: true },
            { label: 'Sector', value: b.sector },
            { label: 'Airline', value: b.airline },
            { label: 'Supplier', value: b.supplierName },
            { label: 'Supplier ref', value: b.supplierBookingRef },
            { label: 'Baggage', value: b.baggage },
            { label: 'Booked by', value: b.createdByName },
            {
              label: 'Partner',
              value: (
                <Link to={`/partners/${b.account.id}`} className="text-link hover:underline">
                  {b.account.name}
                </Link>
              ),
            },
            { label: 'Contact', value: `${b.account.phone} · ${b.account.email}` },
          ]}
        />
      </Accordion>

      {grant && (
        <GrantDialog
          booking={b}
          type={grant}
          onClose={() => setGrant(null)}
          onSaved={(next) => {
            onDone(next, 'Concession granted');
            setGrant(null);
          }}
        />
      )}

      {adding && (
        <AddPassengersDialog
          booking={b}
          onClose={() => setAdding(false)}
          onSaved={(next) => {
            onDone(next, 'Passenger details saved');
            setAdding(false);
          }}
        />
      )}

      <HoldDialog
        booking={b}
        open={dialog === 'hold'}
        onOpenChange={(o) => !o && setDialog(null)}
        onSaved={(next) => {
          onDone(next, 'Payment deadline updated');
          setDialog(null);
        }}
      />
      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Confirm ${b.reference}?`}
        description="We'll check live availability with the supplier first. The partner is notified."
        confirmLabel="Confirm booking"
        reasonLabel="Note to partner (optional)"
        reasonRequired={false}
        onConfirm={(r) => run('approve', r)}
      />
      <ConfirmDialog
        open={dialog === 'push'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Send to supplier?"
        description={`This books ${b.seats} seat(s) with ${b.supplierName} and charges ${b.totalPrice.toLocaleString('en-PK')} PKR to the partner's account when confirmed.`}
        confirmLabel="Confirm booking"
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
          b.status === 'CONFIRMED'
            ? 'The supplier booking is cancelled and the full amount is credited back to the partner. The invoice is voided.'
            : 'Held seats are released.'
        }
        confirmLabel="Cancel booking"
        tone="danger"
        reasonLabel="Reason (sent to partner)"
        onConfirm={(r) => run('cancel', r)}
      />
    </div>
  );
}

function Line({
  label,
  value,
  dashZero,
}: {
  label: string;
  value: number | null;
  dashZero?: boolean;
}) {
  const hide = value == null || (dashZero && value === 0);
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {hide ? <span>—</span> : <Money value={value} decimals />}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('mt-1 font-medium', mono && 'tabular')}>{value}</dd>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold tabular text-muted-foreground">
      {children}
    </span>
  );
}

function Lifecycle({ current }: { current: number }) {
  return (
    <Card className="px-4 py-5 sm:px-8">
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

function HoldBanner({
  booking: b,
  clock,
}: {
  booking: AdminBookingDetailDto;
  clock: { expired: boolean; live: boolean; label: string };
}) {
  const holding = HOLD_OPEN.includes(b.status) && b.paymentState !== 'PAID';
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
  canGrant,
  canReview,
  maxInfant,
  pending,
  initialReviewId,
  onReviewConsumed,
  onGrant,
  onChanged,
}: {
  booking: AdminBookingDetailDto;
  canGrant: boolean;
  canReview: boolean;
  maxInfant: number;
  pending: (type: ConcessionType) => boolean;
  initialReviewId?: string | null;
  onReviewConsumed?: () => void;
  onGrant: (type: ConcessionType) => void;
  onChanged: (b: AdminBookingDetailDto, message: string) => void;
}) {
  const toast = useToast();
  const [review, setReview] = useState<ConcessionDto | null>(null);
  const [seats, setSeats] = useState(1);
  const [pnr, setPnr] = useState('');
  const [adultAmount, setAdultAmount] = useState('');
  const [childAmount, setChildAmount] = useState('');
  const [infantAmount, setInfantAmount] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [error, setError] = useState<string>();
  const [pnrFor, setPnrFor] = useState<ConcessionDto | null>(null);
  const [laterPnr, setLaterPnr] = useState('');
  const act = useMutation({
    mutationFn: (decision: 'GRANT' | 'REJECT') => {
      if (decision === 'REJECT') {
        return api.bookings.reviewConcession(b.id, review!.id, {
          decision,
          staffNote: staffNote || undefined,
        });
      }
      if (review!.type === 'DISCOUNT') {
        return api.bookings.reviewConcession(b.id, review!.id, {
          decision,
          adultAmount: Number(adultAmount) || 0,
          childAmount: Number(childAmount) || 0,
          infantAmount: Number(infantAmount) || 0,
          staffNote: staffNote || undefined,
        });
      }
      return api.bookings.reviewConcession(b.id, review!.id, {
        decision,
        seats,
        pnr: pnr || undefined,
        staffNote: staffNote || undefined,
      });
    },
    onSuccess: (next, decision) => {
      setReview(null);
      setStaffNote('');
      setError(undefined);
      onChanged(next, decision === 'GRANT' ? 'Concession approved' : 'Concession rejected');
    },
    onError: (e) => {
      setError(errorMessage(e));
      toast.error(errorMessage(e));
    },
  });
  const savePnr = useMutation({
    mutationFn: () => api.bookings.setConcessionPnr(b.id, pnrFor!.id, { pnr: laterPnr }),
    onSuccess: (next) => {
      setPnrFor(null);
      setLaterPnr('');
      onChanged(next, 'Seat PNR saved');
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
  useEffect(() => {
    if (!initialReviewId || !canReview) return;
    const found = c.requests.find((r) => r.id === initialReviewId && r.status === 'PENDING');
    if (found) setReview(found);
    onReviewConsumed?.();
    // Open once from ?review= — later booking refreshes should not re-open the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReviewId]);
  useEffect(() => {
    if (!review) return;
    setSeats(Math.max(1, review.seats || 1));
    setPnr(review.pnr ?? '');
    setAdultAmount(review.adultAmount ? String(Math.round(review.adultAmount)) : '');
    setChildAmount(review.childAmount ? String(Math.round(review.childAmount)) : '');
    setInfantAmount(review.infantAmount ? String(Math.round(review.infantAmount)) : '');
    setStaffNote('');
    setError(undefined);
  }, [review]);
  const approve = () => {
    setError(undefined);
    if (review?.type === 'DISCOUNT') {
      if (!(Number(adultAmount) > 0 || Number(childAmount) > 0 || Number(infantAmount) > 0)) {
        setError('Enter a discount for at least one passenger type');
        return;
      }
    } else if (review && seats < 1) {
      setError('Enter at least one seat');
      return;
    }
    act.mutate('GRANT');
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
        {canGrant && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pending('CHILD_SEATS')}
              title={
                pending('CHILD_SEATS')
                  ? 'Review the pending child-seat request first'
                  : 'Grant extra child seats on this hold. Charged at the adult fare.'
              }
              onClick={() => onGrant('CHILD_SEATS')}
            >
              <Baby /> Grant child seats
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={maxInfant < 1 || pending('INFANT_SEATS')}
              title={
                maxInfant < 1
                  ? 'Need an adult seat first'
                  : pending('INFANT_SEATS')
                    ? 'Review the pending infant request first'
                    : 'Lap infants do not take a seat. 1 infant per adult.'
              }
              onClick={() => onGrant('INFANT_SEATS')}
            >
              <Baby /> Grant infant seats
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!c.canRequestDiscount}
              title={
                c.canRequestDiscount
                  ? 'Fixed per-seat discount by adult, child, or infant'
                  : 'A discount is already applied or pending'
              }
              onClick={() => onGrant('DISCOUNT')}
            >
              <Percent /> Grant discount
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-3 border-t px-5 py-4 sm:grid-cols-3">
        <Stat label="Granted child seats" value={String(c.grantedChildSeats)} icon={<Users />} />
        <Stat label="Granted infant seats" value={String(c.grantedInfantSeats)} icon={<Users />} />
        <Stat
          label="Discount applied"
          value={c.discountAmount > 0 ? formatMoney(c.discountAmount, { decimals: true }) : '—'}
          icon={<Receipt />}
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
                      {r.note ? `Agent: ${r.note}` : ''}
                      {r.note && r.staffNote ? ' · ' : ''}
                      {r.staffNote}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === 'GRANTED' &&
                    (r.type === 'CHILD_SEATS' || r.type === 'INFANT_SEATS') &&
                    !r.pnr &&
                    canReview && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPnrFor(r);
                          setLaterPnr('');
                        }}
                      >
                        Add PNR
                      </Button>
                    )}
                  {r.status === 'PENDING' && canReview && (
                    <Button size="sm" onClick={() => setReview(r)}>
                      Review
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Dialog
        open={!!review}
        onOpenChange={(o) => !o && setReview(null)}
        title={
          review?.type === 'DISCOUNT'
            ? 'Review discount request'
            : review?.type === 'INFANT_SEATS'
              ? 'Review infant seat request'
              : 'Review child seat request'
        }
        description="Adjust values before approving."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => act.mutate('REJECT')}
              loading={act.isPending}
            >
              <XCircle /> Reject
            </Button>
            <Button onClick={approve} loading={act.isPending}>
              <Check /> Approve
            </Button>
          </>
        }
      >
        {review?.type === 'DISCOUNT' ? (
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
              hint="Fixed amount per seat of that type. Leave a kind blank for no discount."
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
          </div>
        ) : (
          <div className="space-y-3">
            <Field
              label={review?.type === 'INFANT_SEATS' ? 'Extra infant seats' : 'Extra child seats'}
            >
              <Input
                type="number"
                min={1}
                max={MAX_SEATS_PER_BOOKING}
                step={1}
                inputMode="numeric"
                value={seats}
                onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
              />
            </Field>
            <Field
              label={
                review?.type === 'INFANT_SEATS'
                  ? 'Infant seat PNR (optional)'
                  : 'Child seat PNR (optional)'
              }
              hint="Leave blank to approve now and add the PNR later."
            >
              <Input
                value={pnr}
                onChange={(e) => setPnr(e.target.value.toUpperCase())}
                placeholder="ABC123"
                autoComplete="off"
              />
            </Field>
          </div>
        )}
        <Field label="Reason" className="mt-3">
          <Textarea
            rows={3}
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            placeholder="Optional note for platform review"
          />
        </Field>
        {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      </Dialog>
      <Dialog
        open={!!pnrFor}
        onOpenChange={(o) => !o && setPnrFor(null)}
        title={pnrFor?.type === 'INFANT_SEATS' ? 'Infant seat PNR' : 'Child seat PNR'}
        description="Leave blank at approve time is fine — add the airline PNR when you have it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPnrFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => savePnr.mutate()}
              loading={savePnr.isPending}
              disabled={!laterPnr.trim()}
            >
              <Check /> Save PNR
            </Button>
          </>
        }
      >
        <Field label={pnrFor?.type === 'INFANT_SEATS' ? 'Infant seat PNR' : 'Child seat PNR'}>
          <Input
            value={laterPnr}
            onChange={(e) => setLaterPnr(e.target.value.toUpperCase())}
            placeholder="ABC123"
            autoComplete="off"
          />
        </Field>
      </Dialog>
    </Card>
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

function GrantDialog({
  booking,
  type,
  onClose,
  onSaved,
}: {
  booking: AdminBookingDetailDto;
  type: ConcessionType;
  onClose: () => void;
  onSaved: (b: AdminBookingDetailDto) => void;
}) {
  const adults = booking.seats - booking.childSeats;
  const maxInfant = Math.max(0, maxInfantSeatsForAdults(adults) - booking.infantSeats);
  const [seats, setSeats] = useState(1);
  const [pnr, setPnr] = useState('');
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
    mutationFn: (dto: RequestConcessionInput) => api.bookings.grantConcession(booking.id, dto),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  const title =
    type === 'CHILD_SEATS'
      ? 'Grant child seats'
      : type === 'INFANT_SEATS'
        ? 'Grant infant seats'
        : 'Grant discount';
  const description =
    type === 'CHILD_SEATS'
      ? 'Grant extra child seats on this hold. They are charged at the adult fare and occupy a seat. The 1 child per 10 adults limit applies only when first creating a booking.'
      : type === 'INFANT_SEATS'
        ? 'Infants do not take a seat. 1 lap infant is allowed per adult.'
        : `Fixed per-seat discount by adult, child, or infant on ${booking.reference}.`;
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
    submit.mutate({ type, seats, pnr: pnr || undefined, note: note || undefined });
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
            <Check /> Grant
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
              hint="Fixed amount per seat of that type. Leave a kind blank for no discount."
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
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
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
            <Field
              label={
                type === 'INFANT_SEATS' ? 'Infant seat PNR (optional)' : 'Child seat PNR (optional)'
              }
              hint="Leave blank to grant now and add the PNR later."
            >
              <Input
                value={pnr}
                onChange={(e) => setPnr(e.target.value.toUpperCase())}
                placeholder="ABC123"
                autoComplete="off"
              />
            </Field>
          </div>
        )}
        <Field label="Note to partner (optional)">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}

const HOLD_INCREASE = [
  { minutes: 60, label: '1 hour' },
  { minutes: 180, label: '3 hours' },
  { minutes: 360, label: '6 hours' },
] as const;
const HOLD_DECREASE = [
  { minutes: -30, label: '-30 minutes' },
  { minutes: -60, label: '-1 hour' },
] as const;

function HoldChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        selected
          ? 'border-primary bg-surface text-foreground shadow-[0_0_0_1px_hsl(var(--primary))]'
          : 'border-border bg-surface text-foreground hover:border-border-strong',
      )}
    >
      {children}
    </button>
  );
}

function HoldDialog({
  booking,
  open,
  onOpenChange,
  onSaved,
}: {
  booking: AdminBookingDetailDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (b: AdminBookingDetailDto) => void;
}) {
  const [minutes, setMinutes] = useState(60);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!open) return;
    setMinutes(60);
    setCustom('');
    setError(undefined);
  }, [open]);
  const nextAt = addMinutes(booking.holdExpiresAt, minutes);
  const submit = useMutation({
    mutationFn: () => api.bookings.extendHold(booking.id, { holdExpiresAt: nextAt }),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  const pick = (n: number) => {
    setMinutes(n);
    setCustom('');
    setError(undefined);
  };
  const save = () => {
    if (!Number.isInteger(minutes) || minutes === 0) {
      setError('Enter an adjustment in 15-minute steps.');
      return;
    }
    if (minutes % 15 !== 0) {
      setError('Use steps of 15 minutes.');
      return;
    }
    if (new Date(nextAt).getTime() <= Date.now()) {
      setError('Payment deadline must be in the future');
      return;
    }
    if (new Date(nextAt).getTime() > Date.now() + 30 * 24 * 60 * 60_000) {
      setError('Payment deadline cannot be more than 30 days from now');
      return;
    }
    submit.mutate();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-muted">
            <Clock className="size-3.5 text-muted-foreground" />
          </span>
          Adjust payment deadline
        </span>
      }
      description={`Update the payment window for booking ${booking.reference}. Changes apply from the current deadline, not the current time.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={submit.isPending}>
            Update deadline
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-muted/70 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Current deadline
          </p>
          <p className="mt-1 font-medium">{formatDateTime(booking.holdExpiresAt)}</p>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Increase
          </p>
          <div className="flex flex-wrap gap-2">
            {HOLD_INCREASE.map((opt) => (
              <HoldChip
                key={opt.minutes}
                selected={!custom && minutes === opt.minutes}
                onClick={() => pick(opt.minutes)}
              >
                <Plus className="size-3.5" /> +{opt.label}
              </HoldChip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Decrease
          </p>
          <div className="flex flex-wrap gap-2">
            {HOLD_DECREASE.map((opt) => (
              <HoldChip
                key={opt.minutes}
                selected={!custom && minutes === opt.minutes}
                onClick={() => pick(opt.minutes)}
              >
                <Minus className="size-3.5" /> {opt.label}
              </HoldChip>
            ))}
          </div>
        </div>
        <Field
          label="Custom adjustment (minutes)"
          hint="Use positive values to extend, negative to reduce. Steps of 15 minutes."
          error={error}
        >
          <Input
            inputMode="numeric"
            placeholder="e.g. 90 or -45"
            value={custom}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setCustom(e.target.value);
              setError(undefined);
              if (raw === '' || raw === '-' || raw === '+') return;
              const n = Number(raw);
              if (Number.isFinite(n)) setMinutes(n);
            }}
          />
        </Field>
      </div>
    </Dialog>
  );
}

function addPassengerCopy(party: ReturnType<typeof partyCounts>) {
  const add: string[] = [];
  if (party.remainingAdults)
    add.push(`${party.remainingAdults} adult${party.remainingAdults === 1 ? '' : 's'}`);
  if (party.remainingChildren)
    add.push(
      `${party.remainingChildren} granted child seat${party.remainingChildren === 1 ? '' : 's'}`,
    );
  if (party.remainingInfants)
    add.push(`${party.remainingInfants} granted infant${party.remainingInfants === 1 ? '' : 's'}`);
  const filled = [
    party.adultsFilled ? `${party.adultsFilled} of ${party.adultSlots} adult filled` : null,
    party.childSeats > 0 && party.childrenFilled
      ? `${party.childrenFilled} of ${party.childSeats} child filled`
      : null,
    party.infantSeats > 0 && party.infantsFilled
      ? `${party.infantsFilled} of ${party.infantSeats} infant filled`
      : null,
  ].filter(Boolean);
  const lead = add.length ? `Add ${add.join(' and ')}.` : 'All passenger slots are filled.';
  const already = filled.length ? ` ${filled.join(' · ')} already on this booking.` : '';
  return `${lead}${already} Names as printed on the passport.`;
}

function slotHint(type: PassengerInput['type']) {
  if (type === 'CHILD') return 'Granted child seat — occupies a seat, charged at the adult fare';
  if (type === 'INFANT') return 'Granted infant seat — lap infant, does not occupy a seat';
  return 'Adult seat';
}

function AddPassengersDialog({
  booking,
  onClose,
  onSaved,
}: {
  booking: AdminBookingDetailDto;
  onClose: () => void;
  onSaved: (b: AdminBookingDetailDto) => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string>();
  const party = partyCounts(booking);
  const trip = {
    departureDate: booking.departureDate,
    returnDate: booking.returnDate ?? booking.departureDate,
  };
  const rules = {
    exactSeats: false,
    grantedInfantSeats: booking.infantSeats,
    childSeatQuota: booking.childSeats,
  };
  const form = useForm<{ passengers: PassengerInput[] }>({
    defaultValues: {
      passengers: buildPassengers(
        party.remainingAdults,
        party.remainingChildren,
        party.remainingInfants,
      ),
    },
  });
  const { control, register, setValue, getValues, formState } = form;
  const { fields } = useFieldArray({ control, name: 'passengers' });
  const submit = useMutation({
    mutationFn: (passengers: PassengerInput[]) =>
      api.bookings.addPassengers(booking.id, { passengers }),
    onSuccess: onSaved,
    onError: (e) => setFormError(errorMessage(e)),
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
      setFormError(parsed.issues[0]?.message ?? 'Check passenger details');
      return;
    }
    submit.mutate(incoming);
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add passengers"
      description={addPassengerCopy(party)}
      size="full"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={submit.isPending} disabled={fields.length === 0}>
            Save passengers
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">All passenger slots are filled.</p>
        ) : (
          fields.map((field, i) => {
            const n = fields.slice(0, i + 1).filter((f) => f.type === field.type).length;
            return (
              <div key={field.id} className="space-y-3 rounded-xl border p-4">
                <input type="hidden" {...register(`passengers.${i}.type`)} />
                <div>
                  <p className="text-sm font-semibold tracking-[-0.01em]">
                    {titleCase(field.type)} {n}
                  </p>
                  <p className="text-[13px] text-muted-foreground">{slotHint(field.type)}</p>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[44rem] grid-cols-[7.5rem_minmax(8rem,1fr)_minmax(8rem,1fr)_8.5rem] gap-3">
                    <Field label="Title" className="min-w-0">
                      <Select
                        {...register(`passengers.${i}.title`)}
                        onChange={(e) => {
                          const title = e.target.value as PassengerInput['title'];
                          setValue(`passengers.${i}.title`, title);
                          setValue(`passengers.${i}.gender`, genderFromTitle(title));
                        }}
                      >
                        {titlesForType(field.type).map((t) => (
                          <option key={t} value={t}>
                            {TITLE_LABEL[t]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="First name" className="min-w-0">
                      <Input
                        {...register(`passengers.${i}.firstName`)}
                        autoComplete="off"
                        className="uppercase"
                      />
                    </Field>
                    <Field label="Last name" className="min-w-0">
                      <Input
                        {...register(`passengers.${i}.lastName`)}
                        autoComplete="off"
                        className="uppercase"
                      />
                    </Field>
                    <Field label="Gender" className="min-w-0">
                      <Select {...register(`passengers.${i}.gender`)}>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {titleCase(g)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[48rem] grid-cols-[7.5rem_11rem_7.5rem_minmax(8rem,1fr)_11rem] gap-3">
                    <Field label="Type" className="min-w-0">
                      <Select disabled value={field.type} aria-readonly>
                        <option value={field.type}>{titleCase(field.type)}</option>
                      </Select>
                    </Field>
                    <Field label="Date of birth" className="min-w-0">
                      <Input
                        type="date"
                        className="min-w-0 px-2"
                        {...register(`passengers.${i}.dateOfBirth`)}
                      />
                    </Field>
                    <Field label="Nationality" className="min-w-0">
                      <Input
                        maxLength={2}
                        className="uppercase"
                        {...register(`passengers.${i}.nationality`)}
                      />
                    </Field>
                    <Field label="Passport" className="min-w-0">
                      <Input
                        {...register(`passengers.${i}.passportNumber`)}
                        autoComplete="off"
                        className="uppercase"
                      />
                    </Field>
                    <Field label="Expiry" className="min-w-0">
                      <Input
                        type="date"
                        className="min-w-0 px-2"
                        {...register(`passengers.${i}.passportExpiry`)}
                      />
                    </Field>
                  </div>
                </div>
                {formState.errors.passengers?.[i] && (
                  <p className="text-xs text-danger">Check this passenger's details.</p>
                )}
              </div>
            );
          })
        )}
        <Checkbox
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          label="I confirm these names match the passports."
        />
        {formError && <p className="text-xs font-medium text-danger">{formError}</p>}
      </div>
    </Dialog>
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
  booking: AdminBookingDetailDto;
  passengerIds: string[];
  onSaved: (b: AdminBookingDetailDto) => void;
  onCancel: () => void;
}) {
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
    onSuccess: onSaved,
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
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
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
