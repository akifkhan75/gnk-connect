// Accounting DTOs: chart of accounts, vouchers, reports, currencies, periods.
// Amounts are PKR (the base currency) unless a field says otherwise. Account balances
// are debit-positive (Σdebit − Σcredit); the UI shows them as Dr / Cr.

import type { AccountClass, VoucherStatus, VoucherType } from './enums';

export interface ChartAccountDto {
  id: string;
  code: string;
  name: string;
  class: AccountClass;
  parentId: string | null;
  isGroup: boolean;
  isActive: boolean;
  systemKey: string | null;
  currency: string;
  description: string | null;
  /** Set for a partner's receivable account. */
  partnerAccountId: string | null;
  /** Debit-positive PKR balance, including children for groups. */
  balance: number;
  /** Foreign-currency balance for non-PKR accounts (debit-positive). */
  fcBalance: number | null;
}

/** Lightweight option for account pickers. Groups and inactive accounts are excluded. */
export interface AccountOption {
  id: string;
  code: string;
  name: string;
  class: AccountClass;
  currency: string;
  systemKey: string | null;
  path: string; // "Assets › Cash and bank"
}

export interface AccountBalanceDto {
  accountId: string;
  currency: string;
  balance: number;
  fcBalance: number | null;
  /** PKR per unit the open foreign balance is carried at (balance ÷ fcBalance). */
  carryingRate: number | null;
}

export interface VoucherLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  currency: string;
  debit: number;
  credit: number;
  fcAmount: number | null;
  rate: number | null;
  narration: string | null;
}

export interface UserRef {
  id: string;
  name: string;
}

export interface FileRef {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export type VoucherAction =
  'edit' | 'delete' | 'submit' | 'post' | 'approve' | 'reject' | 'reverse';

export interface VoucherListItem {
  id: string;
  reference: string;
  type: VoucherType;
  status: VoucherStatus;
  date: string;
  description: string;
  total: number;
  partnerName: string | null;
  createdBy: UserRef | null;
  approvedBy: UserRef | null;
  reversed: boolean;
}

export interface VoucherDto extends VoucherListItem {
  partnerAccountId: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  paymentId: string | null;
  paymentReference: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  rejectionReason: string | null;
  reversalOf: { id: string; reference: string } | null;
  reversedBy: { id: string; reference: string } | null;
  lines: VoucherLineDto[];
  totalDebit: number;
  totalCredit: number;
  attachments: FileRef[];
  allowedActions: VoucherAction[];
}

export interface VoucherCounts {
  all: number;
  DRAFT: number;
  SUBMITTED: number;
  POSTED: number;
  REJECTED: number;
}

export interface AccountLedgerLine {
  date: string;
  voucherId: string;
  reference: string;
  type: VoucherType;
  description: string;
  narration: string | null;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
  fcAmount: number | null;
  rate: number | null;
  fcBalance: number | null;
}

export interface AccountLedgerDto {
  account: ChartAccountDto;
  from: string;
  to: string;
  opening: number;
  closing: number;
  fcOpening: number | null;
  fcClosing: number | null;
  totalDebit: number;
  totalCredit: number;
  lines: AccountLedgerLine[];
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  class: AccountClass;
  debit: number;
  credit: number;
}

export interface TrialBalanceDto {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export interface IncomeStatementDto {
  from: string;
  to: string;
  income: { code: string; name: string; amount: number }[];
  expenses: { code: string; name: string; amount: number }[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export interface CurrencyDto {
  code: string;
  name: string;
  symbol: string | null;
  isActive: boolean;
  latestRate: number | null;
  latestRateDate: string | null;
}

export interface ExchangeRateDto {
  id: string;
  currency: string;
  rate: number;
  date: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface PeriodDto {
  month: string; // YYYY-MM
  closed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  vouchers: number;
}

export interface AccountingSettingsDto {
  /** Maker-checker: journal vouchers need approval by someone other than the preparer. */
  requireJvApproval: boolean;
  /** Payments at or above this PKR amount need two different approvers. 0 turns it off. */
  paymentDualApprovalFrom: number;
}
