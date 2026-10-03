import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PricingService } from './pricing.service';
import { mockPrisma } from '../../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

const rule = {
  id: 'r1',
  name: 'Default',
  scope: 'DEFAULT' as const,
  supplierId: null,
  productType: null,
  productId: null,
  departureId: null,
  accountId: null,
  pricingTierId: null,
  markupType: 'PERCENT',
  markupValue: D(10),
  minMarkup: null,
  maxMarkup: null,
  stackable: false,
  priority: 0,
  rounding: 'NONE',
  validFrom: null,
  validTo: null,
  isActive: true,
  deletedAt: null,
  updatedAt: new Date(),
  version: 1,
};

describe('PricingService coverage', () => {
  const prisma = mockPrisma();
  const svc = new PricingService(
    prisma as never,
    {
      get: jest.fn().mockResolvedValue({ booking: { quoteTtlMinutes: 15 } }),
    } as never,
  );

  it('simulates, lists rules/tiers, and mutates them', async () => {
    prisma.partnerAccount.findUnique.mockResolvedValue({ id: 'acc-1', pricingTierId: null });
    prisma.departure.findUnique.mockResolvedValue({
      id: 'd1',
      productId: 'p1',
      supplierNet: D(100000),
      product: { type: 'GROUP', supplierId: 's1' },
    });
    prisma.pricingRule.findMany.mockResolvedValue([rule]);
    const sim = await svc.simulate('acc-1', 'd1', 2);
    expect(sim.seats).toBe(2);

    prisma.partnerAccount.findMany.mockResolvedValue([]);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.departure.findMany.mockResolvedValue([]);
    prisma.supplier.findMany.mockResolvedValue([]);
    prisma.pricingTier.findMany.mockResolvedValue([]);
    const rules = await svc.listRules();
    expect(rules[0].id).toBe('r1');

    prisma.pricingRule.create.mockResolvedValue(rule);
    await svc.createRule(
      {
        name: 'Default',
        scope: 'DEFAULT',
        markupType: 'PERCENT',
        markupValue: 10,
        stackable: false,
        priority: 0,
        rounding: 'NONE',
        isActive: true,
      } as never,
      'su-1',
    );
    prisma.pricingRule.findUnique.mockResolvedValue(rule);
    await svc.getRule('r1');
    prisma.pricingRule.count.mockResolvedValue(1);
    await svc.updateRule(
      'r1',
      {
        name: 'Default',
        scope: 'DEFAULT',
        markupType: 'PERCENT',
        markupValue: 12,
        stackable: false,
        priority: 0,
        rounding: 'NONE',
        isActive: true,
      } as never,
      'su-1',
    );
    await svc.deleteRule('r1', 'su-1');

    prisma.pricingTier.findMany.mockResolvedValue([{ id: 't1', name: 'Gold', description: null }]);
    prisma.partnerAccount.groupBy.mockResolvedValue([{ pricingTierId: 't1', _count: 2 }]);
    expect((await svc.listTiers())[0].partnersCount).toBe(2);
    prisma.pricingTier.create.mockResolvedValue({ id: 't2' });
    await svc.createTier('Silver', 'desc');
    prisma.partnerAccount.count.mockResolvedValue(0);
    prisma.pricingRule.count.mockResolvedValue(0);
    await svc.deleteTier('t2');
  });

  it('rejects missing partners, rules, and in-use tiers', async () => {
    prisma.partnerAccount.findUnique.mockResolvedValue(null);
    await expect(svc.simulate('x', 'd', 1)).rejects.toBeInstanceOf(NotFoundException);
    prisma.pricingRule.findUnique.mockResolvedValue(null);
    await expect(svc.getRule('missing')).rejects.toBeInstanceOf(NotFoundException);
    prisma.partnerAccount.count.mockResolvedValue(1);
    await expect(svc.deleteTier('t1')).rejects.toBeInstanceOf(ConflictException);
  });
});
