import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Copy, Plane, TriangleAlert } from 'lucide-react';
import {
  createBookingSchema,
  formatPassport,
  type CreateBookingInput,
  type PassengerInput,
} from '@gnk/validation';
import { GENDERS, PAX_TYPES, TITLES, type QuoteDto } from '@gnk/types';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DataTable,
  ErrorState,
  Field,
  Input,
  KeyValue,
  MaskedInput,
  Money,
  PageHeader,
  Select,
  Spinner,
  Stepper,
  Textarea,
  formatDate,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { applyServerErrors, errorMessage, newIdempotencyKey } from '@/lib/forms';
import { ApprovedGate } from '@/components/guards';

const blankPax = (): PassengerInput => ({
  type: 'ADULT',
  title: 'MR',
  firstName: '',
  lastName: '',
  gender: 'MALE',
  dateOfBirth: '',
  nationality: 'PK',
  passportNumber: '',
  passportExpiry: '',
});

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
  const quote = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => api.quotes.get(quoteId),
    enabled: !!quoteId,
    staleTime: Infinity,
  });

  if (!quoteId)
    return (
      <Alert tone="warning">
        Pick a group and seats first.{' '}
        <Link to="/book/groups" className="font-medium text-link">
          Browse groups
        </Link>
      </Alert>
    );
  if (quote.error) return <ErrorState error={quote.error} />;
  if (!quote.data) return <Spinner className="py-20" />;
  return (
    <BookingForm
      key={`${quote.data.departureId}-${quote.data.seats}`}
      quote={quote.data}
      onRequote={(id) => setParams({ quote: id }, { replace: true })}
    />
  );
}

