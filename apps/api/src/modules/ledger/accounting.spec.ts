import { PARTNER_ROLE_CAPABILITIES, partnerCan } from '@gnk/types';
import { allocationsWithinAmount, toBaseAmount, voucherLineSchema } from '@gnk/validation';
import { matches } from '../realtime/audience';
import type { PartnerActor, StaffActor } from '../auth/auth.types';

describe('foreign currency conversion', () => {
  it('multiplies and rounds half-up to paisa', () => {
    expect(toBaseAmount(1000, 70)).toBe(70000);
    expect(toBaseAmount(1234.56, 74.3525)).toBe(91792.62); // 91792.6156…
    expect(toBaseAmount(0.01, 0.5)).toBe(0.01); // 0.005 rounds up
    expect(toBaseAmount(0.01, 0.4)).toBe(0); // 0.004 rounds down
  });

  it('stays exact where floating point would drift', () => {
    expect(toBaseAmount(0.1, 3)).toBe(0.3);
    expect(toBaseAmount(999_999_999.99, 280.123456)).toBe(280123455997.2);
  });
});

describe('voucher lines', () => {
  const id = '0190f3a0-0000-7000-8000-000000000001';
  it('needs a PKR amount or a foreign amount with a rate', () => {
    expect(voucherLineSchema.safeParse({ accountId: id, side: 'DEBIT', amount: 10 }).success).toBe(
      true,
    );
    expect(
      voucherLineSchema.safeParse({ accountId: id, side: 'DEBIT', fcAmount: 10, rate: 70 }).success,
    ).toBe(true);
    expect(
      voucherLineSchema.safeParse({ accountId: id, side: 'DEBIT', fcAmount: 10 }).success,
    ).toBe(false);
    expect(
      voucherLineSchema.safeParse({ accountId: id, side: 'DEBIT', rate: 70.1234567, fcAmount: 1 })
        .success,
    ).toBe(false);
  });
});

describe('payment allocations', () => {
  const a = (bookingId: string, amount: number) => ({ bookingId, amount });
  it('may not exceed the payment or repeat a booking', () => {
    expect(allocationsWithinAmount({ amount: 100, allocations: [a('x', 60), a('y', 40)] })).toBe(
      true,
    );
    expect(allocationsWithinAmount({ amount: 100, allocations: [a('x', 60.01), a('y', 40)] })).toBe(
      false,
    );
    expect(allocationsWithinAmount({ amount: 100, allocations: [a('x', 10), a('x', 10)] })).toBe(
      false,
    );
    expect(allocationsWithinAmount({ amount: 0.3, allocations: [a('x', 0.1), a('y', 0.2)] })).toBe(
      true,
    );
  });
});

describe('partner capabilities', () => {
  it('matches the fixed roles', () => {
    expect(partnerCan('OWNER', 'account:manage')).toBe(true);
    expect(partnerCan('MANAGER', 'account:manage')).toBe(false);
    expect(partnerCan('STAFF', 'payments:view')).toBe(false);
    expect(partnerCan('ACCOUNTANT', 'bookings:create')).toBe(false);
    expect(partnerCan('ACCOUNTANT', 'ledger:view')).toBe(true);
    expect(Object.keys(PARTNER_ROLE_CAPABILITIES)).toHaveLength(4);
  });
});

describe('realtime audiences', () => {
  const staff = {
    realm: 'STAFF',
    userId: 's1',
    permissions: new Set(['ledger:read']),
  } as unknown as StaffActor;
  const partner = { realm: 'PARTNER', userId: 'p1', accountId: 'a1' } as unknown as PartnerActor;

  it('routes by realm, account, permission and user', () => {
    expect(matches({ realm: 'STAFF' }, staff)).toBe(true);
    expect(matches({ realm: 'STAFF', permission: 'ledger:read' }, staff)).toBe(true);
    expect(matches({ realm: 'STAFF', permission: 'payments:read' }, staff)).toBe(false);
    expect(matches({ realm: 'PARTNER', accountId: 'a1' }, partner)).toBe(true);
    expect(matches({ realm: 'PARTNER', accountId: 'a2' }, partner)).toBe(false);
    expect(matches({ realm: 'PARTNER', accountId: 'a1' }, staff)).toBe(false);
    expect(matches({ realm: 'STAFF', userIds: ['p1'] }, partner)).toBe(false);
    expect(matches({ realm: 'PARTNER', userIds: ['p1'] }, partner)).toBe(true);
  });
});
