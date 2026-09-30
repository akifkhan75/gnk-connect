import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type LedgerAccount, type VoucherType } from '@prisma/client';
import type { BalanceDto, StatementDto } from '@gnk/types';
import { todayPk, type VoucherLine } from '@gnk/validation';
import { Decimal, isoDate, num } from '../../core/money';
import { SequencesService } from '../../core/sequences.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

export type Tx = Prisma.TransactionClient;

/** A resolved posting line. Amounts are PKR; foreign lines also carry fcAmount and rate. */
export interface PostLine {
  ledgerAccountId: string;
  debit?: Prisma.Decimal | number;
  credit?: Prisma.Decimal | number;
  currency?: string;
  fcAmount?: Prisma.Decimal | number | null;
  rate?: Prisma.Decimal | number | null;
  narration?: string | null;
}

export interface PostInput {
  type: VoucherType;
  /** Accounting date (YYYY-MM-DD, Asia/Karachi). Defaults to today. */
  date?: string;
  description: string;
  bookingId?: string;
  paymentId?: string;
  partnerAccountId?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  reversalOfId?: string;
  attachmentIds?: string[];
  lines: PostLine[];
}

/** System accounts seeded with the chart of accounts (migration 20260927000000). */
export type SystemKey =
  | 'CASH'
  | 'BANK'
  | 'AR_CONTROL'
  | 'SUPPLIER_PAYABLE'
  | 'REVENUE'
  | 'FX'
  | 'BANK_CHARGES'
  | 'ADJUSTMENTS';

export const BASE = 'PKR';
export const toDate = (d: string) => new Date(`${d}T00:00:00Z`);
const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/**
 * Double-entry ledger and the single posting path for every voucher (plan 03, 06 §P6).
 * Balances are derived from posted entries, never stored. A partner's balance is
 * Σcredit − Σdebit on their receivable: positive = funds held, negative = owed to GNK.
 */
