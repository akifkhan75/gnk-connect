// String-literal mirrors of the Prisma enums, usable in the browser without
// pulling in @prisma/client. Keep in sync with apps/api/prisma/schema.prisma.

export const PARTNER_ACCOUNT_TYPES = ['AGENCY', 'INDIVIDUAL'] as const;
export type PartnerAccountType = (typeof PARTNER_ACCOUNT_TYPES)[number];

export const PARTNER_ACCOUNT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFO_REQUIRED',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'CLOSED',
] as const;
export type PartnerAccountStatus = (typeof PARTNER_ACCOUNT_STATUSES)[number];

export const PARTNER_ROLES = ['OWNER', 'MANAGER', 'STAFF', 'ACCOUNTANT'] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

export const USER_STATUSES = ['INVITED', 'ACTIVE', 'LOCKED', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const KYC_DOC_TYPES = [
  'DTS_LICENSE',
  'NTN_CERTIFICATE',
  'CNIC_FRONT',
  'CNIC_BACK',
  'IATA_CERTIFICATE',
  'BANK_LETTER',
  'OTHER',
] as const;
export type KycDocType = (typeof KYC_DOC_TYPES)[number];

export const KYC_DOC_STATUSES = ['SUBMITTED', 'VERIFIED', 'REJECTED'] as const;
export type KycDocStatus = (typeof KYC_DOC_STATUSES)[number];

export const FILE_PURPOSES = [
  'KYC',
  'PAYMENT_PROOF',
  'LOGO',
  'INVOICE',
  'PASSPORT_COPY',
  'VOUCHER',
] as const;
export type FilePurpose = (typeof FILE_PURPOSES)[number];

export const PRODUCT_TYPES = [
  'GROUP',
  'HOTEL',
  'UMRAH',
  'ZIARAT',
  'FLIGHT',
  'TRANSFER',
  'VISA',
  'OTHER',
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const DEPARTURE_STATUSES = [
  'OPEN',
  'FILLING_FAST',
  'SOLD_OUT',
  'CLOSED',
  'CANCELLED',
] as const;
export type DepartureStatus = (typeof DEPARTURE_STATUSES)[number];

export const PRICING_SCOPES = [
  'PARTNER_PRODUCT',
  'PARTNER',
  'TIER',
  'DEPARTURE',
  'PRODUCT',
  'PRODUCT_TYPE',
  'SUPPLIER',
  'DEFAULT',
] as const;
export type PricingScope = (typeof PRICING_SCOPES)[number];

export const MARKUP_TYPES = ['FIXED', 'PERCENTAGE'] as const;
export type MarkupType = (typeof MARKUP_TYPES)[number];

export const ROUNDING_MODES = [
  'NONE',
  'NEAREST_10',
  'NEAREST_100',
  'NEAREST_500',
  'NEAREST_1000',
  'CEIL_100',
  'CEIL_500',
  'CEIL_1000',
] as const;
export type RoundingMode = (typeof ROUNDING_MODES)[number];

export const BOOKING_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SUBMITTED_TO_SUPPLIER',
  'SUPPLIER_PENDING',
  'CONFIRMED',
  'SUPPLIER_FAILED',
  'CANCELLATION_REQUESTED',
  'CANCELLED',
  'COMPLETED',
  'EXPIRED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATES = [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'REFUND_PENDING',
  'REFUNDED',
] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const PAX_TYPES = ['ADULT', 'CHILD', 'INFANT'] as const;
export type PaxType = (typeof PAX_TYPES)[number];

export const GENDERS = ['MALE', 'FEMALE'] as const;
export type Gender = (typeof GENDERS)[number];

export const TITLES = ['MR', 'MRS', 'MS', 'MISS', 'MSTR'] as const;
export type Title = (typeof TITLES)[number];

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH', 'CARD', 'GATEWAY', 'CREDIT'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'VERIFIED',
  'FAILED',
  'REJECTED',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUPPLIER_STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const ACCOUNT_CLASSES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const;
export type AccountClass = (typeof ACCOUNT_CLASSES)[number];

export const VOUCHER_TYPES = [
  'SALE',
  'RECEIPT',
  'PAYMENT',
  'JOURNAL',
  'REVERSAL',
  'ADJUSTMENT',
] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];

export const VOUCHER_STATUSES = ['DRAFT', 'SUBMITTED', 'POSTED', 'REJECTED'] as const;
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];

/** Books are kept in this currency; every voucher balances in it. */
export const BASE_CURRENCY = 'PKR';

export type Realm = 'PARTNER' | 'STAFF';
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
