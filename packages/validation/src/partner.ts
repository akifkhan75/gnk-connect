import { z } from 'zod';
import {
  GENDERS,
  KYC_DOC_TYPES,
  PARTNER_ROLES,
  PAX_TYPES,
  PAYMENT_METHODS,
  TITLES,
} from '@gnk/types';
import {
  allocationSchema,
  allocationsMessage,
  allocationsWithinAmount,
  emailSchema,
  isoDateSchema,
  moneySchema,
  optionalText,
  passportSchema,
  passwordSchema,
  phonePkSchema,
  todayPk,
  uuidSchema,
} from './common';

// ---------- Account ----------

export const updateAccountProfileSchema = z.object({
  tradeName: optionalText(160),
  iataCode: optionalText(12),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  address: z.string().trim().min(5, 'Enter your office address').max(300),
  phone: phonePkSchema,
});
export type UpdateAccountProfileInput = z.input<typeof updateAccountProfileSchema>;

export const updateMyProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  phone: phonePkSchema,
});
export type UpdateMyProfileInput = z.input<typeof updateMyProfileSchema>;

export const kycUploadSchema = z.object({ type: z.enum(KYC_DOC_TYPES) });

// ---------- Team ----------

// OWNER is never granted through an invite; ownership transfer is a separate flow.
export const INVITABLE_ROLES = PARTNER_ROLES.filter((r) => r !== 'OWNER') as Exclude<
  (typeof PARTNER_ROLES)[number],
  'OWNER'
>[];

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(INVITABLE_ROLES as [string, ...string[]]),
});
export type InviteMemberInput = z.input<typeof inviteMemberSchema>;

/** Add a team member directly with a temporary password they must change at first sign-in. */
export const addMemberSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2, 'Enter the full name').max(120),
  phone: phonePkSchema,
  role: z.enum(INVITABLE_ROLES as [string, ...string[]]),
  password: passwordSchema,
});
export type AddMemberInput = z.input<typeof addMemberSchema>;

export const memberStatusSchema = z.object({ status: z.enum(['ACTIVE', 'DISABLED']) });

export const updateMemberRoleSchema = z.object({
  role: z.enum(INVITABLE_ROLES as [string, ...string[]]),
});

// ---------- Groups & quotes ----------

export const groupSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  sector: z.string().trim().max(20).optional(),
  airline: z.string().trim().max(60).optional(),
  type: z.string().trim().max(20).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  minSeats: z.coerce.number().int().min(1).max(50).optional(),
  sort: z.enum(['date', 'price', 'seats']).default('date'),
});
export type GroupSearchInput = z.input<typeof groupSearchSchema>;

export const MAX_SEATS_PER_BOOKING = 9;

export const createQuoteSchema = z.object({
  departureId: uuidSchema,
  seats: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_SEATS_PER_BOOKING, `At most ${MAX_SEATS_PER_BOOKING} seats per booking`),
});
export type CreateQuoteInput = z.input<typeof createQuoteSchema>;

// ---------- Bookings ----------

const today = todayPk;

