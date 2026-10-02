import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Baby, Clock, Minus, Plus, User, Users } from 'lucide-react';
import {
  CHILD_PER_ADULTS,
  MAX_SEATS_PER_BOOKING,
  validatePassengerList,
  type PassengerInput,
} from '@gnk/validation';
import {
  Alert,
  Breadcrumbs,
  Button,
  Checkbox,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  cn,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import {
  applyFieldIssues,
  applyServerErrors,
  errorMessage,
  focusFirstIssue,
  newIdempotencyKey,
  passengerFormError,
} from '@/lib/forms';
import { ApprovedGate } from '@/components/guards';
import { FareItinerary, visaLabel } from '@/components/FlightStrip';
import { TealCard } from '@/components/TealCard';
import { PassengerRows, blankPax, buildPassengers } from '@/components/PassengerEditor';

type PaxMode = 'later' | 'now';

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!expiresAt) return { expired: false, label: '' };
  const ms = new Date(expiresAt).getTime() - now;
  const m = Math.max(0, Math.floor(ms / 60000));
  const s = Math.max(0, Math.floor((ms % 60000) / 1000));
  return { expired: ms <= 0, label: `${m}:${String(s).padStart(2, '0')}` };
}

export function NewBookingPage() {
  return (
    <ApprovedGate>
      <NewBooking />
    </ApprovedGate>
  );
}

function NewBooking() {
  const [params, setParams] = useSearchParams();
  const quoteId = params.get('quote') ?? '';
  const departureId = params.get('departure') ?? '';
  const quoted = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => api.quotes.get(quoteId),
    enabled: !!quoteId && !departureId,
  });

  useEffect(() => {
    if (quoted.data && !departureId) {
      setParams({ departure: quoted.data.departureId }, { replace: true });
    }
  }, [quoted.data, departureId, setParams]);

  if (!departureId && !quoteId) {
    return (
      <Alert tone="warning">
        Pick a group and seats first.{' '}
        <Link to="/book/groups" className="font-medium text-link">
          Browse groups
        </Link>
      </Alert>
    );
  }
  if (!departureId && quoted.error) return <ErrorState error={quoted.error} />;
  if (!departureId) return <Spinner className="py-20" />;
  const fromUrl = Number(params.get('seats'));
  return (
    <BookingWorkspace
      departureId={departureId}
      initialSeats={fromUrl >= 1 ? fromUrl : (quoted.data?.seats ?? 1)}
    />
  );
}

