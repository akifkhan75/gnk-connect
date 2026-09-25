import { z } from 'zod';
import {
  KYC_DOC_STATUSES,
  MARKUP_TYPES,
  PARTNER_ACCOUNT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRICING_SCOPES,
  PRODUCT_TYPES,
  ROUNDING_MODES,
  STAFF_ROLE_KEYS,
} from '@gnk/types';
import { emailSchema, isoDateSchema, moneySchema, optionalText, uuidSchema } from './common';

const page = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
};

// ---------- Partners ----------

export const adminPartnerListSchema = z.object({
  ...page,
  status: z
    .enum([...PARTNER_ACCOUNT_STATUSES, 'PENDING', 'all'] as [string, ...string[]])
    .default('all'),
});

export const PARTNER_REVIEW_ACTIONS = [
  'start_review',
  'approve',
  'reject',
  'request_info',
  'suspend',
  'reactivate',
] as const;
export type PartnerReviewAction = (typeof PARTNER_REVIEW_ACTIONS)[number];

export const partnerReviewSchema = z
  .object({
    action: z.enum(PARTNER_REVIEW_ACTIONS),
    note: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (['reject', 'request_info', 'suspend'].includes(v.action) && !v.note) {
      ctx.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'A reason is required for this action',
      });
    }
  });
export type PartnerReviewInput = z.input<typeof partnerReviewSchema>;

export const creditLimitSchema = z.object({
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').max(999_999_999),
  pricingTierId: uuidSchema.nullable().optional(),
});
export type CreditLimitInput = z.input<typeof creditLimitSchema>;

export const kycReviewSchema = z.object({
  status: z.enum(KYC_DOC_STATUSES.filter((s) => s !== 'SUBMITTED') as [string, ...string[]]),
  note: optionalText(500),
});

// ---------- Bookings ----------

export const adminBookingListSchema = z.object({
  ...page,
  tab: z
    .enum([
      'all',
      'PENDING_APPROVAL',
      'APPROVED',
      'SUPPLIER',
      'CONFIRMED',
      'SUPPLIER_FAILED',
      'CANCELLED',
      'COMPLETED',
    ])
    .default('all'),
  accountId: uuidSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type AdminBookingListInput = z.input<typeof adminBookingListSchema>;

export const bookingDecisionSchema = z.object({ note: optionalText(1000) });
export const bookingRejectSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(1000),
});
export const internalNoteSchema = z.object({ internalNotes: z.string().trim().max(4000) });

// ---------- Payments ----------

export const adminPaymentListSchema = z.object({
  ...page,
  status: z.enum([...PAYMENT_STATUSES, 'all'] as [string, ...string[]]).default('SUBMITTED'),
  accountId: uuidSchema.optional(),
});

export const paymentRejectSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(500),
});

export const recordPaymentSchema = z.object({
  accountId: uuidSchema,
  method: z.enum(PAYMENT_METHODS),
  amount: moneySchema,
  bankName: optionalText(80),
  transactionRef: z.string().trim().min(3, 'Enter a reference').max(60),
  paidAt: isoDateSchema,
  bookingId: uuidSchema.optional().or(z.literal('').transform(() => undefined)),
});
export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

// ---------- Ledger ----------

export const ledgerAdjustmentSchema = z.object({
  direction: z.enum(['CREDIT', 'DEBIT']),
  amount: moneySchema,
  description: z.string().trim().min(5, 'Describe the adjustment').max(300),
});
export type LedgerAdjustmentInput = z.input<typeof ledgerAdjustmentSchema>;

// ---------- Pricing ----------

const nullableUuid = uuidSchema
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));
const nullableMoney = z
  .union([z.coerce.number().min(0), z.literal('').transform(() => null), z.null()])
  .optional();

