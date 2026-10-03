import type { Gender, PaxType, Title } from '@gnk/types';

/** AirDesk / plan 09: one child seat per 10 adults. Infants do not take a seat. */
export const CHILD_PER_ADULTS = 10;

/** Pakistani passport MRZ pattern — warning only when nationality is PK. */
export const PK_PASSPORT = /^[A-Z]{2}\d{7}$/;

export type TripDates = { departureDate: string; returnDate: string };

export type PassengerCheck = {
  type: PaxType;
  title: Title;
  gender: Gender;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
};

export type FieldIssue = { path: string; message: string; code?: string };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DAY.test(value);
}

export function addMonthsIso(isoDay: string, months: number): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Whole years of age on `onDate` (YYYY-MM-DD), calendar-safe. */
export function ageOn(dob: string, onDate: string): number {
  const [y, m, day] = dob.split('-').map(Number);
  const [Y, M, D] = onDate.split('-').map(Number);
  let age = Y - y;
  if (M < m || (M === m && D < day)) age -= 1;
  return age;
}

/** ADULT ≥ 12, CHILD 2–11, INFANT < 2 on the departure date. */
export function paxTypeFromDob(dob: string, departureDate: string): PaxType {
  const age = ageOn(dob, departureDate);
  if (age < 2) return 'INFANT';
  if (age < 12) return 'CHILD';
  return 'ADULT';
}

export function genderFromTitle(title: Title): Gender {
  return title === 'MR' || title === 'MSTR' ? 'MALE' : 'FEMALE';
}

export function pkPassportHint(nationality: string, passportNumber: string): string | undefined {
  if (nationality.toUpperCase() !== 'PK') return;
  const n = passportNumber.toUpperCase().replace(/\s/g, '');
  if (!n) return;
  if (!PK_PASSPORT.test(n)) {
    return 'Pakistani passports are usually two letters and seven digits (e.g. AB1234567)';
  }
}

export function checkPassenger(p: PassengerCheck, trip: TripDates, index?: number): FieldIssue[] {
  const prefix = index === undefined ? '' : `passengers.${index}.`;
  const issues: FieldIssue[] = [];

  if (genderFromTitle(p.title) !== p.gender) {
    issues.push({
      path: `${prefix}title`,
      message: `Title ${p.title} does not match gender`,
      code: 'TITLE_GENDER_MISMATCH',
    });
  }
  if (p.title === 'MSTR' && (p.type !== 'CHILD' || p.gender !== 'MALE')) {
    issues.push({
      path: `${prefix}title`,
      message: 'MSTR is for male children only',
      code: 'MSTR_TITLE',
    });
  }

  if (p.type === 'INFANT') {
    issues.push({
      path: `${prefix}dateOfBirth`,
      message: 'Infant fare is not configured for this group',
      code: 'INFANT_NOT_ALLOWED',
    });
  }

  if (isIsoDate(p.dateOfBirth) && isIsoDate(trip.departureDate)) {
    const derived = paxTypeFromDob(p.dateOfBirth, trip.departureDate);
    if (derived !== p.type) {
      issues.push({
        path: `${prefix}dateOfBirth`,
        message:
          derived === 'INFANT'
            ? 'Infant fare is not configured for this group'
            : `This passenger is a ${derived.toLowerCase()} on the departure date`,
        code: 'PAX_TYPE_MISMATCH',
      });
    }
  }

  if (isIsoDate(p.passportExpiry) && isIsoDate(trip.returnDate)) {
    const minExpiry = addMonthsIso(trip.returnDate, 6);
    if (p.passportExpiry < minExpiry) {
      issues.push({
        path: `${prefix}passportExpiry`,
        message: 'Must be valid 6 months after return',
        code: 'PASSPORT_EXPIRES_TOO_SOON',
      });
    }
  }

  return issues;
}

export function checkPassengerParty(passengers: PassengerCheck[], seats: number): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const adults = passengers.filter((p) => p.type === 'ADULT').length;
  const children = passengers.filter((p) => p.type === 'CHILD').length;
  const infants = passengers.filter((p) => p.type === 'INFANT').length;

  if (adults < 1) {
    issues.push({
      path: 'passengers',
      message: 'At least one adult is required',
      code: 'ADULT_REQUIRED',
    });
  }

  const maxChildren = Math.floor(adults / CHILD_PER_ADULTS);
  if (children > maxChildren) {
    issues.push({
      path: 'passengers',
      message: '1 child is allowed per 10 adults',
      code: 'CHILD_RATIO',
    });
  }

  if (infants > 0) {
    issues.push({
      path: 'passengers',
      message: 'Infant fare is not configured for this group',
      code: 'INFANT_NOT_ALLOWED',
    });
  }

  if (adults + children !== seats) {
    issues.push({
      path: 'passengers',
      message: `Enter details for exactly ${seats} passenger${seats > 1 ? 's' : ''}`,
      code: 'SEAT_COUNT',
    });
  }

  const seen = new Map<string, number>();
  passengers.forEach((p, i) => {
    const key = p.passportNumber.toUpperCase().replace(/\s/g, '');
    if (!key) return;
    if (seen.has(key)) {
      issues.push({
        path: `passengers.${i}.passportNumber`,
        message: 'This passport is already used on this booking',
        code: 'DUPLICATE_PASSPORT',
      });
    } else {
      seen.set(key, i);
    }
  });

  return issues;
}

export function checkBookingPassengers(
  passengers: PassengerCheck[],
  seats: number,
  trip: TripDates,
): FieldIssue[] {
  return [
    ...checkPassengerParty(passengers, seats),
    ...passengers.flatMap((p, i) => checkPassenger(p, trip, i)),
  ];
}
