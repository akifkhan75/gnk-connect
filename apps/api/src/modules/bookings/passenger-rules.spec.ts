import {
  addMonthsIso,
  ageOn,
  checkBookingPassengers,
  paxTypeFromDob,
  pkPassportHint,
  validatePassengerList,
} from '@gnk/validation';

const trip = { departureDate: '2026-11-01', returnDate: '2026-12-01' };

function adult(overrides: Record<string, string> = {}) {
  return {
    type: 'ADULT' as const,
    title: 'MR' as const,
    firstName: 'Ali',
    lastName: 'Khan',
    gender: 'MALE' as const,
    dateOfBirth: '1990-01-01',
    nationality: 'PK',
    passportNumber: 'AB1234567',
    passportExpiry: '2030-01-01',
    ...overrides,
  };
}

describe('AirDesk passenger rules', () => {
  it('derives pax type from age on departure', () => {
    expect(ageOn('2014-11-01', '2026-11-01')).toBe(12);
    expect(paxTypeFromDob('2014-11-01', '2026-11-01')).toBe('ADULT');
    expect(paxTypeFromDob('2014-11-02', '2026-11-01')).toBe('CHILD');
    expect(paxTypeFromDob('2024-11-01', '2026-11-01')).toBe('CHILD');
    expect(paxTypeFromDob('2024-11-02', '2026-11-01')).toBe('INFANT');
  });

  it('requires passport validity 6 months after return', () => {
    expect(addMonthsIso('2026-12-01', 6)).toBe('2027-06-01');
    const issues = checkBookingPassengers([adult({ passportExpiry: '2027-05-31' })], 1, trip);
    expect(issues.some((i) => i.code === 'PASSPORT_EXPIRES_TOO_SOON')).toBe(true);
  });

  it('rejects type/age mismatch, MSTR on adults, and duplicate passports', () => {
    const childDob = checkBookingPassengers([adult({ dateOfBirth: '2018-01-01' })], 1, trip);
    expect(childDob.some((i) => i.code === 'PAX_TYPE_MISMATCH')).toBe(true);

    const parsed = validatePassengerList(
      [adult({ title: 'MSTR', dateOfBirth: '1990-01-01' })],
      1,
      trip,
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.issues.some((i) => i.message.includes('MSTR'))).toBe(true);

    const dupes = checkBookingPassengers(
      [adult(), adult({ firstName: 'Omar', passportNumber: 'AB1234567' })],
      2,
      trip,
    );
    expect(dupes.some((i) => i.code === 'DUPLICATE_PASSPORT')).toBe(true);
  });

  it('enforces one adult minimum and 1 child per 10 adults', () => {
    const onlyChild = checkBookingPassengers(
      [adult({ type: 'CHILD', title: 'MSTR', dateOfBirth: '2018-01-01' })],
      1,
      trip,
    );
    expect(onlyChild.some((i) => i.code === 'ADULT_REQUIRED')).toBe(true);
    expect(onlyChild.some((i) => i.code === 'CHILD_RATIO')).toBe(true);

    const infant = checkBookingPassengers(
      [adult({ type: 'INFANT', dateOfBirth: '2025-06-01' })],
      1,
      trip,
    );
    expect(infant.some((i) => i.code === 'INFANT_NOT_ALLOWED')).toBe(true);
  });

  it('accepts a valid adult and only warns on PK passport format', () => {
    expect(checkBookingPassengers([adult()], 1, trip)).toEqual([]);
    expect(pkPassportHint('PK', 'A1234567')).toMatch(/two letters/);
    expect(pkPassportHint('PK', 'AB1234567')).toBeUndefined();
    expect(pkPassportHint('AE', 'A1234567')).toBeUndefined();
  });
});
