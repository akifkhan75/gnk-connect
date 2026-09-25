import { z } from 'zod';
import { digitsOnly, toE164Pk } from './masks';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address'));

// Plan 04 §3.4: length-based policy, no composition rules.
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters');

export const phonePkSchema = z
  .string()
  .trim()
  .refine(
    (v) => /^3\d{9}$/.test(toE164Pk(v).slice(3)),
    'Enter a Pakistani mobile number, e.g. +92 300 1234567',
  )
  .transform(toE164Pk);

export const cnicSchema = z
  .string()
  .trim()
  .refine((v) => digitsOnly(v).length === 13, 'CNIC must have 13 digits')
  .transform(digitsOnly);

export const ntnSchema = z
  .string()
  .trim()
  .refine((v) => /^\d{7,8}$/.test(digitsOnly(v)), 'NTN must have 7 digits plus a check digit')
  .transform(digitsOnly);

export const passportSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,9}$/, 'Passport number must be 6–9 letters or digits');

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date');

export const uuidSchema = z.uuid('Invalid id');

/** Money in PKR: positive, max 2 decimals. Accepts numbers or numeric strings from inputs. */
export const moneySchema = z.coerce
  .number({ error: 'Enter an amount' })
  .positive('Amount must be greater than zero')
  .max(999_999_999_999, 'Amount is too large')
  .refine((v) => Math.round(v * 100) === v * 100, 'Use at most 2 decimals');

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** Today's date (YYYY-MM-DD) in Pakistan time, used for all "not in the future/past" rules. */
export const todayPk = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
