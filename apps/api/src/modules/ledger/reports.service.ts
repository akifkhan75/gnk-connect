import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AccountLedgerDto,
  BalanceSheetDto,
  CashBankReportDto,
  ExpenseReportDto,
  IncomeStatementDto,
  SalesGroupReportDto,
  SalesReportDto,
  TrialBalanceDto,
} from '@gnk/types';
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
    const start = from;
    if (start && start > end)
      throw new BadRequestException('The start date must be before the end date');
    const foreign = account.currency !== BASE;

    const [opening, last, openingEntry] = await Promise.all([
      start ? this.chart.sums(daysBefore(start, 1), [id]) : Promise.resolve(new Map()),
      this.prisma.ledgerEntry.findFirst({
        where: { ledgerAccountId: id },
        orderBy: [{ transaction: { date: 'desc' } }, { id: 'desc' }],
        select: { transaction: { select: { date: true } } },
      }),
      this.prisma.ledgerEntry.findFirst({
        where: { ledgerAccountId: id, narration: 'Opening balance' },
        select: { id: true },
      }),
    ]);
    const open = start ? opening.get(id) : undefined;
    let balance = open?.balance ?? new Decimal(0);
    let fcBalance = foreign ? (open?.fc ?? new Decimal(0)) : null;
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        ledgerAccountId: id,
        transaction: {
          date: { ...(start ? { gte: toDate(start) } : {}), lte: toDate(end) },
        },
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
      from: start ?? lines[0]?.date ?? end,
      to: end,
      opening: openingBalance,
      closing: num(balance),
      fcOpening: openingFc,
      fcClosing: fcBalance == null ? null : num(fcBalance),
      totalDebit: lines.reduce((s, l) => s + l.debit, 0),
      totalCredit: lines.reduce((s, l) => s + l.credit, 0),
      lastTransaction: last ? isoDate(last.transaction.date) : null,
      hasOpening: !!openingEntry,
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

  /** Statement of financial position: assets = liabilities + equity + YTD earnings. */
  async balanceSheet(asOf?: string): Promise<BalanceSheetDto> {
    const date = asOf ?? todayPk();
    const yearStart = `${date.slice(0, 4)}-01-01`;
    const [accounts, sums, pl] = await Promise.all([
      this.prisma.ledgerAccount.findMany({ where: { isGroup: false }, orderBy: { code: 'asc' } }),
      this.chart.sums(date),
      this.incomeStatement(yearStart, date),
    ]);
    const section = (cls: 'ASSET' | 'LIABILITY' | 'EQUITY', invert: boolean) =>
      accounts
        .map((a) => {
          if (a.class !== cls) return null;
          const raw = num(sums.get(a.id)?.balance ?? new Decimal(0));
          const amount = invert ? -raw : raw;
          return amount
            ? { accountId: a.id, code: a.code, name: a.name, amount: round(amount) }
            : null;
        })
        .filter((r): r is NonNullable<typeof r> => !!r);
    const assets = section('ASSET', false);
    const liabilities = section('LIABILITY', true);
    const equity = section('EQUITY', true);
    const currentEarnings = pl.netProfit;
    const totalAssets = round(assets.reduce((s, r) => s + r.amount, 0));
    const totalLiabilities = round(liabilities.reduce((s, r) => s + r.amount, 0));
    const totalEquity = round(equity.reduce((s, r) => s + r.amount, 0) + currentEarnings);
    return {
      asOf: date,
      assets,
      liabilities,
      equity,
      currentEarnings,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: round(totalLiabilities + totalEquity),
    };
  }

  async sales(from?: string, to?: string, includeCost = false): Promise<SalesReportDto> {
    const { start, end, lines } = await this.saleLines(from, to, includeCost);
    return { ...this.saleTotals(start, end, lines, includeCost), rows: lines };
  }

  async commission(from?: string, to?: string, includeCost = false): Promise<SalesGroupReportDto> {
    return this.groupSales(from, to, includeCost, (l) => ({
      id: l.partnerId,
      code: l.partnerCode,
      name: l.partnerName,
    }));
  }

  async salesByPartner(
    from?: string,
    to?: string,
    includeCost = false,
  ): Promise<SalesGroupReportDto> {
    return this.groupSales(from, to, includeCost, (l) => ({
      id: l.partnerId,
      code: l.partnerCode,
      name: l.partnerName,
    }));
  }

  async salesBySupplier(
    from?: string,
    to?: string,
    includeCost = false,
  ): Promise<SalesGroupReportDto> {
    return this.groupSales(from, to, includeCost, (l) => ({
      id: l.supplierId,
      name: l.supplierName,
    }));
  }

  /** Posted expense lines in the period, plus a per-account roll-up. */
  async expenses(from?: string, to?: string): Promise<ExpenseReportDto> {
    const { start, end } = this.range(from, to);
    const rows = await this.prisma.$queryRaw<
      {
        date: Date;
        voucherId: string;
        reference: string;
        type: ExpenseReportDto['lines'][number]['type'];
        accountCode: string;
        accountName: string;
        description: string;
        amount: Prisma.Decimal;
      }[]
    >`
      SELECT t.date, t.id AS "voucherId", t.reference, t.type,
             la.code AS "accountCode", la.name AS "accountName",
             t.description, SUM(le.debit - le.credit) AS amount
        FROM "LedgerEntry" le
        JOIN "LedgerAccount" la ON la.id = le."ledgerAccountId"
        JOIN "LedgerTransaction" t ON t.id = le."transactionId"
       WHERE la.class = 'EXPENSE'
         AND t.date BETWEEN ${toDate(start)}::date AND ${toDate(end)}::date
       GROUP BY t.date, t.id, t.reference, t.type, la.code, la.name, t.description
      HAVING SUM(le.debit - le.credit) <> 0
       ORDER BY t.date, t.reference`;
    const lines = rows.map((r) => ({
      date: isoDate(r.date)!,
      voucherId: r.voucherId,
      reference: r.reference,
      type: r.type,
      accountCode: r.accountCode,
      accountName: r.accountName,
      description: r.description,
      amount: round(num(r.amount)),
    }));
    const byAccount = new Map<string, { code: string; name: string; amount: number }>();
    for (const l of lines) {
      const prev = byAccount.get(l.accountCode);
      byAccount.set(l.accountCode, {
        code: l.accountCode,
        name: l.accountName,
        amount: round((prev?.amount ?? 0) + l.amount),
      });
    }
    return {
      from: start,
      to: end,
      lines,
      byAccount: [...byAccount.values()].sort((a, b) => a.code.localeCompare(b.code)),
      total: round(lines.reduce((s, l) => s + l.amount, 0)),
    };
  }

  async cashBank(from?: string, to?: string): Promise<CashBankReportDto> {
    const { start, end } = this.range(from, to);
    const accounts = await this.cashBankAccounts();
    const ledgers = await Promise.all(accounts.map((a) => this.accountLedger(a.id, start, end)));
    return {
      from: start,
      to: end,
      accounts: ledgers.map((l) => ({
        accountId: l.account.id,
        code: l.account.code,
        name: l.account.name,
        opening: l.opening,
        inflows: l.totalDebit,
        outflows: l.totalCredit,
        closing: l.closing,
        lines: l.lines,
      })),
    };
  }

  private range(from?: string, to?: string) {
    const end = to ?? todayPk();
    const start = from ?? `${end.slice(0, 7)}-01`;
    if (start > end) throw new BadRequestException('The start date must be before the end date');
    return { start, end };
  }

  private async saleLines(from?: string, to?: string, includeCost = false) {
    const { start, end } = this.range(from, to);
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: toDate(start), lt: toDate(daysBefore(end, -1)) },
      },
      include: {
        account: { select: { id: true, code: true, legalName: true } },
        product: { select: { title: true, supplier: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const lines = bookings.map((b) => {
      const revenue = num(b.totalPrice);
      const cost = includeCost ? num(b.supplierNetUnit.times(b.seats)) : null;
      return {
        bookingId: b.id,
        date: isoDate(b.createdAt)!,
        reference: b.reference,
        partnerId: b.account.id,
        partnerCode: b.account.code,
        partnerName: b.account.legalName,
        supplierId: b.product.supplier.id,
        supplierName: b.product.supplier.name,
        product: b.product.title,
        seats: b.seats,
        revenue,
        cost,
        commission: cost == null ? null : round(revenue - cost),
      };
    });
    return { start, end, lines };
  }

  private saleTotals(
    start: string,
    end: string,
    lines: Awaited<ReturnType<ReportsService['saleLines']>>['lines'],
    includeCost: boolean,
  ) {
    const revenue = round(lines.reduce((s, l) => s + l.revenue, 0));
    const cost = includeCost ? round(lines.reduce((s, l) => s + (l.cost ?? 0), 0)) : null;
    return {
      from: start,
      to: end,
      includeCost,
      bookings: lines.length,
      seats: lines.reduce((s, l) => s + l.seats, 0),
      revenue,
      cost,
      commission: cost == null ? null : round(revenue - cost),
    };
  }

  private async groupSales(
    from: string | undefined,
    to: string | undefined,
    includeCost: boolean,
    key: (l: Awaited<ReturnType<ReportsService['saleLines']>>['lines'][number]) => {
      id: string;
      code?: string;
      name: string;
    },
  ): Promise<SalesGroupReportDto> {
    const { start, end, lines } = await this.saleLines(from, to, includeCost);
    const groups = new Map<string, SalesGroupReportDto['rows'][number]>();
    for (const l of lines) {
      const k = key(l);
      const prev = groups.get(k.id);
      groups.set(k.id, {
        id: k.id,
        code: k.code,
        name: k.name,
        bookings: (prev?.bookings ?? 0) + 1,
        seats: (prev?.seats ?? 0) + l.seats,
        revenue: round((prev?.revenue ?? 0) + l.revenue),
        cost: includeCost ? round((prev?.cost ?? 0) + (l.cost ?? 0)) : null,
        commission: includeCost ? round((prev?.commission ?? 0) + (l.commission ?? 0)) : null,
      });
    }
    const rows = [...groups.values()].sort((a, b) => b.revenue - a.revenue);
    return { ...this.saleTotals(start, end, lines, includeCost), rows };
  }

  private async cashBankAccounts() {
    const all = await this.prisma.ledgerAccount.findMany({ orderBy: { code: 'asc' } });
    const byId = new Map(all.map((a) => [a.id, a]));
    const keys = all.filter((a) => a.systemKey === 'CASH' || a.systemKey === 'BANK');
    if (!keys.length) return [];
    const chain = (id: string) => {
      const ids = [id];
      for (
        let p = byId.get(id)?.parentId ? byId.get(byId.get(id)!.parentId!) : undefined;
        p;
        p = p.parentId ? byId.get(p.parentId) : undefined
      )
        ids.push(p.id);
      return ids;
    };
    let common = chain(keys[0].id);
    for (const k of keys.slice(1)) {
      const ids = new Set(chain(k.id));
      common = common.filter((id) => ids.has(id));
    }
    const rootId = common[0];
    if (!rootId) return keys.filter((a) => !a.isGroup);
    const children = new Map<string | null, typeof all>();
    for (const a of all) children.set(a.parentId, [...(children.get(a.parentId) ?? []), a]);
    const collect = (id: string): typeof all => {
      const a = byId.get(id);
      const kids = (children.get(id) ?? []).flatMap((c) => collect(c.id));
      if (!a) return kids;
      return a.isGroup ? kids : [a, ...kids];
    };
    return collect(rootId);
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
