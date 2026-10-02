import type { Gender, PaxType, Title } from '@gnk/types';

/** AirDesk / plan 09: one child seat per 10 adults. Infants do not take a seat. */
export const CHILD_PER_ADULTS = 10;

export type PartyRules = {
  /** Require adults+children === seats (create / fill-all). Default true. */
  exactSeats?: boolean;
  /** Lap-infant quota granted on the booking. Default 0 (infants blocked). */
  grantedInfantSeats?: number;
  /** Max seated children on this booking (create-time + granted). */
  childSeatQuota?: number;
};

export function maxChildSeatsForAdults(adults: number) {
  return Math.floor(Math.max(0, adults) / CHILD_PER_ADULTS);
}

/** One lap infant per adult; infants do not occupy a seat. */
export function maxInfantSeatsForAdults(adults: number) {
  return Math.max(0, adults);
}

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

export function checkPassenger(
  p: PassengerCheck,
  trip: TripDates,
  index?: number,
  rules: PartyRules = {},
): FieldIssue[] {
  const prefix = index === undefined ? '' : `passengers.${index}.`;
  const issues: FieldIssue[] = [];
  const infantQuota = rules.grantedInfantSeats ?? 0;

  if (genderFromTitle(p.title) !== p.gender) {
    issues.push({
      path: `${prefix}title`,
      message: `Title ${p.title} does not match gender`,
      code: 'TITLE_GENDER_MISMATCH',
    });
  }
  if (p.title === 'MSTR' && p.gender !== 'MALE') {
    issues.push({
      path: `${prefix}title`,
      message: 'MSTR is for male children only',
      code: 'MSTR_TITLE',
    });
  }
  if (p.title === 'MSTR' && p.type === 'ADULT') {
    issues.push({
      path: `${prefix}title`,
      message: 'MSTR is for male children only',
      code: 'MSTR_TITLE',
    });
  }

  if (p.type === 'INFANT' && infantQuota < 1) {
    issues.push({
      path: `${prefix}dateOfBirth`,
      message: 'Infant seats must be requested and granted before adding an infant',
      code: 'INFANT_NOT_ALLOWED',
    });
  }

  if (isIsoDate(p.dateOfBirth) && isIsoDate(trip.departureDate)) {
    const derived = paxTypeFromDob(p.dateOfBirth, trip.departureDate);
    if (derived !== p.type) {
      issues.push({
        path: `${prefix}dateOfBirth`,
        message:
          derived === 'INFANT' && infantQuota < 1
            ? 'Infant seats must be requested and granted before adding an infant'
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

export function checkPassengerParty(
  passengers: PassengerCheck[],
  seats: number,
  rules: PartyRules = {},
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const adults = passengers.filter((p) => p.type === 'ADULT').length;
  const children = passengers.filter((p) => p.type === 'CHILD').length;
  const infants = passengers.filter((p) => p.type === 'INFANT').length;
  const seated = adults + children;
  const exact = rules.exactSeats !== false;
  const infantQuota = rules.grantedInfantSeats ?? 0;

  if (seated > 0 && adults < 1) {
    issues.push({
      path: 'passengers',
      message: 'At least one adult is required',
      code: 'ADULT_REQUIRED',
    });
  }

  const maxChildren = maxChildSeatsForAdults(adults);
  if (children > maxChildren) {
    issues.push({
      path: 'passengers',
      message: '1 child is allowed per 10 adults',
      code: 'CHILD_RATIO',
    });
  }

  if (rules.childSeatQuota != null && children > rules.childSeatQuota) {
    issues.push({
      path: 'passengers',
      message: 'Child seats on this booking have not been granted',
      code: 'CHILD_QUOTA',
    });
  }

  if (infants > infantQuota) {
    issues.push({
      path: 'passengers',
      message:
        infantQuota < 1
          ? 'Infant seats must be requested and granted before adding an infant'
          : `This booking allows ${infantQuota} infant${infantQuota === 1 ? '' : 's'}`,
      code: infantQuota < 1 ? 'INFANT_NOT_ALLOWED' : 'INFANT_QUOTA',
    });
  }

  if (exact && seated !== seats) {
    issues.push({
      path: 'passengers',
      message: `Enter details for exactly ${seats} passenger${seats > 1 ? 's' : ''}`,
      code: 'SEAT_COUNT',
    });
  } else if (!exact && seated > seats) {
    issues.push({
      path: 'passengers',
      message: `This booking has ${seats} seat${seats > 1 ? 's' : ''}`,
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
  rules: PartyRules = {},
): FieldIssue[] {
  return [
    ...checkPassengerParty(passengers, seats, rules),
    ...passengers.flatMap((p, i) => checkPassenger(p, trip, i, rules)),
  ];
}