@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequencesService,
  ) {}

  // ---------- Accounts ----------

  /** The partner's receivable account under 1200, created on first use. */
  async partnerAccount(tx: Tx, accountId: string) {
    const existing = await tx.ledgerAccount.findUnique({ where: { accountId } });
    if (existing) return existing;
    const partner = await tx.partnerAccount.findUniqueOrThrow({ where: { id: accountId } });
    const control = await this.systemAccount(tx, 'AR_CONTROL');
    return tx.ledgerAccount.create({
      data: {
        code: `${control.code}-${partner.code}`,
        name: `${partner.code} ${partner.tradeName || partner.legalName}`,
        class: 'ASSET',
        parentId: control.id,
        accountId,
      },
    });
  }

  async systemAccount(tx: Tx, key: SystemKey) {
    const account = await tx.ledgerAccount.findUnique({ where: { systemKey: key } });
    if (!account)
      throw new Error(
        `System account ${key} is missing from the chart of accounts. Run migrations.`,
      );
    return account;
  }

  // ---------- Posting ----------

  /** Posts a balanced voucher. Every automatic and manual posting goes through here. */
  async post(tx: Tx, input: PostInput) {
    const date = input.date ?? todayPk();
    const lines = await this.checkLines(tx, input.lines);
    await this.assertPeriodOpen(tx, date);
    return tx.ledgerTransaction.create({
      data: {
        reference: await this.sequences.voucher(input.type, tx),
        type: input.type,
        status: 'POSTED',
        date: toDate(date),
        description: input.description,
        bookingId: input.bookingId,
        paymentId: input.paymentId,
        partnerAccountId: input.partnerAccountId ?? (await this.partnerOf(tx, lines)),
        createdById: input.createdById ?? null,
        approvedById: input.approvedById ?? null,
        approvedAt: input.approvedById ? new Date() : null,
        reversalOfId: input.reversalOfId,
        postedAt: new Date(),
        entries: { create: lines },
        ...(input.attachmentIds?.length
          ? { attachments: { create: input.attachmentIds.map((fileId) => ({ fileId })) } }
          : {}),
      },
    });
  }

  /** Posts an existing draft/submitted voucher in place (keeps its id and attachments). */
  async postDraft(
    tx: Tx,
    voucher: { id: string; type: VoucherType; date: Date; status: string },
    lines: PostLine[],
    approvedById: string | null,
  ) {
    const checked = await this.checkLines(tx, lines);
    await this.assertPeriodOpen(tx, isoDate(voucher.date)!);
    // Status first: the entry guard trigger only accepts entries on POSTED vouchers.
    const updated = await tx.ledgerTransaction.updateMany({
      where: { id: voucher.id, status: voucher.status as never },
      data: {
        status: 'POSTED',
        reference: await this.sequences.voucher(voucher.type, tx),
        partnerAccountId: await this.partnerOf(tx, checked),
        approvedById,
        approvedAt: approvedById ? new Date() : null,
        postedAt: new Date(),
        draftLines: Prisma.DbNull,
      },
    });
    if (!updated.count)
      throw new ConflictException(
        'This voucher was changed by someone else. Refresh and try again.',
      );
    await tx.ledgerEntry.createMany({
      data: checked.map((l) => ({ ...l, transactionId: voucher.id })),
    });
    return tx.ledgerTransaction.findUniqueOrThrow({ where: { id: voucher.id } });
  }

  /**
   * Turns editor lines (side + PKR amount, or foreign amount × rate) into posting lines.
   * PKR for a foreign line is fcAmount × rate rounded half-up, the same as toBaseAmount().
   */
  async resolveLines(tx: Tx, lines: VoucherLine[]): Promise<PostLine[]> {
    const accounts = await this.accountsById(
      tx,
      lines.map((l) => l.accountId),
    );
    return lines.map((l, i) => {
      const account = accounts.get(l.accountId);
      if (!account) throw this.lineError(i, 'accountId', 'Account not found');
      let amount: Prisma.Decimal;
      let fc: { currency: string; fcAmount: Prisma.Decimal; rate: Prisma.Decimal } | null = null;
      if (account.currency !== BASE) {
        if (l.fcAmount == null || l.rate == null)
          throw this.lineError(
            i,
            'fcAmount',
            `${account.code} is a ${account.currency} account: enter the ${account.currency} amount and rate`,
          );
        const fcAmount = new Decimal(l.fcAmount);
        const rate = new Decimal(l.rate);
        amount = round2(fcAmount.times(rate));
        fc = { currency: account.currency, fcAmount, rate };
      } else {
        if (l.amount == null) throw this.lineError(i, 'amount', 'Enter an amount');
        amount = new Decimal(l.amount);
      }
      return {
        ledgerAccountId: account.id,
        debit: l.side === 'DEBIT' ? amount : 0,
        credit: l.side === 'CREDIT' ? amount : 0,
        currency: fc?.currency ?? BASE,
        fcAmount: fc?.fcAmount ?? null,
        rate: fc?.rate ?? null,
        narration: l.narration ?? null,
      };
    });
  }

  /** Validates accounts, currency fields and the PKR balance of a set of lines. */
  async checkLines(tx: Tx, lines: PostLine[]) {
    if (lines.length < 2) throw new BadRequestException('A voucher needs at least two lines');
    const accounts = await this.accountsById(
      tx,
      lines.map((l) => l.ledgerAccountId),
    );
    let debit = new Decimal(0);
    let credit = new Decimal(0);
    const out = lines.map((l, i) => {
      const account = accounts.get(l.ledgerAccountId);
      if (!account) throw this.lineError(i, 'accountId', 'Account not found');
      if (account.isGroup)
        throw this.lineError(
          i,
          'accountId',
          `${account.code} is a group; pick an account under it`,
        );
      if (!account.isActive) throw this.lineError(i, 'accountId', `${account.code} is inactive`);
      const d = new Decimal(l.debit ?? 0);
      const c = new Decimal(l.credit ?? 0);
      if (d.lt(0) || c.lt(0) || (d.gt(0) && c.gt(0)) || (d.isZero() && c.isZero()))
        throw this.lineError(i, 'amount', 'Each line is either a debit or a credit');
      const currency = l.currency ?? BASE;
      if (currency !== account.currency)
        throw this.lineError(i, 'accountId', `${account.code} is kept in ${account.currency}`);
      if (currency !== BASE && (l.fcAmount == null || l.rate == null))
        throw this.lineError(i, 'fcAmount', 'Enter the foreign amount and rate');
      debit = debit.plus(d);
      credit = credit.plus(c);
      return {
        ledgerAccountId: account.id,
        debit: d,
        credit: c,
        currency,
        fcAmount: currency === BASE ? null : new Decimal(l.fcAmount!),
        rate: currency === BASE ? null : new Decimal(l.rate!),
        narration: l.narration ?? null,
      };
    });
    if (!debit.equals(credit))
      throw new BadRequestException({
        message: `Debits (${debit.toFixed(2)}) and credits (${credit.toFixed(2)}) must be equal`,
        code: 'VOUCHER_UNBALANCED',
      });
    if (debit.lte(0)) throw new BadRequestException('A voucher must move a positive amount');
    return out;
  }

  async assertPeriodOpen(tx: Tx, date: string) {
    const month = date.slice(0, 7);
    if (await tx.closedPeriod.findUnique({ where: { month } }))
      throw new ConflictException({
        message: `The accounting period ${month} is closed. Use a date in an open period.`,
        code: 'PERIOD_CLOSED',
      });
  }

  // ---------- Automatic postings ----------

  /** Approved deposit (receipt voucher): Dr bank/cash, Cr partner. */
  async postPayment(
    tx: Tx,
    p: { id: string; accountId: string; amount: Prisma.Decimal; method: string; reference: string },
    staffId: string,
    depositAccountId?: string | null,
  ) {
    const partner = await this.partnerAccount(tx, p.accountId);
    const deposit = depositAccountId
      ? await this.cashOrBankAccount(tx, depositAccountId)
      : await this.systemAccount(tx, p.method === 'CASH' ? 'CASH' : 'BANK');
    return this.post(tx, {
      type: 'RECEIPT',
      description: `Payment received ${p.reference}`,
      paymentId: p.id,
      partnerAccountId: p.accountId,
      createdById: staffId,
      approvedById: staffId,
      lines: [
        { ledgerAccountId: deposit.id, debit: p.amount },
        { ledgerAccountId: partner.id, credit: p.amount },
      ],
    });
  }

  /**
   * Inventory group bookings without a supplier payable split: DR partner AR, CR revenue
   * for the full fare (AirDesk accrual-only confirm).
   */
  async postInventoryBookingAccrual(
    tx: Tx,
    b: {
      id: string;
      reference: string;
      accountId: string;
      seats: number;
      totalPrice: Prisma.Decimal;
      supplierId?: string | null;
      supplierNetUnit?: Prisma.Decimal | null;
      markupUnit?: Prisma.Decimal | null;
    },
    actorId?: string,
  ) {
    const existing = await tx.ledgerTransaction.findFirst({
      where: { bookingId: b.id, type: 'SALE', status: 'POSTED', reversedBy: { is: null } },
    });
    if (existing) return { voucher: existing, cost: null };

    if (b.supplierId && b.supplierNetUnit != null) {
      return this.postBookingCharge(
        tx,
        {
          id: b.id,
          reference: b.reference,
          accountId: b.accountId,
          supplierId: b.supplierId,
          seats: b.seats,
          supplierNetUnit: b.supplierNetUnit,
          markupUnit: b.markupUnit ?? new Prisma.Decimal(0),
          totalPrice: b.totalPrice,
        },
        actorId,
      );
    }

    const partner = await this.partnerAccount(tx, b.accountId);
    const revenue = await this.systemAccount(tx, 'REVENUE');
    const voucher = await this.post(tx, {
      type: 'SALE',
      description: `Inventory booking ${b.reference} (${b.seats} seat${b.seats > 1 ? 's' : ''})`,
      bookingId: b.id,
      partnerAccountId: b.accountId,
      createdById: actorId,
      lines: [
        { ledgerAccountId: partner.id, debit: b.totalPrice },
        { ledgerAccountId: revenue.id, credit: b.totalPrice },
      ],
    });
    return { voucher, cost: null };
  }

  /**
   * Confirmed booking (sale voucher): Dr partner (total), Cr supplier payable (net), Cr revenue
   * (margin). When the supplier's payable account is in a foreign currency, the net is posted
   * there as fcAmount × rate using the latest rate; any rounding lands in the margin.
   * Returns the voucher and, for foreign suppliers, the cost that was posted.
   */
  async postBookingCharge(
    tx: Tx,
    b: {
      id: string;
      reference: string;
      accountId: string;
      supplierId: string;
      seats: number;
      supplierNetUnit: Prisma.Decimal;
      markupUnit: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    },
    actorId?: string,
  ) {
    const partner = await this.partnerAccount(tx, b.accountId);
    const revenue = await this.systemAccount(tx, 'REVENUE');
    const payable = await this.supplierPayable(tx, b.supplierId);
    const net = b.supplierNetUnit.times(b.seats);

    let payableLine: PostLine = { ledgerAccountId: payable.account.id, credit: net };
    let cost: { currency: string; fcAmount: Prisma.Decimal; rate: Prisma.Decimal } | null = null;
    if (payable.rate) {
      const fcAmount = round2(net.dividedBy(payable.rate));
      const pkr = round2(fcAmount.times(payable.rate));
      cost = { currency: payable.account.currency, fcAmount, rate: payable.rate };
      payableLine = { ledgerAccountId: payable.account.id, credit: pkr, ...cost };
    }
    const margin = b.totalPrice.minus(new Prisma.Decimal(payableLine.credit ?? 0));
    const voucher = await this.post(tx, {
      type: 'SALE',
      description: `Booking ${b.reference} (${b.seats} seat${b.seats > 1 ? 's' : ''})`,
      bookingId: b.id,
      partnerAccountId: b.accountId,
      createdById: actorId,
      lines: [
        { ledgerAccountId: partner.id, debit: b.totalPrice },
        payableLine,
        ...(margin.gt(0) ? [{ ledgerAccountId: revenue.id, credit: margin }] : []),
        // Sold below cost: the loss reduces revenue instead of unbalancing the voucher.
        ...(margin.lt(0) ? [{ ledgerAccountId: revenue.id, debit: margin.negated() }] : []),
      ],
    });
    return { voucher, cost };
  }

  /**
   * The account a supplier's bookings are payable to, and for a foreign-currency account the
   * latest rate from the rate table. Throws FX_RATE_MISSING when no rate has been entered.
   */
  async supplierPayable(tx: Tx, supplierId: string) {
    const supplier = await tx.supplier.findUnique({
      where: { id: supplierId },
      include: { payableAccount: true },
    });
    const account =
      supplier?.payableAccount && supplier.payableAccount.isActive
        ? supplier.payableAccount
        : await this.systemAccount(tx, 'SUPPLIER_PAYABLE');
    if (account.currency === BASE) return { account, rate: null };
    const latest = await tx.exchangeRate.findFirst({
      where: { currency: account.currency },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    if (!latest)
      throw new ConflictException({
        message: `${supplier?.name ?? 'This supplier'} bills in ${account.currency}, but no ${account.currency} rate has been entered. Add one under Accounting → Setup.`,
        code: 'FX_RATE_MISSING',
      });
    return { account, rate: latest.rate };
  }

  /** Reverses a booking's sale voucher in full (cancellation after confirmation). */
  async reverseBookingCharge(tx: Tx, b: { id: string; reference: string }, actorId?: string) {
    const sale = await tx.ledgerTransaction.findFirst({
      where: { bookingId: b.id, type: 'SALE', status: 'POSTED', reversedBy: { is: null } },
      orderBy: { postedAt: 'desc' },
    });
    if (!sale) throw new ConflictException(`No posted sale found for booking ${b.reference}`);
    return this.reverse(tx, sale.id, {
      date: todayPk(),
      description: `Refund for cancelled booking ${b.reference}`,
      createdById: actorId ?? null,
    });
  }

  /** Posts the mirror image of a posted voucher and links the two. */
  async reverse(
    tx: Tx,
    voucherId: string,
    opts: { date: string; description: string; createdById: string | null },
  ) {
    const original = await tx.ledgerTransaction.findUnique({
      where: { id: voucherId },
      include: { entries: true, reversedBy: true },
    });
    if (!original || original.status !== 'POSTED')
      throw new NotFoundException('Only posted vouchers can be reversed');
    if (original.reversedBy)
      throw new ConflictException(`Already reversed by ${original.reversedBy.reference}`);
    if (original.type === 'REVERSAL') throw new ConflictException('A reversal cannot be reversed');
    return this.post(tx, {
      type: 'REVERSAL',
      date: opts.date,
      description: opts.description,
      bookingId: original.bookingId ?? undefined,
      paymentId: original.paymentId ?? undefined,
      partnerAccountId: original.partnerAccountId,
      createdById: opts.createdById,
      approvedById: opts.createdById,
      reversalOfId: original.id,
      lines: original.entries.map((e) => ({
        ledgerAccountId: e.ledgerAccountId,
        debit: e.credit,
        credit: e.debit,
        currency: e.currency,
        fcAmount: e.fcAmount,
        rate: e.rate,
        narration: e.narration,
      })),
    });
  }

  /** Manual correction by finance. CREDIT increases the partner's balance. */
  async adjust(
    accountId: string,
    direction: 'CREDIT' | 'DEBIT',
    amount: number,
    description: string,
    staffId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const partner = await this.partnerAccount(tx, accountId);
      const contra = await this.systemAccount(tx, 'ADJUSTMENTS');
      return this.post(tx, {
        type: 'ADJUSTMENT',
        description: `Adjustment: ${description}`,
        partnerAccountId: accountId,
        createdById: staffId,
        approvedById: staffId,
        lines:
          direction === 'CREDIT'
            ? [
                { ledgerAccountId: contra.id, debit: amount },
                { ledgerAccountId: partner.id, credit: amount },
              ]
            : [
                { ledgerAccountId: partner.id, debit: amount },
                { ledgerAccountId: contra.id, credit: amount },
              ],
      });
    });
  }

  // ---------- Reading ----------

  async balance(accountId: string, tx: Tx = this.prisma): Promise<BalanceDto> {
    const partner = await tx.partnerAccount.findUnique({
      where: { id: accountId },
      select: { creditLimit: true },
    });
    if (!partner) throw new NotFoundException('Partner not found');
    const ledger = await tx.ledgerAccount.findUnique({ where: { accountId } });
    let balance = new Decimal(0);
    if (ledger) {
      const sums = await tx.ledgerEntry.aggregate({
        where: { ledgerAccountId: ledger.id },
        _sum: { debit: true, credit: true },
      });
      balance = new Decimal(sums._sum.credit ?? 0).minus(sums._sum.debit ?? 0);
    }
    return {
      balance: num(balance),
      creditLimit: num(partner.creditLimit),
      availableFunds: num(balance.plus(partner.creditLimit)),
    };
  }

  async balances(accountIds: string[]): Promise<Map<string, number>> {
    if (!accountIds.length) return new Map();
    const rows = await this.prisma.$queryRaw<{ accountId: string; balance: Prisma.Decimal }[]>`
      SELECT la."accountId", COALESCE(SUM(le.credit) - SUM(le.debit), 0) AS balance
      FROM "LedgerAccount" la
      LEFT JOIN "LedgerEntry" le ON le."ledgerAccountId" = la.id
      WHERE la."accountId" = ANY(${accountIds}::uuid[])
      GROUP BY la."accountId"`;
    return new Map(rows.map((r) => [r.accountId, num(r.balance)]));
  }

  async statement(accountId: string, from?: string, to?: string): Promise<StatementDto> {
    const partner = await this.prisma.partnerAccount.findUnique({ where: { id: accountId } });
    if (!partner) throw new NotFoundException('Partner not found');
    const end = to ?? todayPk();
    const start =
      from ??
      new Date(new Date(`${end}T00:00:00Z`).getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
    if (start > end) throw new BadRequestException('The start date must be before the end date');

    const ledger = await this.prisma.ledgerAccount.findUnique({ where: { accountId } });
    let opening = new Decimal(0);
    let lines: StatementDto['lines'] = [];
    if (ledger) {
      const before = await this.prisma.ledgerEntry.aggregate({
        where: { ledgerAccountId: ledger.id, transaction: { date: { lt: toDate(start) } } },
        _sum: { debit: true, credit: true },
      });
      opening = new Decimal(before._sum.credit ?? 0).minus(before._sum.debit ?? 0);
      const entries = await this.prisma.ledgerEntry.findMany({
        where: {
          ledgerAccountId: ledger.id,
          transaction: { date: { gte: toDate(start), lte: toDate(end) } },
        },
        include: { transaction: true },
        orderBy: [
          { transaction: { date: 'asc' } },
          { transaction: { postedAt: 'asc' } },
          { id: 'asc' },
        ],
      });
      let running = opening;
      lines = entries.map((e) => {
        running = running.plus(e.credit).minus(e.debit);
        return {
          date: isoDate(e.transaction.date)!,
          reference: e.transaction.reference,
          description: e.narration
            ? `${e.transaction.description} — ${e.narration}`
            : e.transaction.description,
          debit: num(e.debit),
          credit: num(e.credit),
          balance: num(running),
        };
      });
    }
    const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
    const closing = lines.length ? lines[lines.length - 1].balance : num(opening);
    const current = await this.balance(accountId);

    return {
      accountId,
      accountCode: partner.code,
      accountName: partner.tradeName || partner.legalName,
      from: start,
      to: end,
      openingBalance: num(opening),
      closingBalance: closing,
      totalDebits,
      totalCredits,
      creditLimit: num(partner.creditLimit),
      availableFunds: current.availableFunds,
      lines,
    };
  }

  // ---------- internals ----------

  /** A postable bank or cash account (under 1100), for deposits and payouts. */
  async cashOrBankAccount(tx: Tx, id: string) {
    const account = await tx.ledgerAccount.findUnique({ where: { id }, include: { parent: true } });
    const cashGroup = await tx.ledgerAccount.findUnique({ where: { code: '1100' } });
    const underCash =
      account && (account.parentId === cashGroup?.id || account.parent?.parentId === cashGroup?.id);
    if (!account || account.isGroup || !account.isActive || !underCash || account.currency !== BASE)
      throw new BadRequestException({
        message: 'Choose an active PKR bank or cash account',
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'depositAccountId', message: 'Choose a bank or cash account' }],
      });
    return account;
  }

  private async accountsById(tx: Tx, ids: string[]) {
    const rows = await tx.ledgerAccount.findMany({ where: { id: { in: [...new Set(ids)] } } });
    return new Map<string, LedgerAccount>(rows.map((a) => [a.id, a]));
  }

  /** The partner whose receivable a set of lines touches, if exactly one. */
  async partnerOf(tx: Tx, lines: { ledgerAccountId: string }[]) {
    const rows = await tx.ledgerAccount.findMany({
      where: { id: { in: lines.map((l) => l.ledgerAccountId) }, accountId: { not: null } },
      select: { accountId: true },
    });
    const partners = [...new Set(rows.map((r) => r.accountId!))];
    return partners.length === 1 ? partners[0] : null;
  }

  private lineError(index: number, field: string, message: string) {
    return new BadRequestException({
      message,
      code: 'VALIDATION_FAILED',
      errors: [{ path: `lines.${index}.${field}`, message }],
    });
  }
}