function BookingForm({ quote, onRequote }: { quote: QuoteDto; onRequote: (id: string) => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string>();
  const idempotencyKey = useRef(newIdempotencyKey());
  const draftKey = `gnk-booking-draft-${quote.departureId}-${quote.seats}`;
  const countdown = useCountdown(quote.expiresAt);

  // Restore passenger names typed before a re-quote or page refresh (passport numbers are not stored).
  const initialPassengers = useMemo(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null') as
        PassengerInput[] | null;
      if (saved?.length === quote.seats) return saved.map((p) => ({ ...p, passportNumber: '' }));
    } catch {
      /* ignore */
    }
    return Array.from({ length: quote.seats }, blankPax);
  }, [draftKey, quote.seats]);

  const form = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: { quoteId: quote.id, passengers: initialPassengers, agentNotes: '' },
    mode: 'onTouched',
  });
  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState,
    getValues,
    setValue,
    watch,
    setError,
  } = form;
  const { fields } = useFieldArray({ control, name: 'passengers' });
  const errors = formState.errors;

  // A fresh quote (after expiry) keeps everything typed so far.
  useEffect(() => setValue('quoteId', quote.id), [quote.id, setValue]);

  useEffect(() => {
    const sub = watch((v) => {
      try {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify((v.passengers ?? []).map((p) => ({ ...p, passportNumber: '' }))),
        );
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [watch, draftKey]);

  const requote = useMutation({
    mutationFn: () => api.quotes.create(quote.departureId, quote.seats),
    onSuccess: (q) => {
      toast.info(
        'Price refreshed',
        `New total ${q.totalPrice.toLocaleString('en-PK')} PKR, valid for another ${Math.round((new Date(q.expiresAt).getTime() - Date.now()) / 60000)} minutes.`,
      );
      onRequote(q.id);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = useMutation({
    mutationFn: (values: CreateBookingInput) => api.bookings.create(values, idempotencyKey.current),
    onSuccess: (booking) => {
      sessionStorage.removeItem(draftKey);
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: keys.bookingCounts });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
      toast.success(
        `Booking ${booking.reference} requested`,
        'GNK Connect will review it shortly.',
      );
      navigate(`/bookings/${booking.id}`, { replace: true });
    },
    onError: (e) => {
      setFormError(applyServerErrors(e, setError));
      if (Object.keys(formState.errors.passengers ?? {}).length) setStep(0);
    },
  });

  const toReview = async () => {
    if (await trigger('passengers', { shouldFocus: true })) setStep(1);
  };

  const copySurname = () => {
    const surname = getValues('passengers.0.lastName');
    fields.forEach(
      (_, i) =>
        i > 0 &&
        !getValues(`passengers.${i}.lastName`) &&
        setValue(`passengers.${i}.lastName`, surname, { shouldValidate: true }),
    );
  };

  const values = getValues();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="New booking request" description={`${quote.group.title}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Stepper steps={['Passengers', 'Review & submit']} current={step} />
          {formError && <Alert tone="danger">{formError}</Alert>}

          {step === 0 && (
            <>
              <Alert tone="info">
                Enter names exactly as printed on each passport. Passports must be valid for at
                least 6 months after the return date.
              </Alert>
              {fields.map((f, i) => {
                const e = errors.passengers?.[i];
                return (
                  <Card key={f.id}>
                    <CardHeader
                      title={`Passenger ${i + 1}`}
                      actions={
                        i === 0 && fields.length > 1 ? (
                          <Button variant="ghost" size="xs" onClick={copySurname}>
                            <Copy /> Copy surname to others
                          </Button>
                        ) : undefined
                      }
                    />
                    <CardBody className="grid gap-4 sm:grid-cols-6">
                      <Field label="Type" className="sm:col-span-2" error={e?.type?.message}>
                        <Select {...register(`passengers.${i}.type`)}>
                          {PAX_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {titleCase(t)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Title" className="sm:col-span-2" error={e?.title?.message}>
                        <Select {...register(`passengers.${i}.title`)}>
                          {TITLES.map((t) => (
                            <option key={t} value={t}>
                              {titleCase(t)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Gender" className="sm:col-span-2" error={e?.gender?.message}>
                        <Select {...register(`passengers.${i}.gender`)}>
                          {GENDERS.map((t) => (
                            <option key={t} value={t}>
                              {titleCase(t)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label="Given name(s)"
                        required
                        className="sm:col-span-3"
                        error={e?.firstName?.message}
                      >
                        <Input
                          autoComplete="off"
                          className="uppercase"
                          {...register(`passengers.${i}.firstName`)}
                        />
                      </Field>
                      <Field
                        label="Surname"
                        required
                        className="sm:col-span-3"
                        error={e?.lastName?.message}
                      >
                        <Input
                          autoComplete="off"
                          className="uppercase"
                          {...register(`passengers.${i}.lastName`)}
                        />
                      </Field>
                      <Field
                        label="Date of birth"
                        required
                        className="sm:col-span-2"
                        error={e?.dateOfBirth?.message}
                      >
                        <Input type="date" {...register(`passengers.${i}.dateOfBirth`)} />
                      </Field>
                      <Field
                        label="Nationality"
                        required
                        className="sm:col-span-1"
                        error={e?.nationality?.message}
                        hint="e.g. PK"
                      >
                        <Input
                          maxLength={2}
                          className="uppercase"
                          {...register(`passengers.${i}.nationality`)}
                        />
                      </Field>
                      <Field
                        label="Passport no."
                        required
                        className="sm:col-span-3"
                        error={e?.passportNumber?.message}
                      >
                        <MaskedInput
                          mask={formatPassport}
                          autoComplete="off"
                          className="uppercase tabular"
                          {...register(`passengers.${i}.passportNumber`)}
                        />
                      </Field>
                      <Field
                        label="Passport expiry"
                        required
                        className="sm:col-span-2"
                        error={e?.passportExpiry?.message}
                      >
                        <Input type="date" {...register(`passengers.${i}.passportExpiry`)} />
                      </Field>
                    </CardBody>
                  </Card>
                );
              })}
              <div className="flex justify-end">
                <Button size="lg" onClick={toReview}>
                  Review booking
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit((v) => submit.mutate(v))} className="space-y-5" noValidate>
              <Card>
                <CardHeader
                  title="Passengers"
                  actions={
                    <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                      Edit
                    </Button>
                  }
                />
                <DataTable
                  dense
                  rowKey={(p) => p.passportNumber + p.firstName}
                  rows={values.passengers}
                  columns={[
                    {
                      key: 'n',
                      header: 'Name',
                      cell: (p) => (
                        <span className="font-medium uppercase">{`${titleCase(p.title)} ${p.firstName} ${p.lastName}`}</span>
                      ),
                    },
                    { key: 't', header: 'Type', cell: (p) => titleCase(p.type) },
                    { key: 'd', header: 'Born', cell: (p) => formatDate(p.dateOfBirth) },
                    {
                      key: 'p',
                      header: 'Passport',
                      cell: (p) => <span className="tabular">{p.passportNumber}</span>,
                    },
                    { key: 'e', header: 'Expires', cell: (p) => formatDate(p.passportExpiry) },
                  ]}
                />
              </Card>
              <Card>
                <CardHeader title="Notes for GNK (optional)" />
                <CardBody>
                  <Textarea
                    placeholder="Meal requests, wheelchair assistance, group leader name…"
                    {...register('agentNotes')}
                  />
                </CardBody>
              </Card>
              <Alert tone="info" title="How payment works">
                GNK Connect reviews your request, confirms seats with the airline and charges the
                total to your account balance or credit. Make sure your balance or credit covers it;
                you can deposit funds under Payments.
              </Alert>
              <Checkbox
                label="I confirm passenger names match their passports and accept the booking terms. Name changes after issue may not be possible."
                onChange={(e) =>
                  setValue('acceptTerms', e.target.checked as true, { shouldValidate: true })
                }
              />
              {errors.acceptTerms && (
                <p className="text-xs font-medium text-danger">{errors.acceptTerms.message}</p>
              )}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  loading={submit.isPending}
                  disabled={countdown.expired}
                >
                  Submit booking request
                </Button>
              </div>
            </form>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Booking summary" icon={<Plane className="size-4" />} />
            <CardBody className="space-y-4">
              <KeyValue
                columns={1}
                items={[
                  {
                    label: 'Sector',
                    value: `${quote.group.sector ?? quote.group.title} · ${quote.group.airline}`,
                  },
                  {
                    label: 'Travel',
                    value: `${formatDate(quote.group.departureDate)} – ${formatDate(quote.group.returnDate)}`,
                  },
                  { label: 'Baggage', value: quote.group.baggage },
                ]}
              />
              <div className="space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Fare per seat</span>
                  <Money value={quote.unitPrice} />
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Seats</span>
                  <span className="tabular">× {quote.seats}</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-semibold">Total</span>
                  <Money value={quote.totalPrice} className="text-xl font-semibold" />
                </div>
              </div>
              {countdown.expired ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
                    <TriangleAlert className="size-4" /> This price has expired
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => requote.mutate()}
                    loading={requote.isPending}
                  >
                    Get a fresh price
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> Price held for{' '}
                  <span className="tabular font-medium text-foreground">{countdown.label}</span>
                </p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
