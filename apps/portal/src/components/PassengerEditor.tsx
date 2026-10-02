import { useRef, useState } from 'react';
import type {
  FieldArrayWithId,
  FieldErrors,
  UseFormClearErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetError,
  UseFormSetValue,
} from 'react-hook-form';
import { ScanLine } from 'lucide-react';
import { TITLES, type PassportScanDto, type Title } from '@gnk/types';
import {
  checkPassenger,
  formatPassport,
  genderFromTitle,
  isIsoDate,
  paxTypeFromDob,
  pkPassportHint,
  type PartyRules,
  type PassengerInput,
  type TripDates,
} from '@gnk/validation';
import { Button, Field, Input, MaskedInput, Select, titleCase } from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';

export { genderFromTitle };

export const NATIONALITIES: { code: string; name: string }[] = [
  { code: 'PK', name: 'Pakistan' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'IN', name: 'India' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'TR', name: 'Turkey' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'JO', name: 'Jordan' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'CN', name: 'China' },
  { code: 'PH', name: 'Philippines' },
];

const TITLE_LABEL: Record<Title, string> = {
  MR: 'Mr',
  MRS: 'Mrs',
  MS: 'Ms',
  MISS: 'Miss',
  MSTR: 'Master',
};

export function blankPax(type: PassengerInput['type'] = 'ADULT'): PassengerInput {
  const title: Title = type === 'ADULT' ? 'MR' : 'MSTR';
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

export function buildPassengers(
  adults: number,
  children: number,
  previous: PassengerInput[] = [],
  infants = 0,
) {
  const prevOf = (type: PassengerInput['type']) => previous.filter((p) => p.type === type);
  return [
    ...Array.from({ length: adults }, (_, i) => ({
      ...(prevOf('ADULT')[i] ?? blankPax('ADULT')),
      type: 'ADULT' as const,
    })),
    ...Array.from({ length: children }, (_, i) => ({
      ...(prevOf('CHILD')[i] ?? blankPax('CHILD')),
      type: 'CHILD' as const,
    })),
    ...Array.from({ length: infants }, (_, i) => ({
      ...(prevOf('INFANT')[i] ?? blankPax('INFANT')),
      type: 'INFANT' as const,
    })),
  ];
}

async function fileToPassportPayload(file: File) {
  const mime: 'image/jpeg' | 'image/png' | 'image/webp' =
    file.type === 'image/png'
      ? 'image/png'
      : file.type === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg';
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL(mime, 0.82);
  const image = dataUrl.slice(dataUrl.indexOf(',') + 1);
  if (image.length > 5_500_000) {
    throw new Error('Passport image is too large. Try a closer photo of the details page.');
  }
  return { image, mimeType: mime };
}

export function applyPassportScan(
  setValue: UseFormSetValue<{ passengers: PassengerInput[] }>,
  index: number,
  scan: PassportScanDto,
  trip?: TripDates,
  lockType?: boolean,
) {
  const set = (field: keyof PassengerInput, value: string | null) => {
    if (value)
      setValue(`passengers.${index}.${field}`, value, { shouldValidate: true, shouldDirty: true });
  };
  if (scan.title) {
    set('title', scan.title);
    setValue(`passengers.${index}.gender`, genderFromTitle(scan.title), { shouldValidate: true });
  } else if (scan.gender) {
    set('gender', scan.gender);
  }
  set('firstName', scan.firstName);
  set('lastName', scan.lastName);
  set('dateOfBirth', scan.dateOfBirth);
  set('nationality', scan.nationality);
  set('passportNumber', scan.passportNumber);
  set('passportExpiry', scan.passportExpiry);
  if (scan.dateOfBirth && trip && !lockType && isIsoDate(scan.dateOfBirth)) {
    const derived = paxTypeFromDob(scan.dateOfBirth, trip.departureDate);
    if (derived !== 'INFANT') {
      setValue(`passengers.${index}.type`, derived, { shouldDirty: true });
    }
  }
}

function applyRowChecks(
  index: number,
  passenger: PassengerInput,
  trip: TripDates,
  lockType: boolean,
  setValue: UseFormSetValue<{ passengers: PassengerInput[] }>,
  setError: UseFormSetError<{ passengers: PassengerInput[] }>,
  clearErrors: UseFormClearErrors<{ passengers: PassengerInput[] }>,
  rules: PartyRules = {},
) {
  let next = passenger;
  if (!lockType && isIsoDate(passenger.dateOfBirth)) {
    const derived = paxTypeFromDob(passenger.dateOfBirth, trip.departureDate);
    const allowInfant = (rules.grantedInfantSeats ?? 0) > 0;
    if ((derived !== 'INFANT' || allowInfant) && derived !== passenger.type) {
      setValue(`passengers.${index}.type`, derived, { shouldDirty: true });
      next = { ...passenger, type: derived };
    }
  }
  const fields = ['dateOfBirth', 'passportExpiry', 'passportNumber', 'title', 'type'] as const;
  clearErrors(fields.map((f) => `passengers.${index}.${f}` as const));
  for (const issue of checkPassenger(next, trip, index, rules)) {
    setError(issue.path as 'passengers', { type: 'validate', message: issue.message });
  }
}

export function PassengerRows({
  fields,
  startIndex = 0,
  register,
  setValue,
  getValues,
  setError,
  clearErrors,
  errors,
  trip,
  lockType = false,
  rules,
  onScanned,
}: {
  fields: FieldArrayWithId<{ passengers: PassengerInput[] }, 'passengers'>[];
  startIndex?: number;
  register: UseFormRegister<{ passengers: PassengerInput[] }>;
  setValue: UseFormSetValue<{ passengers: PassengerInput[] }>;
  getValues?: UseFormGetValues<{ passengers: PassengerInput[] }>;
  setError?: UseFormSetError<{ passengers: PassengerInput[] }>;
  clearErrors?: UseFormClearErrors<{ passengers: PassengerInput[] }>;
  errors?: FieldErrors<{ passengers: PassengerInput[] }>['passengers'];
  trip?: TripDates;
  lockType?: boolean;
  rules?: PartyRules;
  onScanned?: (index: number, scan: PassportScanDto) => void;
}) {
  const [scanning, setScanning] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string>();
  const [hints, setHints] = useState<Record<number, string>>({});
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const refreshHint = (index: number, nationality: string, passportNumber: string) => {
    setHints((prev) => ({ ...prev, [index]: pkPassportHint(nationality, passportNumber) ?? '' }));
  };

  const checkRow = (index: number) => {
    if (!trip || !getValues || !setError || !clearErrors) return;
    applyRowChecks(
      index,
      getValues(`passengers.${index}`),
      trip,
      lockType,
      setValue,
      setError,
      clearErrors,
      rules,
    );
  };

  const scan = async (index: number, file: File | undefined) => {
    if (!file) return;
    setScanError(undefined);
    setScanning(index);
    try {
      const payload = await fileToPassportPayload(file);
      const result = await api.bookings.scanPassport(payload);
      applyPassportScan(setValue, index, result, trip, lockType);
      if (result.nationality || result.passportNumber) {
        refreshHint(
          index,
          result.nationality ?? getValues?.(`passengers.${index}.nationality`) ?? '',
          result.passportNumber ?? getValues?.(`passengers.${index}.passportNumber`) ?? '',
        );
      }
      checkRow(index);
      onScanned?.(index, result);
    } catch (e) {
      setScanError(errorMessage(e));
    } finally {
      setScanning(null);
    }
  };

  return (
    <div className="space-y-4">
      {scanError && (
        <p role="alert" className="px-5 text-xs font-medium text-danger">
          {scanError} You can still type the details.
        </p>
      )}
      {fields.map((f, offset) => {
        const i = startIndex + offset;
        const e = errors?.[i];
        return (
          <div
            key={f.id}
            className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_repeat(6,minmax(0,1fr))_auto]"
          >
            <div className="flex items-start pt-7">
              <span className="flex size-7 items-center justify-center rounded-full bg-danger text-[12px] font-semibold text-white">
                {offset + 1}
              </span>
            </div>
            <Field label="Title" required error={e?.title?.message}>
              <Select
                {...register(`passengers.${i}.title`, {
                  onChange: (ev) => {
                    setValue(`passengers.${i}.gender`, genderFromTitle(ev.target.value as Title));
                    checkRow(i);
                  },
                })}
              >
                {TITLES.map((t) => (
                  <option key={t} value={t}>
                    {TITLE_LABEL[t] ?? titleCase(t)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Surname" required error={e?.lastName?.message}>
              <Input
                autoComplete="off"
                placeholder="LAST NAME"
                className="uppercase"
                {...register(`passengers.${i}.lastName`)}
              />
            </Field>
            <Field label="Given name" required error={e?.firstName?.message}>
              <Input
                autoComplete="off"
                placeholder="FIRST NAME"
                className="uppercase"
                {...register(`passengers.${i}.firstName`)}
              />
            </Field>
            <Field
              label="Passport"
              required
              error={e?.passportNumber?.message}
              hint={hints[i] || undefined}
            >
              <MaskedInput
                mask={formatPassport}
                autoComplete="off"
                placeholder="PASSPORT #"
                className="uppercase tabular"
                {...register(`passengers.${i}.passportNumber`, {
                  onChange: (ev) => {
                    refreshHint(
                      i,
                      getValues?.(`passengers.${i}.nationality`) ?? 'PK',
                      ev.target.value,
                    );
                  },
                  onBlur: () => checkRow(i),
                })}
              />
            </Field>
            <Field label="Date of birth" required error={e?.dateOfBirth?.message}>
              <Input
                type="date"
                {...register(`passengers.${i}.dateOfBirth`, { onBlur: () => checkRow(i) })}
              />
            </Field>
            <Field label="Passport expiry" required error={e?.passportExpiry?.message}>
              <Input
                type="date"
                {...register(`passengers.${i}.passportExpiry`, { onBlur: () => checkRow(i) })}
              />
            </Field>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:col-span-full lg:col-span-1 lg:grid-cols-1">
              <Field label="Nationality" required error={e?.nationality?.message}>
                <Select
                  {...register(`passengers.${i}.nationality`, {
                    onChange: (ev) =>
                      refreshHint(
                        i,
                        ev.target.value,
                        getValues?.(`passengers.${i}.passportNumber`) ?? '',
                      ),
                  })}
                >
                  {NATIONALITIES.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="pb-0.5 lg:pt-6">
                <input
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(ev) => {
                    void scan(i, ev.target.files?.[0]);
                    ev.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  loading={scanning === i}
                  onClick={() => inputs.current[i]?.click()}
                >
                  <ScanLine /> Scan passport
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
