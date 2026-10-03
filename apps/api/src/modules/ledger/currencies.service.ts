import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { CurrencyDto, ExchangeRateDto, PeriodDto, PublicCurrenciesDto } from '@gnk/types';
import type { z } from 'zod';
import type { currencySchema, exchangeRateSchema } from '@gnk/validation';
import { todayPk } from '@gnk/validation';
import { iso, isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BASE, toDate } from './ledger.service';

/** Currencies, manual exchange rates and accounting period locks. */
@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async currencies(): Promise<CurrencyDto[]> {
    const [rows, latest] = await Promise.all([
      this.prisma.currency.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.exchangeRate.findMany({
        distinct: ['currency'],
        orderBy: [{ currency: 'asc' }, { date: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);
    const byCode = new Map(latest.map((r) => [r.currency, r]));
    return rows.map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      isActive: c.isActive,
      latestRate: c.code === BASE ? 1 : byCode.has(c.code) ? num(byCode.get(c.code)!.rate) : null,
      latestRateDate: isoDate(byCode.get(c.code)?.date),
    }));
  }

  async saveCurrency(dto: z.output<typeof currencySchema>) {
    if (dto.code === BASE && !dto.isActive)
      throw new BadRequestException('PKR is the base currency and cannot be deactivated');
    if (!dto.isActive) {
      const used = await this.prisma.ledgerAccount.count({
        where: { currency: dto.code, isActive: true },
      });
      if (used)
        throw new ConflictException(
          `${used} active account(s) use ${dto.code}; deactivate them first`,
        );
    }
    await this.prisma.currency.upsert({
      where: { code: dto.code },
      update: { name: dto.name, symbol: dto.symbol ?? null, isActive: dto.isActive },
      create: {
        code: dto.code,
        name: dto.name,
        symbol: dto.symbol ?? null,
        isActive: dto.isActive,
      },
    });
    return this.currencies();
  }

  /** Active currencies with a rate, for the public website. PKR is always included. */
  async publicRates(): Promise<PublicCurrenciesDto> {
    const rows = await this.currencies();
    return {
      base: BASE,
      currencies: rows
        .filter((c) => c.isActive && (c.code === BASE || c.latestRate != null))
        .map((c) => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol || c.code,
          rate: c.code === BASE ? 1 : c.latestRate!,
        })),
    };
  }

  async rates(currency?: string): Promise<ExchangeRateDto[]> {
    const rows = await this.prisma.exchangeRate.findMany({
      where: currency ? { currency } : {},
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const staff = await this.prisma.staffUser.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.createdById))] } },
      select: { id: true, fullName: true },
    });
    const names = new Map(staff.map((s) => [s.id, s.fullName]));
    return rows.map((r) => ({
      id: r.id,
      currency: r.currency,
      rate: num(r.rate),
      date: isoDate(r.date)!,
      note: r.note,
      createdBy: names.get(r.createdById) ?? null,
      createdAt: iso(r.createdAt)!,
    }));
  }

  async addRate(dto: z.output<typeof exchangeRateSchema>, staffId: string) {
    if (dto.currency === BASE)
      throw new BadRequestException('PKR is the base currency and does not take a conversion rate');
    const currency = await this.prisma.currency.findUnique({ where: { code: dto.currency } });
    if (!currency?.isActive)
      throw new BadRequestException(`${dto.currency} is not an active currency`);
    await this.prisma.exchangeRate.create({
      data: {
        currency: dto.currency,
        rate: dto.rate,
        date: toDate(dto.date),
        note: dto.note ?? null,
        createdById: staffId,
      },
    });
    return this.rates(dto.currency);
  }

  // ---------- Periods ----------

  /** The last 18 months (and any older closed ones) with voucher counts. */
  async periods(): Promise<PeriodDto[]> {
    const today = todayPk();
    const months: string[] = [];
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    for (let i = 0; i < 18; i++) {
      months.push(d.toISOString().slice(0, 7));
      d.setUTCMonth(d.getUTCMonth() - 1);
    }
    const [closed, counts] = await Promise.all([
      this.prisma.closedPeriod.findMany(),
      this.prisma.$queryRaw<{ month: string; n: bigint }[]>`
        SELECT to_char(date, 'YYYY-MM') AS month, COUNT(*) AS n
          FROM "LedgerTransaction" WHERE status = 'POSTED' GROUP BY 1`,
    ]);
    const all = [...new Set([...months, ...closed.map((c) => c.month)])].sort().reverse();
    const staff = await this.prisma.staffUser.findMany({
      where: { id: { in: closed.map((c) => c.closedById) } },
      select: { id: true, fullName: true },
    });
    const names = new Map(staff.map((s) => [s.id, s.fullName]));
    const closedBy = new Map(closed.map((c) => [c.month, c]));
    const n = new Map(counts.map((c) => [c.month, Number(c.n)]));
    return all.map((month) => {
      const c = closedBy.get(month);
      return {
        month,
        closed: !!c,
        closedAt: iso(c?.closedAt),
        closedBy: c ? (names.get(c.closedById) ?? null) : null,
        vouchers: n.get(month) ?? 0,
      };
    });
  }

  async closePeriod(month: string, staffId: string) {
    if (month >= todayPk().slice(0, 7))
      throw new BadRequestException('Only past months can be closed');
    const pending = await this.prisma.ledgerTransaction.count({
      where: {
        status: { in: ['DRAFT', 'SUBMITTED'] },
        date: { gte: toDate(`${month}-01`), lt: toDate(nextMonth(month)) },
      },
    });
    if (pending)
      throw new ConflictException(
        `${pending} draft or submitted voucher(s) are dated in ${month}. Post, re-date or delete them first.`,
      );
    await this.prisma.closedPeriod.upsert({
      where: { month },
      update: {},
      create: { month, closedById: staffId },
    });
    return this.periods();
  }

  async reopenPeriod(month: string) {
    await this.prisma.closedPeriod.deleteMany({ where: { month } });
    return this.periods();
  }
}

function nextMonth(month: string) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
