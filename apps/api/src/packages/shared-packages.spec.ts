import {
  allocationsWithinAmount,
  cnicSchema,
  digitsOnly,
  emailSchema,
  formatCnic,
  formatNtn,
  formatPassport,
  formatPhonePk,
  maskTail,
  moneySchema,
  partyFromSeats,
  requestConcessionSchema,
  partnerRegisterSchema,
  passwordSchema,
  phonePkSchema,
  seatDiscountTotal,
  toBaseAmount,
  zeroMoneySchema,
  toE164Pk,
  todayPk,
} from '@gnk/validation';
import { MockAirDeskAdapter, SupplierError } from '@gnk/suppliers';
import { partnerCan, notificationCategory, STAFF_ROLES } from '@gnk/types';
import { ApiError, trimTrailingSlashes } from '@gnk/api-client';
import {
  amountInWords,
  daysUntil,
  formatBytes,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  initials,
  titleCase,
} from '@gnk/ui/format';

describe('@gnk/validation', () => {
  it('masks Pakistani identifiers', () => {
    expect(digitsOnly('35201-1234567-1')).toBe('3520112345671');
    expect(formatCnic('3520112345671')).toBe('35201-1234567-1');
    expect(formatCnic('35201')).toBe('35201');
    expect(formatNtn('12345678')).toBe('1234567-8');
    expect(formatPhonePk('03001234567')).toBe('+92 300 1234567');
    expect(toE164Pk('3001234567')).toBe('+923001234567');
    expect(formatPassport('ab-1234567')).toBe('AB1234567');
    expect(maskTail('1234567')).toBe('•••• 4567');
    expect(maskTail(null)).toBe('');
  });

  it('validates common schemas', () => {
    expect(emailSchema.parse('  ali@gnk.test  ')).toBe('ali@gnk.test');
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(phonePkSchema.parse('03001234567')).toBe('+923001234567');
    expect(cnicSchema.parse('35201-1234567-1')).toBe('3520112345671');
    expect(moneySchema.parse('12.50')).toBe(12.5);
    expect(moneySchema.safeParse(12.555).success).toBe(false);
    expect(todayPk()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      allocationsWithinAmount({
        amount: 100,
        allocations: [
          { bookingId: 'a', amount: 40 },
          { bookingId: 'b', amount: 60 },
        ],
      }),
    ).toBe(true);
    expect(toBaseAmount(1000, 70)).toBe(70000);
    expect(zeroMoneySchema.parse('')).toBe(0);
    expect(zeroMoneySchema.parse(0)).toBe(0);
    const discount = requestConcessionSchema.parse({
      type: 'DISCOUNT',
      adultAmount: 10000,
      childAmount: '3000',
    });
    expect(discount).toMatchObject({
      type: 'DISCOUNT',
      adultAmount: 10000,
      childAmount: 3000,
      infantAmount: 0,
    });
    expect(requestConcessionSchema.safeParse({ type: 'DISCOUNT' }).success).toBe(false);
    if (discount.type !== 'DISCOUNT') throw new Error('expected discount concession');
    expect(seatDiscountTotal(discount, partyFromSeats(11, 1, 0))).toBe(103000);
  });

  it('validates partner registration', () => {
    const agency = partnerRegisterSchema.safeParse({
      accountType: 'AGENCY',
      email: 'owner@agency.test',
      password: 'long-enough-password',
      confirmPassword: 'long-enough-password',
      acceptTerms: true,
      fullName: 'Ali Khan',
      mobile: '03001234567',
      city: 'Lahore',
      address: 'Street 1',
      legalName: 'Al Noor Travels',
      dtsLicenseNo: 'DTS-1',
      ntn: '1234567',
    });
    expect(agency.success).toBe(true);
  });
});

describe('@gnk/suppliers MockAirDeskAdapter', () => {
  const frozen = new Date('2026-10-15T00:00:00Z');
  const adapter = new MockAirDeskAdapter(() => frozen);

  it('lists products and books idempotently', async () => {
    const products = await adapter.listProducts();
    expect(products.length).toBeGreaterThan(0);
    const first = products.find((p) => p.departures.length > 0)!;
    const dep = first.departures[0];
    const avail = await adapter.checkAvailability(
      first.supplierProductId,
      dep.supplierDepartureId,
      1,
    );
    expect(avail.available).toBe(true);
    const req = {
      supplierProductId: first.supplierProductId,
      supplierDepartureId: dep.supplierDepartureId,
      seats: 1,
      idempotencyKey: 'GNK-TEST-1',
      passengers: [],
    };
    const booked = await adapter.createBooking(req);
    expect(booked.status).toBe('CONFIRMED');
    const again = await adapter.createBooking(req);
    expect(again.supplierBookingRef).toBe(booked.supplierBookingRef);
    const status = await adapter.getBookingStatus(booked.supplierBookingRef);
    expect(status.pnr).toBe(booked.pnr);
    const cancelled = await adapter.cancelBooking(booked.supplierBookingRef);
    expect(cancelled.status).toBe('CANCELLED');
    await expect(adapter.getBookingStatus('missing')).rejects.toBeInstanceOf(SupplierError);
  });
});

describe('@gnk/types helpers', () => {
  it('maps partner capabilities and notification categories', () => {
    expect(partnerCan('OWNER', 'account:manage')).toBe(true);
    expect(partnerCan('STAFF', 'payments:submit')).toBe(false);
    expect(notificationCategory('BOOKING_APPROVED')).toBe('bookings');
    expect(notificationCategory('PAYMENT_VERIFIED')).toBe('payments');
    expect(notificationCategory('VOUCHER_POSTED')).toBe('accounting');
    expect(STAFF_ROLES.SUPER_ADMIN.permissions.length).toBeGreaterThan(10);
  });
});

describe('@gnk/api-client', () => {
  it('trims slashes and parses problem details', () => {
    expect(trimTrailingSlashes('http://x.test///')).toBe('http://x.test');
    const err = new ApiError({
      status: 422,
      detail: 'invalid',
      errors: [{ path: 'email', message: 'required' }],
    });
    expect(err.fieldErrors.email).toBe('required');
  });
});

describe('@gnk/ui format', () => {
  it('formats money, dates, and words', () => {
    expect(formatMoney(195000)).toMatch(/PKR/);
    expect(formatMoney(null)).toBe('—');
    expect(formatMoneyCompact(1_250_000)).toMatch(/M/);
    expect(formatMoneyCompact(45000)).toMatch(/K/);
    expect(formatDate('2026-10-01')).toMatch(/2026/);
    expect(titleCase('PENDING_APPROVAL')).toBe('Pending Approval');
    expect(initials('Ali Khan')).toBe('AK');
    expect(formatBytes(2048)).toMatch(/KB/);
    expect(amountInWords(70.5)).toMatch(/Rupees/);
    expect(amountInWords(0)).toMatch(/Zero/);
    expect(typeof daysUntil('2026-12-01')).toBe('number');
  });
});