function BookingWorkspace({
  departureId,
  initialSeats,
}: {
  departureId: string;
  initialSeats: number;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [adults, setAdults] = useState(Math.max(1, initialSeats));
  const [children, setChildren] = useState(0);
  const [mode, setMode] = useState<PaxMode>('later');
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string>();
  const seats = adults + children;
  const idempotencyKey = useRef(newIdempotencyKey());

  const quote = useQuery({
    queryKey: ['quote', 'create', departureId, seats],
    queryFn: () => api.quotes.create(departureId, seats),
    enabled: seats >= 1,
    staleTime: 45_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const group = useQuery({
    queryKey: keys.group(quote.data?.group.productId ?? ''),
    queryFn: () => api.groups.get(quote.data!.group.productId),
    enabled: !!quote.data?.group.productId,
  });

  const available =
    group.data?.departures.find((d) => d.id === departureId)?.seatsAvailable ??
    MAX_SEATS_PER_BOOKING;
  const maxSeats = Math.min(MAX_SEATS_PER_BOOKING, available);
  const maxChildren = Math.min(
    Math.floor(adults / CHILD_PER_ADULTS),
    Math.max(0, maxSeats - adults),
  );

  useEffect(() => {
    if (children > maxChildren) setChildren(maxChildren);
  }, [children, maxChildren]);

  useEffect(() => {
    idempotencyKey.current = newIdempotencyKey();
  }, [quote.data?.id]);

  const form = useForm<{ passengers: PassengerInput[] }>({
    defaultValues: { passengers: [blankPax()] },
    mode: 'onTouched',
  });
  const { control, register, setValue, getValues, setError, clearErrors, formState } = form;
  const { fields, replace } = useFieldArray({ control, name: 'passengers' });

  useEffect(() => {
    replace(buildPassengers(adults, children, getValues('passengers')));
  }, [adults, children, getValues, replace]);

  const countdown = useCountdown(quote.data?.expiresAt);

  const submit = useMutation({
    mutationFn: (passengers: PassengerInput[]) =>
      api.bookings.create(
        { quoteId: quote.data!.id, passengers, childSeats: children, acceptTerms: true },
        idempotencyKey.current,
      ),
    onSuccess: (booking) => {
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: keys.bookingCounts });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
      toast.success(
        `Booking ${booking.reference} requested`,
        mode === 'later'
          ? 'Seats are held. Add passenger names on the booking before ticketing.'
          : 'GNK Connect will review it shortly.',
      );
      navigate(`/bookings/${booking.id}`, { replace: true });
    },
    onError: (e) => setFormError(applyServerErrors(e, setError)),
  });

  const hold = () => {
    setFormError(undefined);
    if (!accepted) {
      setFormError('Confirm the information is accurate to continue.');
      return;
    }
    if (!quote.data || countdown.expired) return;
    if (mode === 'later') {
      submit.mutate([]);
      return;
    }
    const trip = {
      departureDate: quote.data.group.departureDate,
      returnDate: quote.data.group.returnDate ?? quote.data.group.departureDate,
    };
    const parsed = validatePassengerList(getValues('passengers'), seats, trip);
    if (!parsed.ok) {
      applyFieldIssues(parsed.issues, setError);
      setFormError(passengerFormError(parsed.issues));
      focusFirstIssue(parsed.issues);
      return;
    }
    submit.mutate(parsed.data);
  };

  if (quote.error && !quote.data)
    return <ErrorState error={quote.error} onRetry={() => quote.refetch()} />;
  if (!quote.data) return <Spinner className="py-20" />;

  const q = quote.data;
  const type = group.data?.type;
  const adultsTotal = q.unitPrice * adults;
  const childrenTotal = q.unitPrice * children;

  return (
    <div className="pb-24">
      <PageHeader
        className="mb-4"
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: 'Bookings', onClick: () => navigate('/bookings') }, { label: 'New' }]}
          />
        }
        title="Hold seats"
        description={q.group.title}
      />

      <div className="space-y-5">
        <FareItinerary
          sector={q.group.sector}
          airline={q.group.airline}
          outbound={q.group.outbound ?? group.data?.content.outbound ?? null}
          inbound={q.group.inbound ?? group.data?.content.inbound ?? null}
          departureDate={q.group.departureDate}
          returnDate={q.group.returnDate}
          baggage={q.group.baggage}
          visa={visaLabel(type, q.group.sector)}
        />

        <TealCard title="Passenger entry mode">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <ModeCard
              selected={mode === 'later'}
              title="Add passengers later"
              body="Purchase seats now. Add passport details on the booking page before ticketing."
              hint={`Total seats: ${seats} — passenger records optional at checkout`}
              onClick={() => setMode('later')}
            />
            <ModeCard
              selected={mode === 'now'}
              title="Add passengers now"
              body="Enter full passenger details before holding seats."
              onClick={() => setMode('now')}
            />
          </div>
        </TealCard>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <TealCard title="Select passengers" icon={<Users className="size-4" />}>
            <ul className="divide-y">
              <PaxRow
                icon={<User className="size-4" />}
                label="Adults (12+ years)"
                value={adults}
                min={1}
                max={Math.max(1, maxSeats - children)}
                onChange={setAdults}
              />
              <PaxRow
                icon={<User className="size-4 text-rose-400" />}
                label="Children (2–11 years)"
                hint="1 child allowed per 10 adults"
                value={children}
                min={0}
                max={maxChildren}
                onChange={setChildren}
                disabled={maxChildren === 0}
              />
              <PaxRow
                icon={<Baby className="size-4" />}
                label="Infants (under 2 years)"
                hint="Infant fare is not configured for this group"
                value={0}
                min={0}
                max={0}
                onChange={() => undefined}
                disabled
              />
            </ul>
          </TealCard>

          <TealCard title="Price summary">
            <div className="space-y-3 p-5 text-sm">
              <PriceLine label={`Adult (${adults})`} value={adultsTotal} />
              {children > 0 && <PriceLine label={`Child (${children})`} value={childrenTotal} />}
              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="font-semibold">
                  Total ({seats} passenger{seats === 1 ? '' : 's'})
                </span>
                <Money value={q.totalPrice} decimals className="text-base font-semibold" />
              </div>
              {countdown.expired ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => quote.refetch()}
                  loading={quote.isFetching}
                >
                  Get a fresh price
                </Button>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> Price held for{' '}
                  <span className="tabular font-medium text-foreground">{countdown.label}</span>
                </p>
              )}
            </div>
          </TealCard>
        </div>

        {mode === 'now' && (
          <>
            <TealCard
              title={
                <span className="flex items-center gap-2">
                  Adult passengers
                  <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                    {adults}
                  </span>
                </span>
              }
            >
              <PassengerRows
                fields={fields.slice(0, adults)}
                startIndex={0}
                register={register}
                setValue={setValue}
                getValues={getValues}
                setError={setError}
                clearErrors={clearErrors}
                errors={formState.errors.passengers}
                trip={{
                  departureDate: q.group.departureDate,
                  returnDate: q.group.returnDate ?? q.group.departureDate,
                }}
                lockType
              />
            </TealCard>
            {children > 0 && (
              <TealCard
                title={
                  <span className="flex items-center gap-2">
                    Child passengers
                    <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                      {children}
                    </span>
                  </span>
                }
              >
                <PassengerRows
                  fields={fields.slice(adults)}
                  startIndex={adults}
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                  setError={setError}
                  clearErrors={clearErrors}
                  errors={formState.errors.passengers}
                  trip={{
                    departureDate: q.group.departureDate,
                    returnDate: q.group.returnDate ?? q.group.departureDate,
                  }}
                  lockType
                />
              </TealCard>
            )}
          </>
        )}

        {formError && <Alert tone="danger">{formError}</Alert>}
        {quote.error && quote.data && <Alert tone="danger">{errorMessage(quote.error)}</Alert>}

        <div className="rounded-xl bg-warning-soft/70 px-4 py-3">
          <Checkbox
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            label="I hereby confirm that all the information provided is accurate and complete. I understand that providing false information may result in booking cancellation."
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 shadow-card">
          <Button asChild variant="ghost">
            <Link to="/book/groups">
              <ArrowLeft /> Back to groups
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {seats} pax · <Money value={q.totalPrice} decimals />
            </span>
            <Button
              variant="secondary"
              className="border-accent/40 text-accent hover:bg-accent-soft"
              onClick={hold}
              loading={submit.isPending}
              disabled={countdown.expired || quote.isFetching}
            >
              Confirm & hold seats
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  selected,
  title,
  body,
  hint,
  onClick,
}: {
  selected: boolean;
  title: string;
  body: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-4 py-4 text-left transition-colors',
        selected
          ? 'border-accent bg-accent-soft/50 shadow-sm'
          : 'border-transparent bg-muted/40 hover:bg-muted',
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{body}</p>
      {hint && selected && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </button>
  );
}

function PaxRow({
  icon,
  label,
  hint,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Fewer ${label}`}
        >
          <Minus />
        </Button>
        <span className="w-6 text-center text-sm font-semibold tabular">{value}</span>
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`More ${label}`}
        >
          <Plus />
        </Button>
      </div>
    </li>
  );
}

function PriceLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between text-muted-foreground">
      <span>{label}</span>
      <Money value={value} decimals />
    </div>
  );
}
