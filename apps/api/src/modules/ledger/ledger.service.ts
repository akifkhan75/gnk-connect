import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LedgerAccountType, Prisma } from '@prisma/client';
import type { BalanceDto, StatementDto } from '@gnk/types';
import { todayPk } from '@gnk/validation';
import { Decimal, num } from '../../core/money';
import { SequencesService } from '../../core/sequences.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

interface EntryInput {
  ledgerAccountId: string;
  debit?: Prisma.Decimal | number;
  credit?: Prisma.Decimal | number;
}

const SYSTEM_NAMES: Record<Exclude<LedgerAccountType, 'PARTNER_RECEIVABLE'>, string> = {
  BANK: 'GNK bank accounts',
  CASH: 'GNK cash',
  GNK_REVENUE: 'GNK margin revenue',
  SUPPLIER_PAYABLE: 'Supplier payable',
};

/**
 * Double-entry ledger (plan 03, 06 §P6). Balances are derived from entries, never stored.
 * A partner's balance is Σcredit − Σdebit on their PARTNER_RECEIVABLE account:
 * positive = money held for them, negative = they owe GNK (used credit).
 */
@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequencesService,
  ) {}

  // ---------- Accounts ----------

  async partnerAccount(tx: Tx, accountId: string) {
    const existing = await tx.ledgerAccount.findUnique({ where: { accountId } });
    if (existing) return existing;
    const partner = await tx.partnerAccount.findUniqueOrThrow({ where: { id: accountId } });
    return tx.ledgerAccount.create({
      data: { type: 'PARTNER_RECEIVABLE', accountId, name: `${partner.code} ${partner.legalName}` },
    });
  }

  async systemAccount(tx: Tx, type: keyof typeof SYSTEM_NAMES) {
    const existing = await tx.ledgerAccount.findFirst({ where: { type, accountId: null } });
    return existing ?? tx.ledgerAccount.create({ data: { type, name: SYSTEM_NAMES[type] } });
  }

  // ---------- Posting ----------

  async post(
    tx: Tx,
    input: {
      description: string;
      bookingId?: string;
      paymentId?: string;
      createdById?: string;
      entries: EntryInput[];
    },
  ) {
    const debit = input.entries.reduce((s, e) => s.plus(e.debit ?? 0), new Decimal(0));
    const credit = input.entries.reduce((s, e) => s.plus(e.credit ?? 0), new Decimal(0));
    if (!debit.equals(credit) || debit.lte(0))
      throw new Error(`Unbalanced ledger posting: ${debit} ≠ ${credit}`);

    return tx.ledgerTransaction.create({
      data: {
        reference: await this.sequences.next('LEDGER', tx),
        description: input.description,
        bookingId: input.bookingId,
        paymentId: input.paymentId,
        createdById: input.createdById,
        entries: {
          create: input.entries.map((e) => ({
            ledgerAccountId: e.ledgerAccountId,
            debit: e.debit ?? 0,
            credit: e.credit ?? 0,
          })),
        },
      },
    });
  }

  /** Verified deposit: Dr bank/cash, Cr partner. */
  async postPayment(
    tx: Tx,
    p: { id: string; accountId: string; amount: Prisma.Decimal; method: string; reference: string },
    staffId: string,
  ) {
    const partner = await this.partnerAccount(tx, p.accountId);
    const cash = await this.systemAccount(tx, p.method === 'CASH' ? 'CASH' : 'BANK');
    return this.post(tx, {
      description: `Payment received ${p.reference}`,
      paymentId: p.id,
      createdById: staffId,
      entries: [
        { ledgerAccountId: cash.id, debit: p.amount },
        { ledgerAccountId: partner.id, credit: p.amount },
      ],
    });
  }

  /** Confirmed booking: Dr partner (total), Cr supplier payable (net), Cr GNK revenue (margin). */
  async postBookingCharge(
    tx: Tx,
    b: {
      id: string;
      reference: string;
      accountId: string;
      seats: number;
      supplierNetUnit: Prisma.Decimal;
      markupUnit: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    },
    actorId?: string,
  ) {
    const partner = await this.partnerAccount(tx, b.accountId);
    const payable = await this.systemAccount(tx, 'SUPPLIER_PAYABLE');
    const revenue = await this.systemAccount(tx, 'GNK_REVENUE');
    const net = b.supplierNetUnit.times(b.seats);
    const margin = b.totalPrice.minus(net);
    return this.post(tx, {
      description: `Booking ${b.reference} (${b.seats} seat${b.seats > 1 ? 's' : ''})`,
      bookingId: b.id,
      createdById: actorId,
      entries: [
        { ledgerAccountId: partner.id, debit: b.totalPrice },
        { ledgerAccountId: payable.id, credit: net },
        ...(margin.gt(0) ? [{ ledgerAccountId: revenue.id, credit: margin }] : []),
      ],
    });
  }

  /** Reverses a booking charge in full (cancellation after confirmation). */
  async reverseBookingCharge(
    tx: Tx,
    b: {
      id: string;
      reference: string;
      accountId: string;
      seats: number;
      supplierNetUnit: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    },
    actorId?: string,
  ) {
    const partner = await this.partnerAccount(tx, b.accountId);
    const payable = await this.systemAccount(tx, 'SUPPLIER_PAYABLE');
    const revenue = await this.systemAccount(tx, 'GNK_REVENUE');
    const net = b.supplierNetUnit.times(b.seats);
    const margin = b.totalPrice.minus(net);
    return this.post(tx, {
      description: `Refund for cancelled booking ${b.reference}`,
      bookingId: b.id,
      createdById: actorId,
      entries: [
        { ledgerAccountId: payable.id, debit: net },
        ...(margin.gt(0) ? [{ ledgerAccountId: revenue.id, debit: margin }] : []),
        { ledgerAccountId: partner.id, credit: b.totalPrice },
      ],
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
      const contra = await this.systemAccount(tx, 'GNK_REVENUE');
      return this.post(tx, {
        description: `Adjustment: ${description}`,
        createdById: staffId,
        entries:
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

    const fromDate = new Date(`${start}T00:00:00+05:00`); // statements follow Asia/Karachi days
    const toDate = new Date(`${end}T23:59:59.999+05:00`);
    const ledger = await this.prisma.ledgerAccount.findUnique({ where: { accountId } });

    let opening = new Decimal(0);
    let lines: StatementDto['lines'] = [];
    if (ledger) {
      const before = await this.prisma.ledgerEntry.aggregate({
        where: { ledgerAccountId: ledger.id, transaction: { postedAt: { lt: fromDate } } },
        _sum: { debit: true, credit: true },
      });
      opening = new Decimal(before._sum.credit ?? 0).minus(before._sum.debit ?? 0);
      const entries = await this.prisma.ledgerEntry.findMany({
        where: {
          ledgerAccountId: ledger.id,
          transaction: { postedAt: { gte: fromDate, lte: toDate } },
        },
        include: { transaction: true },
        orderBy: [{ transaction: { postedAt: 'asc' } }, { id: 'asc' }],
      });
      let running = opening;
      lines = entries.map((e) => {
        running = running.plus(e.credit).minus(e.debit);
        return {
          date: e.transaction.postedAt.toISOString(),
          reference: e.transaction.reference,
          description: e.transaction.description,
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
}