export const pricingRuleSchema = z
  .object({
    name: z.string().trim().min(3, 'Name the rule').max(120),
    scope: z.enum(PRICING_SCOPES),
    supplierId: nullableUuid,
    productType: z
      .enum(PRODUCT_TYPES)
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
    productId: nullableUuid,
    departureId: nullableUuid,
    accountId: nullableUuid,
    pricingTierId: nullableUuid,
    markupType: z.enum(MARKUP_TYPES),
    markupValue: z.coerce.number().min(0, 'Markup cannot be negative').max(10_000_000),
    minMarkup: nullableMoney,
    maxMarkup: nullableMoney,
    stackable: z.boolean().default(false),
    priority: z.coerce.number().int().min(0).max(1000).default(0),
    rounding: z.enum(ROUNDING_MODES).default('NONE'),
    validFrom: isoDateSchema
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
    validTo: isoDateSchema
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
    isActive: z.boolean().default(true),
  })
  .superRefine((r, ctx) => {
    const need = (field: keyof typeof r, label: string) => {
      if (!r[field]) ctx.addIssue({ code: 'custom', path: [field], message: `Select ${label}` });
    };
    switch (r.scope) {
      case 'PARTNER_PRODUCT':
        need('accountId', 'a partner');
        need('productId', 'a product');
        break;
      case 'PARTNER':
        need('accountId', 'a partner');
        break;
      case 'TIER':
        need('pricingTierId', 'a pricing tier');
        break;
      case 'DEPARTURE':
        need('departureId', 'a departure');
        break;
      case 'PRODUCT':
        need('productId', 'a product');
        break;
      case 'PRODUCT_TYPE':
        need('productType', 'a product type');
        break;
      case 'SUPPLIER':
        need('supplierId', 'a supplier');
        break;
    }
    if (r.markupType === 'PERCENTAGE' && r.markupValue > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['markupValue'],
        message: 'Percentage markup must be 100 or less',
      });
    }
    if (r.validFrom && r.validTo && r.validFrom > r.validTo) {
      ctx.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'End date must be after the start date',
      });
    }
    if (r.minMarkup != null && r.maxMarkup != null && Number(r.minMarkup) > Number(r.maxMarkup)) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxMarkup'],
        message: 'Maximum must be at least the minimum',
      });
    }
  });
export type PricingRuleInput = z.input<typeof pricingRuleSchema>;

export const pricingSimulateSchema = z.object({
  accountId: uuidSchema,
  departureId: uuidSchema,
  seats: z.coerce.number().int().min(1).max(9).default(1),
});
export type PricingSimulateInput = z.input<typeof pricingSimulateSchema>;

export const pricingTierSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: optionalText(200),
});

// ---------- Catalog ----------

export const adminProductListSchema = z.object({
  ...page,
  type: z.enum([...PRODUCT_TYPES, 'all'] as [string, ...string[]]).default('all'),
  published: z.enum(['all', 'yes', 'no']).default('all'),
});

export const productVisibilitySchema = z.object({
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// ---------- Staff ----------

export const staffInviteSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2, 'Enter the full name').max(120),
  roles: z
    .array(z.enum(STAFF_ROLE_KEYS as [string, ...string[]]))
    .min(1, 'Select at least one role'),
});
export type StaffInviteInput = z.input<typeof staffInviteSchema>;

export const staffUpdateSchema = z.object({
  roles: z
    .array(z.enum(STAFF_ROLE_KEYS as [string, ...string[]]))
    .min(1, 'Select at least one role')
    .optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

// ---------- Audit ----------

export const auditListSchema = z.object({
  ...page,
  action: z.string().trim().max(60).optional(),
  entityType: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
});

// ---------- Settings ----------

export const bankAccountSchema = z.object({
  bank: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(120),
  accountNo: z.string().trim().min(4).max(40),
  iban: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^PK\d{2}[A-Z]{4}\d{16}$/, 'IBAN must look like PK36SCBL0000001123456702'),
  branch: optionalText(120),
});

export const settingsSchema = z.object({
  company: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5).max(300),
    phone: z.string().trim().min(5).max(40),
    email: emailSchema,
    ntn: optionalText(20),
  }),
  bankAccounts: z.array(bankAccountSchema).max(10),
  booking: z.object({
    quoteTtlMinutes: z.coerce.number().int().min(5).max(240),
    paymentTermsNote: z.string().trim().max(500),
  }),
});
export type SettingsInput = z.input<typeof settingsSchema>;
