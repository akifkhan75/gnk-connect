import { z } from 'zod';
import { ACCOUNT_CLASSES, VOUCHER_STATUSES, VOUCHER_TYPES } from '@gnk/types';
import { isoDateSchema, moneySchema, optionalText, paginationSchema, uuidSchema } from './common';

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. SAR');

/** PKR per 1 unit of foreign currency: positive, at most 6 decimals. */
export const rateSchema = z.coerce
  .number({ error: 'Enter the conversion rate' })
  .positive('Rate must be greater than zero')
  .max(1_000_000, 'Rate is too large')
  .refine((v) => Math.abs(v * 1e6 - Math.round(v * 1e6)) < 1e-6, 'Use at most 6 decimals');

/**
 * Converts a foreign amount to PKR exactly as the API does: fcAmount × rate,
 * rounded half-up to 2 decimals. Integer arithmetic avoids float drift.
 */
export function toBaseAmount(fcAmount: number, rate: number): number {
  const product = BigInt(Math.round(fcAmount * 100)) * BigInt(Math.round(rate * 1e6)); // 1e-8 PKR
  const cents = (product + 500_000n) / 1_000_000n;
  return Number(cents) / 100;
}

// ---------- Chart of accounts ----------

export const accountCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z][0-9A-Z-]{1,19}$/, 'Use 2–20 digits, letters or dashes, e.g. 1122'),
  name: z.string().trim().min(2, 'Enter the account name').max(120),
  class: z.enum(ACCOUNT_CLASSES),
  parentId: uuidSchema.nullable().optional(),
  isGroup: z.boolean().default(false),
  currency: currencyCode.default('PKR'),
  description: optionalText(300),
});
export type AccountCreateInput = z.input<typeof accountCreateSchema>;

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: accountCreateSchema.shape.code.optional(),
  parentId: uuidSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  description: optionalText(300),
});
export type AccountUpdateInput = z.input<typeof accountUpdateSchema>;

// ---------- Vouchers ----------

export const voucherLineSchema = z
  .object({
    accountId: uuidSchema,
    side: z.enum(['DEBIT', 'CREDIT']),
    /** PKR amount; for foreign-currency accounts it is calculated from fcAmount × rate. */
    amount: moneySchema.optional(),
    fcAmount: moneySchema.optional(),
    rate: rateSchema.optional(),
    narration: optionalText(200),
  })
  .refine((l) => l.amount != null || (l.fcAmount != null && l.rate != null), {
    path: ['amount'],
    message: 'Enter an amount',
  });
export type VoucherLineInput = z.input<typeof voucherLineSchema>;
export type VoucherLine = z.output<typeof voucherLineSchema>;

/** Manual vouchers. SALE/REVERSAL/ADJUSTMENT are system-generated only. */
export const MANUAL_VOUCHER_TYPES = ['JOURNAL', 'RECEIPT', 'PAYMENT'] as const;

export const voucherSchema = z.object({
  type: z.enum(MANUAL_VOUCHER_TYPES),
  date: isoDateSchema,
  description: z.string().trim().min(3, 'Enter a narration').max(300),
  partnerAccountId: uuidSchema.nullable().optional(),
  lines: z.array(voucherLineSchema).min(2, 'Add at least two lines').max(100),
  attachmentIds: z.array(uuidSchema).max(10).default([]),
});
export type VoucherInput = z.input<typeof voucherSchema>;

export const voucherListSchema = paginationSchema.extend({
  type: z.enum([...VOUCHER_TYPES, 'all'] as [string, ...string[]]).default('all'),
  status: z.enum([...VOUCHER_STATUSES, 'all'] as [string, ...string[]]).default('all'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  accountId: uuidSchema.optional(),
});
export type VoucherListInput = z.input<typeof voucherListSchema>;

export const voucherRejectSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(500),
});

export const voucherReverseSchema = z.object({
  date: isoDateSchema,
  reason: z.string().trim().min(3, 'Give a reason').max(300),
});
export type VoucherReverseInput = z.input<typeof voucherReverseSchema>;

/** Self-approval of a journal voucher (single-finance-user setups) must be justified. */
export const voucherApproveSchema = z
  .object({ selfApprovalReason: optionalText(300) })
  .default({ selfApprovalReason: undefined });

// ---------- Reports ----------

export const ledgerRangeSchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const trialBalanceSchema = z.object({ asOf: isoDateSchema.optional() });

// ---------- Currencies, rates, periods ----------

export const currencySchema = z.object({
  code: currencyCode,
  name: z.string().trim().min(2).max(60),
  symbol: optionalText(8),
  isActive: z.boolean().default(true),
});
export type CurrencyInput = z.input<typeof currencySchema>;

export const exchangeRateSchema = z.object({
  currency: currencyCode.refine((c) => c !== 'PKR', 'PKR is the base currency'),
  rate: rateSchema,
  date: isoDateSchema,
  note: optionalText(200),
});
export type ExchangeRateInput = z.input<typeof exchangeRateSchema>;

export const periodSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM'),
});
