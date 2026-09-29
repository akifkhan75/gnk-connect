import { needsTwoApprovers } from '../../modules/payments/approval';
import { toWaNumber } from './wa-number';

describe('WhatsApp numbers', () => {
  it('normalises Pakistani mobile numbers to international format', () => {
    expect(toWaNumber('+92 300 1234567')).toBe('923001234567');
    expect(toWaNumber('03001234567')).toBe('923001234567');
    expect(toWaNumber('0092-300-1234567')).toBe('923001234567');
    expect(toWaNumber('+966 55 123 4567')).toBe('966551234567');
  });

  it('rejects things that are not phone numbers', () => {
    expect(toWaNumber('')).toBeNull();
    expect(toWaNumber('12345')).toBeNull();
  });
});

describe('two approvers for large payments', () => {
  it('applies at or above the limit, and not when it is 0', () => {
    expect(needsTwoApprovers(500_000, 500_000)).toBe(true);
    expect(needsTwoApprovers(499_999.99, 500_000)).toBe(false);
    expect(needsTwoApprovers(10_000_000, 0)).toBe(false);
  });
});
