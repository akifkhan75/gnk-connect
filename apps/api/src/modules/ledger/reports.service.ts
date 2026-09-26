import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AccountLedgerDto, IncomeStatementDto, TrialBalanceDto } from '@gnk/types';
import { todayPk } from '@gnk/validation';
import { Decimal, isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ChartService } from './chart.service';
import { BASE, toDate } from './ledger.service';

const daysBefore = (day: string, n: number) =>
  new Date(toDate(day).getTime() - n * 86_400_000).toISOString().slice(0, 10);

/** Financial reports built from posted entries only. */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chart: ChartService,
  ) {}

  /** General ledger of one postable account, with running PKR and foreign balances. */
  async accountLedger(id: string, from?: string, to?: string): Promise<AccountLedgerDto> {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    const end = to ?? todayPk();
    const start = from ?? daysBefore(end, 90);
    if (start > end) throw new BadRequestException('The start date must be before the end date');
    const foreign = account.currency !== BASE;

    const opening = (await this.chart.sums(daysBefore(start, 1), [id])).get(id);
    let balance = opening?.balance ?? new Decimal(0);
    let fcBalance = foreign ? (opening?.fc ?? new Decimal(0)) : null;
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        ledgerAccountId: id,
        transaction: { date: { gte: toDate(start), lte: toDate(end) } },
      },
      include: { transaction: true },
      orderBy: [
        { transaction: { date: 'asc' } },
        { transaction: { postedAt: 'asc' } },
        { id: 'asc' },
      ],
    });
    const openingBalance = num(balance);
    const openingFc = fcBalance == null ? null : num(fcBalance);
    const lines = entries.map((e) => {
      balance = balance.plus(e.debit).minus(e.credit);
      if (fcBalance && e.fcAmount)
        fcBalance = e.debit.gt(0) ? fcBalance.plus(e.fcAmount) : fcBalance.minus(e.fcAmount);
      return {
        date: isoDate(e.transaction.date)!,
        voucherId: e.transactionId,
        reference: e.transaction.reference,
        type: e.transaction.type,
        description: e.transaction.description,
        narration: e.narration,
        debit: num(e.debit),
        credit: num(e.credit),
        balance: num(balance),
        currency: e.currency,
        fcAmount: e.fcAmount == null ? null : num(e.fcAmount),
        rate: e.rate == null ? null : num(e.rate),
        fcBalance: fcBalance == null ? null : num(fcBalance),
      };
    });
    return {
      account: await this.chart.get(id),
      from: start,
      to: end,
      opening: openingBalance,
      closing: num(balance),
      fcOpening: openingFc,
      fcClosing: fcBalance == null ? null : num(fcBalance),
      totalDebit: lines.reduce((s, l) => s + l.debit, 0),
      totalCredit: lines.reduce((s, l) => s + l.credit, 0),
      lines,
    };
  }

  /** Every postable account with a non-zero balance as of a date, in Dr/Cr columns. */
  async trialBalance(asOf?: string): Promise<TrialBalanceDto> {
    const date = asOf ?? todayPk();
    const [accounts, sums] = await Promise.all([
      this.prisma.ledgerAccount.findMany({ where: { isGroup: false }, orderBy: { code: 'asc' } }),
      this.chart.sums(date),
    ]);
    const rows = accounts
      .map((a) => {
        const b = sums.get(a.id)?.balance ?? new Decimal(0);
        return {
          accountId: a.id,
          code: a.code,
          name: a.name,
          class: a.class,
          debit: b.gt(0) ? num(b) : 0,
          credit: b.lt(0) ? num(b.neg()) : 0,
        };
      })
      .filter((r) => r.debit || r.credit);
    return {
      asOf: date,
      rows,
      totalDebit: round(rows.reduce((s, r) => s + r.debit, 0)),
      totalCredit: round(rows.reduce((s, r) => s + r.credit, 0)),
    };
  }

  /** Profit and loss for a period: income (net credit) less expenses (net debit). */
  async incomeStatement(from?: string, to?: string): Promise<IncomeStatementDto> {
    const end = to ?? todayPk();
    const start = from ?? `${end.slice(0, 7)}-01`;
    const rows = await this.prisma.$queryRaw<
      { code: string; name: string; class: 'INCOME' | 'EXPENSE'; net: Prisma.Decimal }[]
    >`
      SELECT la.code, la.name, la.class, SUM(le.credit - le.debit) AS net
        FROM "LedgerEntry" le
        JOIN "LedgerAccount" la ON la.id = le."ledgerAccountId"
        JOIN "LedgerTransaction" t ON t.id = le."transactionId"
       WHERE la.class IN ('INCOME', 'EXPENSE')
         AND t.date BETWEEN ${toDate(start)}::date AND ${toDate(end)}::date
       GROUP BY la.code, la.name, la.class
       ORDER BY la.code`;
    const income = rows
      .filter((r) => r.class === 'INCOME')
      .map((r) => ({ code: r.code, name: r.name, amount: num(r.net) }));
    const expenses = rows
      .filter((r) => r.class === 'EXPENSE')
      .map((r) => ({ code: r.code, name: r.name, amount: num(new Decimal(r.net).neg()) }));
    const totalIncome = round(income.reduce((s, r) => s + r.amount, 0));
    const totalExpenses = round(expenses.reduce((s, r) => s + r.amount, 0));
    return {
      from: start,
      to: end,
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit: round(totalIncome - totalExpenses),
    };
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