export const passengerSchema = z
  .object({
    type: z.enum(PAX_TYPES),
    title: z.enum(TITLES),
    firstName: z
      .string()
      .trim()
      .min(1, 'Enter the given name')
      .max(60)
      .regex(/^[A-Za-z][A-Za-z '-]*$/, 'Use letters as printed on the passport'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Enter the surname')
      .max(60)
      .regex(/^[A-Za-z][A-Za-z '-]*$/, 'Use letters as printed on the passport'),
    gender: z.enum(GENDERS),
    dateOfBirth: isoDateSchema,
    nationality: z.string().trim().toUpperCase().length(2, 'Use the 2-letter country code'),
    passportNumber: passportSchema,
    passportExpiry: isoDateSchema,
  })
  .superRefine((p, ctx) => {
    if (p.dateOfBirth >= today())
      ctx.addIssue({
        code: 'custom',
        path: ['dateOfBirth'],
        message: 'Date of birth must be in the past',
      });
    if (p.passportExpiry <= today())
      ctx.addIssue({ code: 'custom', path: ['passportExpiry'], message: 'Passport has expired' });
  });
export type PassengerInput = z.input<typeof passengerSchema>;

export const createBookingSchema = z
  .object({
    quoteId: uuidSchema.optional(),
    inventoryLotId: uuidSchema.optional(),
    adults: z.coerce.number().int().min(1).max(MAX_SEATS_PER_BOOKING).optional(),
    children: z.coerce.number().int().min(0).max(MAX_SEATS_PER_BOOKING).optional(),
    infants: z.coerce.number().int().min(0).max(MAX_SEATS_PER_BOOKING).optional(),
    /** Empty = hold seats now; add passport details later. */
    passengers: z.array(passengerSchema).max(MAX_SEATS_PER_BOOKING).default([]),
    agentNotes: optionalText(1000),
    acceptTerms: z.literal(true, { error: 'Accept the booking terms to continue' }),
  })
  .superRefine((v, ctx) => {
    if (!v.quoteId && !v.inventoryLotId) {
      ctx.addIssue({
        code: 'custom',
        path: ['inventoryLotId'],
        message: 'Select a cabin / inventory lot',
      });
    }
    if (v.inventoryLotId && (v.adults == null || v.adults < 1)) {
      ctx.addIssue({ code: 'custom', path: ['adults'], message: 'At least 1 adult is required' });
    }
  });
export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const setBookingPassengersSchema = z.object({
  passengers: z.array(passengerSchema).min(1).max(MAX_SEATS_PER_BOOKING),
});
export type SetBookingPassengersInput = z.input<typeof setBookingPassengersSchema>;

export const ticketBookingSchema = z.object({
  passengerTickets: z
    .array(
      z.object({
        passengerId: uuidSchema,
        ticketNumber: z.string().trim().min(3).max(32),
      }),
    )
    .min(1),
});

export const concessionRequestSchema = z.object({
  kind: z.enum(['CHILD_SEATS', 'INFANT_SEATS', 'DISCOUNT']),
  requestedChildSeats: z.coerce.number().int().min(1).max(50).optional(),
  requestedInfantSeats: z.coerce.number().int().min(1).max(50).optional(),
  requestedDiscountAmount: moneySchema.optional(),
  reason: optionalText(500),
});

export const concessionDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  approvedChildSeats: z.coerce.number().int().min(0).max(50).optional(),
  approvedInfantSeats: z.coerce.number().int().min(0).max(50).optional(),
  approvedDiscountAmount: moneySchema.optional(),
  decisionNote: optionalText(500),
  pnrCode: optionalText(48),
});

export const extendDeadlineSchema = z.object({
  extensionMinutes: z.coerce.number().int().min(-1440).max(1440),
});

/** Agent-side ask: doesn't move the deadline itself, just flags it for platform review. */
export const extensionRequestSchema = z.object({
  minutes: z.coerce.number().int().min(15).max(1440).default(60),
  reason: optionalText(500),
});
export type ExtensionRequestInput = z.input<typeof extensionRequestSchema>;

export const bookingListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  tab: z
    .enum([
      'all',
      'PENDING_APPROVAL',
      'APPROVED',
      'PAYMENT_PENDING',
      'CONFIRMED',
      'TICKETED',
      'EXPIRED',
      'EXPIRED_HOLD',
      'CANCELLED',
    ])
    .default('all'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type BookingListInput = z.input<typeof bookingListSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(500),
});

export const refundRequestSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(500),
});
export type RefundRequestInput = z.input<typeof refundRequestSchema>;

export const emailTicketSchema = z.object({
  to: emailSchema.optional(),
});
export type EmailTicketInput = z.input<typeof emailTicketSchema>;

// ---------- Passport OCR ----------

export const passportOcrExtractSchema = z.object({
  ocrText: z.string().trim().min(10, 'Paste the OCR text from the passport bio page').max(20_000),
});
export type PassportOcrExtractInput = z.input<typeof passportOcrExtractSchema>;

export const passportScanAttachSchema = z.object({
  fileId: uuidSchema,
});
export type PassportScanAttachInput = z.input<typeof passportScanAttachSchema>;

// ---------- Payments ----------

export const PARTNER_PAYMENT_METHODS = PAYMENT_METHODS.filter(
  (m) => m === 'BANK_TRANSFER' || m === 'CASH',
);

export const submitPaymentSchema = z
  .object({
    method: z.enum(PARTNER_PAYMENT_METHODS as [string, ...string[]]),
    amount: moneySchema,
    bankName: z.string().trim().min(2, 'Enter the bank name').max(80),
    transactionRef: z
      .string()
      .trim()
      .min(3, 'Enter the transaction or deposit slip number')
      .max(60),
    paidAt: isoDateSchema.refine((d) => d <= today(), 'Payment date cannot be in the future'),
    /** Legacy single-booking link; prefer allocations. */
    bookingId: uuidSchema.optional().or(z.literal('').transform(() => undefined)),
    allocations: z.array(allocationSchema).max(20).default([]),
    /** Legacy single proof; prefer attachmentIds. */
    proofFileId: uuidSchema.optional(),
    attachmentIds: z.array(uuidSchema).max(5).default([]),
    notes: optionalText(500),
  })
  .refine((v) => !!v.proofFileId || v.attachmentIds.length > 0, {
    path: ['attachmentIds'],
    message: 'Attach the deposit slip or transfer screenshot',
  })
  .refine(allocationsWithinAmount, { path: ['allocations'], message: allocationsMessage });
export type SubmitPaymentInput = z.input<typeof submitPaymentSchema>;

export const statementQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
