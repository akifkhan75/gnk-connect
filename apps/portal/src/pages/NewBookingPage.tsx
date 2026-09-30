import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Minus, Plane, Plus } from 'lucide-react';
import { z } from 'zod';
import {
  formatPassport,
  MAX_SEATS_PER_BOOKING,
  passengerSchema,
  type PassengerInput,
} from '@gnk/validation';
import { TITLES, type InventoryGroupDetail, type InventoryLotSummary } from '@gnk/types';
import {
  Alert,
  Button,
  Checkbox,
  ErrorState,
  Field,
  Input,
  MaskedInput,
  Money,
  PageHeader,
  Select,
  Spinner,
  cn,
  formatDate,
  formatDateTime,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { applyServerErrors, errorMessage, newIdempotencyKey } from '@/lib/forms';
import { ApprovedGate } from '@/components/guards';

type EntryMode = 'later' | 'now';

const blankPax = (type: PassengerInput['type'] = 'ADULT'): PassengerInput => ({
  type,
  title: type === 'CHILD' ? 'MSTR' : 'MR',
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

const NATIONALITIES = [
  { code: 'PK', label: 'Pakistan' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'IN', label: 'India' },
  { code: 'BD', label: 'Bangladesh' },
];

type BookingFormValues = {
  passengers: PassengerInput[];
  agentNotes?: string;
  acceptTerms?: true;
};

export function NewBookingPage() {
  return (
    <ApprovedGate>
      <NewBooking />
    </ApprovedGate>
  );
}

function NewBooking() {
  const [params] = useSearchParams();
  const lotId = params.get('lot') ?? '';
  const groupId = params.get('group') ?? '';

  const invGroup = useQuery({
    queryKey: ['inventory-group', groupId],
    queryFn: () => api.inventory.groups.get(groupId),
    enabled: !!groupId && !!lotId,
  });

  if (lotId && groupId) {
    if (invGroup.error)
      return <ErrorState error={invGroup.error} onRetry={() => invGroup.refetch()} />;
    if (!invGroup.data) return <Spinner className="py-20" />;
    const lot = invGroup.data.lots.find((l) => l.id === lotId);
    if (!lot) {
      return (
        <Alert tone="danger">
          That cabin is no longer available.{' '}
          <Link to={`/inventory/groups/${groupId}`} className="font-medium text-link">
            Pick another cabin
          </Link>
        </Alert>
      );
    }
    return <InventoryBookingForm key={lot.id} group={invGroup.data} lot={lot} />;
  }

  return (
    <Alert tone="warning">
      Pick a group and cabin first.{' '}
      <Link to="/book/groups" className="font-medium text-link">
        Browse groups
      </Link>
    </Alert>
  );
}

function InventoryBookingForm({
  group,
  lot,
}: {
  group: InventoryGroupDetail;
  lot: InventoryLotSummary;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const idempotencyKey = useRef(newIdempotencyKey());
  const [mode, setMode] = useState<EntryMode>('later');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formError, setFormError] = useState<string>();

  const maxChild = Math.floor(adults / 10);
  const maxAdults = Math.min(
    MAX_SEATS_PER_BOOKING,
    lot.adultSeatsAvailable ?? lot.seatsAvailable ?? MAX_SEATS_PER_BOOKING,
  );
  const infantEnabled = lot.hasInfantFare;
  const seats = adults + children;
  const adultFare = lot.fareAmount ?? 0;
  const childFare = lot.childFareAmount ?? adultFare;
  const infantFare = lot.infantFareAmount ?? 0;
  const totalPrice = adultFare * adults + childFare * children + infantFare * infants;
  const sectorLabel = group.sector ?? group.name;

  useEffect(() => {
    if (children > maxChild) setChildren(maxChild);
  }, [children, maxChild]);

  useEffect(() => {
    if (infants > adults) setInfants(adults);
  }, [infants, adults]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(
      z.object({
        passengers: z.array(passengerSchema).max(MAX_SEATS_PER_BOOKING),
        acceptTerms: z.literal(true).optional(),
        agentNotes: z.string().optional(),
      }),
    ),
    defaultValues: {
      passengers: [blankPax('ADULT')],
      agentNotes: '',
      acceptTerms: true as const,
    },
    mode: 'onTouched',
  });
  const { control, register, setValue, getValues, setError, formState, trigger } = form;
  const { fields, replace } = useFieldArray({ control, name: 'passengers' });
  const errors = formState.errors;

  useEffect(() => {
    if (mode !== 'now') return;
    const current = getValues('passengers') ?? [];
    const next: PassengerInput[] = [];
    for (let i = 0; i < adults; i++) {
      const existing = current[i];
      next.push(existing?.type === 'ADULT' ? { ...existing, type: 'ADULT' } : blankPax('ADULT'));
    }
    for (let i = 0; i < children; i++) {
      const existing = current[adults + i];
      next.push(existing?.type === 'CHILD' ? { ...existing, type: 'CHILD' } : blankPax('CHILD'));
    }
    for (let i = 0; i < infants; i++) {
      const existing = current[adults + children + i];
      next.push(existing?.type === 'INFANT' ? { ...existing, type: 'INFANT' } : blankPax('INFANT'));
    }
    replace(next);
  }, [mode, adults, children, infants, getValues, replace]);

  const submit = useMutation({
    mutationFn: async (passengers: PassengerInput[]) =>
      api.bookings.create(
        {
          inventoryLotId: lot.id,
          adults,
          children,
          infants,
          passengers,
          acceptTerms: true,
        },
        idempotencyKey.current,
      ),
    onSuccess: (booking) => {
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: keys.bookingCounts });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
      void qc.invalidateQueries({ queryKey: ['inventory-group', group.id] });
      toast.success(
        `Booking ${booking.reference} held`,
        passengersDeferredMessage(booking.passengerCount, booking.seats),
      );
      navigate(`/bookings/${booking.id}`, { replace: true });
    },
    onError: (e) => {
      setFormError(applyServerErrors(e, setError));
      toast.error(errorMessage(e));
    },
  });

  const onConfirm = async () => {
    setFormError(undefined);
    if (!acceptTerms) {
      setFormError('Confirm that the information provided is accurate to continue.');
      return;
    }
    if (adults < 1) {
      setFormError('At least one adult is required.');
      return;
    }
    if (mode === 'later') {
      submit.mutate([]);
      return;
    }
    const ok = await trigger('passengers', { shouldFocus: true });
    if (!ok) {
      setFormError('Please complete all passenger details.');
      return;
    }
    submit.mutate(getValues('passengers') as PassengerInput[]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-28">
      <PageHeader title="New Booking" description={group.name} />
      {formError && <Alert tone="danger">{formError}</Alert>}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 bg-primary px-4 py-2.5 text-primary-foreground">
          <Plane className="size-4" />
          <span className="text-sm font-semibold tracking-wide">{sectorLabel}</span>
        </div>
        <div className="divide-y">
          {group.legs.map((leg, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
              <div className="min-w-[7rem]">
                <p className="text-sm font-semibold">{formatDate(leg.departAt)}</p>
                <p className="text-xs font-medium text-muted-foreground">{leg.flightNo}</p>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="text-center">
                  <p className="text-sm font-bold">{leg.from}</p>
                  <p className="text-xs tabular text-muted-foreground">
                    {formatDateTime(leg.departAt)}
                  </p>
                </div>
                <div className="relative h-px flex-1 bg-border">
                  <Plane className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{leg.to}</p>
                  <p className="text-xs tabular text-muted-foreground">
                    {formatDateTime(leg.arriveAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Passenger Entry Mode</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === 'later'}
            title="Add Passengers Later"
            description="Purchase seats now; add passport details on the booking page before ticketing."
            onClick={() => setMode('later')}
          />
          <ModeCard
            active={mode === 'now'}
            title="Add Passengers Now"
            description="Enter full passenger details before holding seats."
            onClick={() => setMode('now')}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Total seats: {seats}
          {infants > 0 ? ` + ${infants} infant${infants === 1 ? '' : 's'}` : ''}
          {mode === 'later' ? ' — passenger records optional at checkout.' : ''}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Select Passengers</h2>
          <div className="space-y-4">
            <PaxCounter
              label="Adults (12+ years)"
              value={adults}
              min={1}
              max={maxAdults}
              onChange={setAdults}
            />
            <PaxCounter
              label="Children (2-12 years)"
              value={children}
              min={0}
              max={Math.min(maxChild, maxAdults - adults + children)}
              onChange={setChildren}
              hint="1 Child allowed per 10 Adults"
            />
            <PaxCounter
              label="Infants (Under 2 years)"
              value={infants}
              min={0}
              max={infantEnabled ? adults : 0}
              onChange={setInfants}
              disabled={!infantEnabled}
              hint={
                infantEnabled
                  ? 'One infant per adult'
                  : 'Infant fare is not configured for this group'
              }
            />
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Price Summary</h2>
          <div className="space-y-2 text-sm">
            {adults > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Adult ({adults}x)</span>
                <Money value={adultFare * adults} />
              </div>
            )}
            {children > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Child ({children}x)</span>
                <Money value={childFare * children} />
              </div>
            )}
            {infants > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Infant ({infants}x)</span>
                <Money value={infantFare * infants} />
              </div>
            )}
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="font-semibold">Total</span>
              <Money value={totalPrice} className="text-lg font-bold text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">
              Hold expires {group.paymentDeadlineHours}h after confirmation.
            </p>
          </div>
        </section>
      </div>

      {mode === 'now' && (
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
          {adults > 0 && (
            <PassengerSection
              title="Adult Passengers"
              count={adults}
              fields={fields.slice(0, adults)}
              startIndex={0}
              register={register}
              setValue={setValue}
              errors={errors.passengers}
            />
          )}
          {children > 0 && (
            <PassengerSection
              title="Child Passengers"
              count={children}
              fields={fields.slice(adults, adults + children)}
              startIndex={adults}
              register={register}
              setValue={setValue}
              errors={errors.passengers}
            />
          )}
          {infants > 0 && (
            <PassengerSection
              title="Infant Passengers"
              count={infants}
              fields={fields.slice(adults + children)}
              startIndex={adults + children}
              register={register}
              setValue={setValue}
              errors={errors.passengers}
            />
          )}
        </form>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Checkbox
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          label="I hereby confirm that all the information provided is accurate and complete."
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Button variant="secondary" asChild>
            <Link to={`/inventory/groups/${group.id}`}>Back to Group</Link>
          </Button>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm font-medium tabular sm:block">
              {seats} pax · <Money value={totalPrice} />
            </p>
            <Button
              size="lg"
              loading={submit.isPending}
              onClick={onConfirm}
              disabled={adultFare <= 0}
            >
              <Check /> Confirm & Hold Seats
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function passengersDeferredMessage(passengerCount: number, seats: number) {
  if (passengerCount >= seats) return 'GNK Connect will review it shortly.';
  return 'Add passenger passport details on the booking page before ticketing.';
}

function ModeCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 p-4 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/40',
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}

function PaxCounter({
  label,
  value,
  min,
  max,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4', disabled && 'opacity-60')}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Fewer ${label}`}
        >
          <Minus />
        </Button>
        <span className="w-8 text-center text-lg font-semibold tabular">{value}</span>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`More ${label}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function PassengerSection({
  title,
  count,
  fields,
  startIndex,
  register,
  setValue,
  errors,
}: {
  title: string;
  count: number;
  fields: { id: string }[];
  startIndex: number;
  register: ReturnType<typeof useForm<BookingFormValues>>['register'];
  setValue: ReturnType<typeof useForm<BookingFormValues>>['setValue'];
  errors: ReturnType<typeof useForm<BookingFormValues>>['formState']['errors']['passengers'];
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 bg-primary px-4 py-2.5 text-primary-foreground">
        <span className="text-sm font-semibold">{title}</span>
        <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
          {count}
        </span>
      </div>
      <div className="space-y-3 p-4">
        {fields.map((f, i) => {
          const idx = startIndex + i;
          const e = errors?.[idx];
          return (
            <div key={f.id} className="flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0">
              <div className="grid min-w-[48rem] grid-cols-[auto_repeat(7,minmax(5.5rem,1fr))] items-start gap-2">
                <span className="mt-7 flex size-6 shrink-0 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <Field label="Title" required error={e?.title?.message}>
                  <Select
                    {...register(`passengers.${idx}.title`, {
                      onChange: (ev) =>
                        setValue(`passengers.${idx}.gender`, genderFromTitle(ev.target.value), {
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
                    autoComplete="off"
                    className="uppercase"
                    {...register(`passengers.${idx}.lastName`)}
                  />
                </Field>
                <Field label="Given Name" required error={e?.firstName?.message}>
                  <Input
                    placeholder="FIRST NAME"
                    autoComplete="off"
                    className="uppercase"
                    {...register(`passengers.${idx}.firstName`)}
                  />
                </Field>
                <Field label="Passport" required error={e?.passportNumber?.message}>
                  <MaskedInput
                    mask={formatPassport}
                    placeholder="PASSPORT #"
                    autoComplete="off"
                    className="uppercase tabular"
                    {...register(`passengers.${idx}.passportNumber`)}
                  />
                </Field>
                <Field label="Date of Birth" required error={e?.dateOfBirth?.message}>
                  <Input type="date" {...register(`passengers.${idx}.dateOfBirth`)} />
                </Field>
                <Field label="Passport Expiry" required error={e?.passportExpiry?.message}>
                  <Input type="date" {...register(`passengers.${idx}.passportExpiry`)} />
                </Field>
                <Field label="Nationality" required error={e?.nationality?.message}>
                  <Select {...register(`passengers.${idx}.nationality`)}>
                    {NATIONALITIES.map((n) => (
                      <option key={n.code} value={n.code}>
                        {n.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <input type="hidden" {...register(`passengers.${idx}.type`)} />
              <input type="hidden" {...register(`passengers.${idx}.gender`)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
