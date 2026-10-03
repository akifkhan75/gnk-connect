import {
  addMonthsIso,
  ageOn,
  checkBookingPassengers,
  partyFromSeats,
  paxTypeFromDob,
  pkPassportHint,
  seatDiscountTotal,
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

    const granted = checkBookingPassengers(
      [
        adult(),
        adult({
          type: 'INFANT',
          firstName: 'Noor',
          dateOfBirth: '2025-06-01',
          passportNumber: 'CD9876543',
        }),
      ],
      1,
      trip,
      { grantedInfantSeats: 1 },
    );
    expect(
      granted.filter((i) => i.code === 'INFANT_NOT_ALLOWED' || i.code === 'SEAT_COUNT'),
    ).toEqual([]);
  });

  it('lets a granted extra child sit on a one-adult hold', () => {
    const child = adult({
      type: 'CHILD',
      title: 'MSTR',
      firstName: 'Omar',
      dateOfBirth: '2018-01-01',
      passportNumber: 'CD9876543',
    });
    const createTime = checkBookingPassengers([adult(), child], 2, trip);
    expect(createTime.some((i) => i.code === 'CHILD_RATIO')).toBe(true);

    const afterGrant = checkBookingPassengers([adult(), child], 2, trip, {
      exactSeats: false,
      childSeatQuota: 1,
    });
    expect(afterGrant.filter((i) => i.code === 'CHILD_RATIO' || i.code === 'CHILD_QUOTA')).toEqual(
      [],
    );
  });

  it('computes AirDesk per-seat discounts from the current party', () => {
    expect(partyFromSeats(11, 1, 1)).toEqual({ adults: 10, children: 1, infants: 1 });
    expect(
      seatDiscountTotal(
        { adultAmount: 10000, childAmount: 3000, infantAmount: 0 },
        partyFromSeats(1, 0, 0),
      ),
    ).toBe(10000);
    expect(
      seatDiscountTotal(
        { adultAmount: 10000, childAmount: 3000, infantAmount: 0 },
        partyFromSeats(11, 1, 0),
      ),
    ).toBe(103000);
  });

  it('accepts a valid adult and only warns on PK passport format', () => {
    expect(checkBookingPassengers([adult()], 1, trip)).toEqual([]);
    expect(pkPassportHint('PK', 'A1234567')).toMatch(/two letters/);
    expect(pkPassportHint('PK', 'AB1234567')).toBeUndefined();
    expect(pkPassportHint('AE', 'A1234567')).toBeUndefined();
  });
});
