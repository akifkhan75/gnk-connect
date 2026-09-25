import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Departure, PricingRule, Prisma, Product } from '@prisma/client';
import type { PricingRuleDto, PricingSimulationDto, PricingTierDto, QuoteDto } from '@gnk/types';
import type { PricingRuleInput } from '@gnk/validation';
import type { z } from 'zod';
import type { pricingRuleSchema } from '@gnk/validation';
import { iso, isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { PartnerActor } from '../auth/auth.types';
import { SettingsService } from '../settings/settings.service';
import { PricingEngine, SCOPE_PRECEDENCE, type PricingContext } from './pricing.domain';

type RuleData = z.output<typeof pricingRuleSchema>;
type DepartureWithProduct = Departure & { product: Product };

export const seatsLeft = (d: Pick<Departure, 'supplierAvailable' | 'heldSeats'>) =>
  Math.max(0, d.supplierAvailable - d.heldSeats);

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  activeRules() {
    return this.prisma.pricingRule.findMany({ where: { isActive: true, deletedAt: null } });
  }

  context(
    d: DepartureWithProduct,
    account?: { id: string; pricingTierId: string | null },
  ): PricingContext {
    return {
      accountId: account?.id,
      tierId: account?.pricingTierId ?? undefined,
      departureId: d.id,
      productId: d.productId,
      productType: d.product.type,
      supplierId: d.product.supplierId,
    };
  }

  /** Selling price per seat for many departures with one rule load. */
  async priceMany(
    departures: DepartureWithProduct[],
    account?: { id: string; pricingTierId: string | null },
    rules?: PricingRule[],
  ) {
    const active = rules ?? (await this.activeRules());
    return new Map(
      departures.map((d) => [
        d.id,
        PricingEngine.calculate(num(d.supplierNet), active, this.context(d, account)),
      ]),
    );
  }

  // ---------- Quotes ----------

  async createQuote(actor: PartnerActor, departureId: string, seats: number): Promise<QuoteDto> {
    const departure = await this.prisma.departure.findUnique({
      where: { id: departureId },
      include: { product: true },
    });
    const today = new Date(new Date().toISOString().slice(0, 10));
    if (
      !departure ||
      !departure.product.isPublished ||
      departure.product.deletedAt ||
      departure.departureDate < today
    ) {
      throw new NotFoundException('This departure is no longer available');
    }
    if (!['OPEN', 'FILLING_FAST'].includes(departure.status))
      throw new ConflictException('This departure is closed for booking');
    const available = seatsLeft(departure);
    if (seats > available)
      throw new ConflictException(
        `Only ${available} seat${available === 1 ? '' : 's'} left on this departure`,
      );

    const account = await this.prisma.partnerAccount.findUniqueOrThrow({
      where: { id: actor.accountId },
    });
    const evaluation = PricingEngine.evaluate(
      num(departure.supplierNet),
      await this.activeRules(),
      this.context(departure, account),
    );
    const unit = evaluation.result.calculatedSellingPricePKR;
    const { booking } = await this.settings.get();

    const quote = await this.prisma.priceQuote.create({
      data: {
        accountId: actor.accountId,
        departureId,
        seats,
        supplierNet: departure.supplierNet,
        markup: evaluation.result.markupAmountPKR,
        unitPrice: unit,
        totalPrice: unit * seats,
        breakdown: {
          applied: evaluation.applied.map((a) => ({
            id: a.rule.id,
            name: a.rule.name,
            scope: a.rule.scope,
            amount: a.amount,
          })),
          rounding: evaluation.applied[0]?.rule.rounding ?? 'NONE',
          net: num(departure.supplierNet),
          unitPrice: unit,
        } as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + booking.quoteTtlMinutes * 60_000),
      },
    });
    return this.toQuoteDto(quote, departure);
  }

  async getQuote(actor: PartnerActor, id: string): Promise<QuoteDto> {
    const quote = await this.prisma.priceQuote.findUnique({ where: { id } });
    if (!quote || quote.accountId !== actor.accountId)
      throw new NotFoundException('Quote not found');
    const departure = await this.prisma.departure.findUniqueOrThrow({
      where: { id: quote.departureId },
      include: { product: true },
    });
    return this.toQuoteDto(quote, departure);
  }

  private toQuoteDto(
    q: {
      id: string;
      departureId: string;
      seats: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      expiresAt: Date;
    },
    d: DepartureWithProduct,
  ): QuoteDto {
    return {
      id: q.id,
      departureId: q.departureId,
      seats: q.seats,
      unitPrice: num(q.unitPrice),
      totalPrice: num(q.totalPrice),
      currency: 'PKR',
      expiresAt: iso(q.expiresAt)!,
      group: {
        productId: d.productId,
        title: d.product.title,
        sector: d.product.sector,
        airline: d.product.airline,
        departureDate: isoDate(d.departureDate)!,
        returnDate: isoDate(d.returnDate),
        baggage: d.baggage,
      },
    };
  }

  // ---------- Simulator ----------

  async simulate(
    accountId: string,
    departureId: string,
    seats: number,
  ): Promise<PricingSimulationDto> {
    const [account, departure, rules] = await Promise.all([
      this.prisma.partnerAccount.findUnique({ where: { id: accountId } }),
      this.prisma.departure.findUnique({ where: { id: departureId }, include: { product: true } }),
      this.prisma.pricingRule.findMany({ where: { deletedAt: null } }),
    ]);
    if (!account) throw new NotFoundException('Partner not found');
    if (!departure) throw new NotFoundException('Departure not found');
    const ev = PricingEngine.evaluate(
      num(departure.supplierNet),
      rules,
      this.context(departure, account),
    );
    return {
      supplierNet: ev.result.supplierNetPricePKR,
      markup: ev.result.markupAmountPKR,
      unitPrice: ev.result.calculatedSellingPricePKR,
      seats,
      totalPrice: ev.result.calculatedSellingPricePKR * seats,
      applied: ev.applied.map((a) => ({
        id: a.rule.id,
        name: a.rule.name,
        scope: a.rule.scope,
        amount: a.amount,
      })),
      evaluated: ev.evaluated
        .sort((a, b) => SCOPE_PRECEDENCE[a.rule.scope] - SCOPE_PRECEDENCE[b.rule.scope])
        .map((e) => ({
          id: e.rule.id,
          name: e.rule.name,
          scope: e.rule.scope,
          outcome: e.outcome,
        })),
    };
  }

  // ---------- Rules ----------

  async listRules(): Promise<PricingRuleDto[]> {
    const rules = await this.prisma.pricingRule.findMany({
      where: { deletedAt: null },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });
    rules.sort((a, b) => SCOPE_PRECEDENCE[a.scope] - SCOPE_PRECEDENCE[b.scope]);
    const labels = await this.targetLabels(rules);
    return rules.map((r) => this.toRuleDto(r, labels, rules));
  }

  async createRule(data: RuleData, staffId: string) {
    await this.assertTargets(data);
    const rule = await this.prisma.pricingRule.create({
      data: { ...this.ruleData(data), createdById: staffId },
    });
    return rule;
  }

  async updateRule(id: string, data: RuleData, staffId: string) {
    const existing = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Rule not found');
    await this.assertTargets(data);
    if (
      existing.scope === 'DEFAULT' &&
      existing.isActive &&
      (!data.isActive || data.scope !== 'DEFAULT')
    ) {
      await this.assertAnotherDefault(id);
    }
    return this.prisma.pricingRule.update({
      where: { id, version: existing.version },
      data: { ...this.ruleData(data), updatedById: staffId, version: { increment: 1 } },
    });
  }

  async deleteRule(id: string, staffId: string) {
    const existing = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Rule not found');
    if (existing.scope === 'DEFAULT' && existing.isActive) await this.assertAnotherDefault(id);
    return this.prisma.pricingRule.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById: staffId },
    });
  }

  async getRule(id: string) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule || rule.deletedAt) throw new NotFoundException('Rule not found');
    return rule;
  }

  // ---------- Tiers ----------

  async listTiers(): Promise<PricingTierDto[]> {
    const tiers = await this.prisma.pricingTier.findMany({ orderBy: { name: 'asc' } });
    const counts = await this.prisma.partnerAccount.groupBy({
      by: ['pricingTierId'],
      _count: true,
      where: { pricingTierId: { not: null } },
    });
    return tiers.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      partnersCount: counts.find((c) => c.pricingTierId === t.id)?._count ?? 0,
    }));
  }

  async createTier(name: string, description?: string) {
    return this.prisma.pricingTier.create({ data: { name, description } });
  }

  async deleteTier(id: string) {
    const inUse = await this.prisma.partnerAccount.count({ where: { pricingTierId: id } });
    const rules = await this.prisma.pricingRule.count({
      where: { pricingTierId: id, deletedAt: null },
    });
    if (inUse || rules)
      throw new ConflictException('Move partners and rules off this tier before deleting it');
    await this.prisma.pricingTier.delete({ where: { id } });
  }

  // ---------- helpers ----------

  toRuleDto(r: PricingRule, labels: Map<string, string>, all: PricingRule[] = []): PricingRuleDto {
    const selectorKey = (x: PricingRule) =>
      [
        x.scope,
        x.supplierId,
        x.productType,
        x.productId,
        x.departureId,
        x.accountId,
        x.pricingTierId,
        x.priority,
        x.stackable,
      ].join('|');
    return {
      id: r.id,
      name: r.name,
      scope: r.scope,
      supplierId: r.supplierId,
      productType: r.productType,
      productId: r.productId,
      departureId: r.departureId,
      accountId: r.accountId,
      pricingTierId: r.pricingTierId,
      markupType: r.markupType,
      markupValue: num(r.markupValue),
      minMarkup: r.minMarkup == null ? null : num(r.minMarkup),
      maxMarkup: r.maxMarkup == null ? null : num(r.maxMarkup),
      stackable: r.stackable,
      priority: r.priority,
      rounding: r.rounding,
      validFrom: isoDate(r.validFrom),
      validTo: isoDate(r.validTo),
      isActive: r.isActive,
      updatedAt: iso(r.updatedAt)!,
      targetLabel: labels.get(r.id) ?? 'All products and partners',
      conflictsWith: r.isActive
        ? all
            .filter((o) => o.id !== r.id && o.isActive && selectorKey(o) === selectorKey(r))
            .map((o) => o.name)
        : [],
    };
  }

  async targetLabels(rules: PricingRule[]) {
    const ids = (k: keyof PricingRule) => [
      ...new Set(rules.map((r) => r[k]).filter(Boolean) as string[]),
    ];
    const [accounts, products, departures, suppliers, tiers] = await Promise.all([
      this.prisma.partnerAccount.findMany({
        where: { id: { in: ids('accountId') } },
        select: { id: true, code: true, legalName: true, tradeName: true },
      }),
      this.prisma.product.findMany({
        where: { id: { in: ids('productId') } },
        select: { id: true, title: true },
      }),
      this.prisma.departure.findMany({
        where: { id: { in: ids('departureId') } },
        include: { product: { select: { sector: true, title: true } } },
      }),
      this.prisma.supplier.findMany({
        where: { id: { in: ids('supplierId') } },
        select: { id: true, name: true },
      }),
      this.prisma.pricingTier.findMany({
        where: { id: { in: ids('pricingTierId') } },
        select: { id: true, name: true },
      }),
    ]);
    const name = <T extends { id: string }>(list: T[], id: string | null, f: (x: T) => string) => {
      const x = id ? list.find((i) => i.id === id) : undefined;
      return x ? f(x) : 'unknown';
    };
    const partner = (id: string | null) =>
      name(accounts, id, (a) => `${a.tradeName || a.legalName} (${a.code})`);
    const product = (id: string | null) => name(products, id, (p) => p.title);
    const labels = new Map<string, string>();
    for (const r of rules) {
      const label = {
        PARTNER_PRODUCT: () => `${partner(r.accountId)} · ${product(r.productId)}`,
        PARTNER: () => partner(r.accountId),
        TIER: () => `Tier: ${name(tiers, r.pricingTierId, (t) => t.name)}`,
        DEPARTURE: () =>
          name(
            departures,
            r.departureId,
            (d) => `${d.product.sector ?? d.product.title} on ${isoDate(d.departureDate)}`,
          ),
        PRODUCT: () => product(r.productId),
        PRODUCT_TYPE: () => `All ${r.productType?.toLowerCase()} products`,
        SUPPLIER: () => `All ${name(suppliers, r.supplierId, (s) => s.name)} products`,
        DEFAULT: () => 'All products and partners',
      }[r.scope]();
      labels.set(r.id, label);
    }
    return labels;
  }

  private ruleData(d: RuleData) {
    // Only the selectors relevant to the scope are stored.
    const keep = {
      PARTNER_PRODUCT: ['accountId', 'productId'],
      PARTNER: ['accountId'],
      TIER: ['pricingTierId'],
      DEPARTURE: ['departureId'],
      PRODUCT: ['productId'],
      PRODUCT_TYPE: ['productType'],
      SUPPLIER: ['supplierId'],
      DEFAULT: [],
    }[d.scope] as string[];
    const sel = (k: string, v: unknown) => (keep.includes(k) ? (v ?? null) : null);
    return {
      name: d.name,
      scope: d.scope,
      supplierId: sel('supplierId', d.supplierId) as string | null,
      productType: sel('productType', d.productType) as PricingRule['productType'],
      productId: sel('productId', d.productId) as string | null,
      departureId: sel('departureId', d.departureId) as string | null,
      accountId: sel('accountId', d.accountId) as string | null,
      pricingTierId: sel('pricingTierId', d.pricingTierId) as string | null,
      markupType: d.markupType,
      markupValue: d.markupValue,
      minMarkup: d.minMarkup ?? null,
      maxMarkup: d.maxMarkup ?? null,
      stackable: d.stackable,
      priority: d.priority,
      rounding: d.rounding,
      validFrom: d.validFrom ? new Date(`${d.validFrom}T00:00:00+05:00`) : null,
      validTo: d.validTo ? new Date(`${d.validTo}T23:59:59+05:00`) : null,
      isActive: d.isActive,
    };
  }

  private async assertTargets(d: RuleData) {
    const check = async (ok: Promise<unknown>, what: string) => {
      if (!(await ok)) throw new BadRequestException(`The selected ${what} does not exist`);
    };
    if (d.accountId && ['PARTNER', 'PARTNER_PRODUCT'].includes(d.scope))
      await check(this.prisma.partnerAccount.findUnique({ where: { id: d.accountId } }), 'partner');
    if (d.productId && ['PRODUCT', 'PARTNER_PRODUCT'].includes(d.scope))
      await check(this.prisma.product.findUnique({ where: { id: d.productId } }), 'product');
    if (d.departureId && d.scope === 'DEPARTURE')
      await check(this.prisma.departure.findUnique({ where: { id: d.departureId } }), 'departure');
    if (d.supplierId && d.scope === 'SUPPLIER')
      await check(this.prisma.supplier.findUnique({ where: { id: d.supplierId } }), 'supplier');
    if (d.pricingTierId && d.scope === 'TIER')
      await check(
        this.prisma.pricingTier.findUnique({ where: { id: d.pricingTierId } }),
        'pricing tier',
      );
  }

  private async assertAnotherDefault(excludeId: string) {
    const others = await this.prisma.pricingRule.count({
      where: { scope: 'DEFAULT', isActive: true, deletedAt: null, id: { not: excludeId } },
    });
    if (!others)
      throw new ConflictException(
        'At least one active default rule is required. Create another default rule first.',
      );
  }
}

export type { PricingRuleInput };
