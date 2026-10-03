import { useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, MailCheck, User } from 'lucide-react';
import {
  formatCnic,
  formatNtn,
  formatPhonePk,
  partnerRegisterSchema,
  type PartnerRegisterInput,
} from '@gnk/validation';
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  KeyValue,
  MaskedInput,
  PasswordInput,
  Stepper,
  cn,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { safeInternalPath } from '@/lib/redirect';
import { PortalAuthLayout } from '@/components/PortalAuthLayout';

const STEPS = ['Account type', 'Business details', 'Contact & password', 'Review'];

const STEP_FIELDS: FieldPath<PartnerRegisterInput>[][] = [
  ['accountType'],
  [
    'legalName',
    'tradeName',
    'dtsLicenseNo',
    'ntn',
    'iataCode',
    'cnic',
    'city',
    'address',
    'officePhone',
  ],
  ['fullName', 'mobile', 'email', 'password', 'confirmPassword'],
  ['acceptTerms'],
];

export function RegisterPage() {
  const [params] = useSearchParams();
  const afterAuth = safeInternalPath(params.get('next'));
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const form = useForm<PartnerRegisterInput>({
    resolver: zodResolver(partnerRegisterSchema),
    mode: 'onTouched',
    defaultValues: {
      accountType: 'AGENCY',
      city: '',
      address: '',
      fullName: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const {
    register,
    watch,
    trigger,
    handleSubmit,
    formState,
    setValue,
    setError: setFieldError,
    getValues,
  } = form;
  const type = watch('accountType');
  const errors = formState.errors;

  const next = async () => {
    // Registration uses one schema; validate only the fields on this step before moving on.
    const ok = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (ok) setStep((s) => s + 1);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setError(undefined);
      try {
        await api.auth.register(values);
        setDone(values.email);
      } catch (e) {
        setError(applyServerErrors(e, setFieldError));
        const firstBad = STEP_FIELDS.findIndex((fields) =>
          fields.some((f) => form.getFieldState(f).error),
        );
        if (firstBad >= 0) setStep(firstBad);
      }
    },
    () => {
      const firstBad = STEP_FIELDS.findIndex((fields) =>
        fields.some((f) => form.getFieldState(f).error),
      );
      if (firstBad >= 0) setStep(firstBad);
    },
  );

  if (done) {
    return (
      <PortalAuthLayout title="Application started" wide>
        <div className="space-y-5">
          <div className="flex gap-4 rounded-lg border bg-success-soft p-5">
            <MailCheck className="size-6 shrink-0 text-success" />
            <div className="text-sm">
              <p className="font-semibold">Verify your email</p>
              <p className="mt-1 text-muted-foreground">
                We sent a verification link to{' '}
                <span className="font-medium text-foreground">{done}</span>. Then sign in to upload
                your documents and submit your application for review.
              </p>
            </div>
          </div>
          <ol className="space-y-3 text-sm">
            {[
              'Verify your email address',
              'Upload your KYC documents',
              'Submit for review. GNK usually approves within one working day.',
            ].map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <Button asChild size="lg" className="w-full">
            <Link to={`/login?email=${encodeURIComponent(done)}`}>Sign in to continue</Link>
          </Button>
        </div>
      </PortalAuthLayout>
    );
  }

  const values = getValues();
  return (
    <PortalAuthLayout
      title="Become a GNK Connect partner"
      subtitle="Apply for access to partner fares. It takes about five minutes."
      wide
      footer={
        <>
          Already registered?{' '}
          <Link
            to={afterAuth ? `/login?next=${encodeURIComponent(afterAuth)}` : '/login'}
            className="font-medium text-link hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <Stepper steps={STEPS} current={step} className="mb-7" />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <Alert tone="danger">{error}</Alert>}

        {step === 0 && (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Account type</legend>
            {(
              [
                [
                  'AGENCY',
                  Building2,
                  'Travel agency',
                  'A registered agency with a DTS licence and NTN. You can add team members.',
                ],
                [
                  'INDIVIDUAL',
                  User,
                  'Individual agent',
                  'A freelance agent booking under your own name with your CNIC.',
                ],
              ] as const
            ).map(([value, Icon, title, body]) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-border-strong',
                  type === value && 'border-accent bg-accent-soft/60 ring-1 ring-accent',
                )}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register('accountType')}
                />
                <span className="flex items-center justify-between">
                  <Icon className="size-5 text-link" />
                  {type === value && <CheckCircle2 className="size-5 text-accent" />}
                </span>
                <span className="font-semibold">{title}</span>
                <span className="text-[13px] text-muted-foreground">{body}</span>
              </label>
            ))}
          </fieldset>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {type === 'AGENCY' ? (
              <>
                <Field
                  label="Registered agency name"
                  required
                  htmlFor="legalName"
                  error={errors.legalName?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    id="legalName"
                    placeholder="e.g. Al-Noor Travel & Tours (Pvt) Ltd"
                    {...register('legalName')}
                  />
                </Field>
                <Field
                  label="Trading name"
                  htmlFor="tradeName"
                  hint="If different from the registered name"
                  error={errors.tradeName?.message}
                  className="sm:col-span-2"
                >
                  <Input id="tradeName" {...register('tradeName')} />
                </Field>
                <Field
                  label="DTS licence number"
                  required
                  htmlFor="dts"
                  error={errors.dtsLicenseNo?.message}
                >
                  <Input id="dts" placeholder="DTS-ISB-0000" {...register('dtsLicenseNo')} />
                </Field>
                <Field label="NTN" required htmlFor="ntn" error={errors.ntn?.message}>
                  <MaskedInput
                    id="ntn"
                    mask={formatNtn}
                    inputMode="numeric"
                    placeholder="1234567-8"
                    {...register('ntn')}
                  />
                </Field>
                <Field
                  label="IATA code"
                  htmlFor="iata"
                  hint="Optional"
                  error={errors.iataCode?.message}
                >
                  <Input id="iata" {...register('iataCode')} />
                </Field>
                <Field
                  label="Office phone"
                  htmlFor="officePhone"
                  hint="Optional"
                  error={errors.officePhone?.message}
                >
                  <MaskedInput
                    id="officePhone"
                    mask={formatPhonePk}
                    inputMode="tel"
                    placeholder="+92 300 1234567"
                    {...register('officePhone')}
                  />
                </Field>
              </>
            ) : (
              <Field
                label="CNIC"
                required
                htmlFor="cnic"
                error={errors.cnic?.message}
                className="sm:col-span-2"
              >
                <MaskedInput
                  id="cnic"
                  mask={formatCnic}
                  inputMode="numeric"
                  placeholder="35201-1234567-1"
                  {...register('cnic')}
                />
              </Field>
            )}
            <Field label="City" required htmlFor="city" error={errors.city?.message}>
              <Input id="city" placeholder="Islamabad" {...register('city')} />
            </Field>
            <Field
              label="Office address"
              required
              htmlFor="address"
              error={errors.address?.message}
              className="sm:col-span-2"
            >
              <Input id="address" {...register('address')} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Your full name"
              required
              htmlFor="fullName"
              error={errors.fullName?.message}
            >
              <Input id="fullName" autoComplete="name" {...register('fullName')} />
            </Field>
            <Field label="Mobile number" required htmlFor="mobile" error={errors.mobile?.message}>
              <MaskedInput
                id="mobile"
                mask={formatPhonePk}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+92 300 1234567"
                {...register('mobile')}
              />
            </Field>
            <Field
              label="Email"
              required
              htmlFor="email"
              error={errors.email?.message}
              className="sm:col-span-2"
              hint="You'll sign in with this email"
            >
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
            </Field>
            <Field
              label="Password"
              required
              htmlFor="password"
              error={errors.password?.message}
              hint="At least 10 characters"
            >
              <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
            </Field>
            <Field
              label="Confirm password"
              required
              htmlFor="confirmPassword"
              error={errors.confirmPassword?.message}
            >
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-lg border bg-surface-sunken p-4">
              <KeyValue
                items={[
                  {
                    label: 'Account type',
                    value: values.accountType === 'AGENCY' ? 'Travel agency' : 'Individual agent',
                  },
                  {
                    label: values.accountType === 'AGENCY' ? 'Agency' : 'Name',
                    value: values.accountType === 'AGENCY' ? values.legalName : values.fullName,
                  },
                  ...(values.accountType === 'AGENCY'
                    ? [
                        { label: 'DTS licence', value: values.dtsLicenseNo },
                        { label: 'NTN', value: values.ntn },
                      ]
                    : [{ label: 'CNIC', value: values.cnic }]),
                  { label: 'City', value: values.city },
                  { label: 'Contact', value: `${values.fullName} · ${values.mobile}` },
                  { label: 'Email', value: values.email, wide: true },
                ]}
              />
            </div>
            <Checkbox
              label={
                <>
                  I confirm these details are correct and accept the GNK Connect partner terms,
                  including that bookings are subject to airline availability and GNK approval.
                </>
              }
              onChange={(e) =>
                setValue('acceptTerms', e.target.checked as true, { shouldValidate: true })
              }
            />
            {errors.acceptTerms && (
              <p className="text-xs font-medium text-danger">{errors.acceptTerms.message}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0 || formState.isSubmitting}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button type="submit" loading={formState.isSubmitting}>
              Create account
            </Button>
          )}
        </div>
      </form>
    </PortalAuthLayout>
  );
}
