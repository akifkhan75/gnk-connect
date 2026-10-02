import type { VoucherType } from '@gnk/types';

export type PaymentPayee = 'SUPPLIER' | 'EXPENSE' | 'STAFF';

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  SALE: 'Sale',
  RECEIPT: 'Receipt',
  PAYMENT: 'Payment',
  JOURNAL: 'Journal',
  REVERSAL: 'Reversal',
  ADJUSTMENT: 'Adjustment',
};

export const PAYEE_LABEL: Record<PaymentPayee, string> = {
  SUPPLIER: 'Supplier',
  EXPENSE: 'Expense',
  STAFF: 'Staff',
};

export function isPaymentPayee(value: string | null | undefined): value is PaymentPayee {
  return value === 'SUPPLIER' || value === 'EXPENSE' || value === 'STAFF';
}

export function voucherModulePath(type: string) {
  if (type === 'PAYMENT') return '/payments?tab=outgoing';
  if (type === 'RECEIPT') return '/accounting/receipts';
  return '/accounting/vouchers';
}
