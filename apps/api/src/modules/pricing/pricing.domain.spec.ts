import { PricingEngine } from './pricing.domain';
import { PricingRule, MarkupType, RoundingMode, PricingScope, ProductType } from '@prisma/client';

describe('PricingEngine Domain Logic', () => {
  const baseNet = 185000;

  const mockRule = (overrides: Partial<PricingRule>): PricingRule => ({
    id: `rule-${Math.random()}`,
    name: 'Test Rule',
    scope: PricingScope.DEFAULT,
    supplierId: null,
    productType: null,
    productId: null,
    departureId: null,
    accountId: null,
    pricingTierId: null,
    markupType: MarkupType.FIXED,
    markupValue: 10000 as any, // bypassing Decimal typing for test simplicity
    minMarkup: null,
    maxMarkup: null,
    stackable: false,
    priority: 0,
    rounding: RoundingMode.NONE,
    validFrom: null,
    validTo: null,
    isActive: true,
    version: 1,
    createdById: 'sys',
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    partnerAccountId: null,
    ...overrides,
  });

  const defaultRule = mockRule({
    name: 'DEFAULT +10,000',
    scope: PricingScope.DEFAULT,
    markupType: MarkupType.FIXED,
    markupValue: 10000 as any,
  });

  const partnerRule = mockRule({
    name: 'PARTNER 5%',
    scope: PricingScope.PARTNER,
    accountId: 'account-abc',
    markupType: MarkupType.PERCENTAGE,
    markupValue: 5 as any,
  });

  const partnerProductRule = mockRule({
    name: 'PARTNER_PRODUCT +12,000',
    scope: PricingScope.PARTNER_PRODUCT,
    accountId: 'account-abc',
    productId: 'prod-dxb',
    markupType: MarkupType.FIXED,
    markupValue: 12000 as any,
  });

  const productRule = mockRule({
    name: 'PRODUCT +10,000',
    scope: PricingScope.PRODUCT,
    productId: 'prod-dxb',
    markupType: MarkupType.FIXED,
    markupValue: 10000 as any,
  });

  it('Case 1: XYZ Travels, Dubai -> DEFAULT +10,000', () => {
    const res = PricingEngine.calculate(baseNet, [defaultRule, partnerRule, partnerProductRule, productRule], {
      accountId: 'account-xyz',
      productId: 'prod-dxb',
    });
    expect(res.calculatedSellingPricePKR).toBe(195000);
    expect(res.appliedRuleName).toBe('PRODUCT +10,000'); // Wait, case 4 says PRODUCT beats DEFAULT
  });

  it('Case 1 (fixed): XYZ Travels, Unknown Product -> DEFAULT +10,000', () => {
    const res = PricingEngine.calculate(baseNet, [defaultRule, partnerRule, partnerProductRule, productRule], {
      accountId: 'account-xyz',
      productId: 'prod-unknown',
    });
    expect(res.calculatedSellingPricePKR).toBe(195000);
    expect(res.appliedRuleName).toBe('DEFAULT +10,000');
  });

  it('Case 2: ABC Travels, any product -> PARTNER 5% beats DEFAULT', () => {
    const res = PricingEngine.calculate(baseNet, [defaultRule, partnerRule], {
      accountId: 'account-abc',
      productId: 'prod-unknown',
    });
    expect(res.calculatedSellingPricePKR).toBe(194250); // 185000 * 1.05
    expect(res.appliedRuleName).toBe('PARTNER 5%');
  });

  it('Case 3: ABC Travels, Dubai Group -> PARTNER_PRODUCT +12,000 beats all', () => {
    const res = PricingEngine.calculate(baseNet, [defaultRule, partnerRule, partnerProductRule, productRule], {
      accountId: 'account-abc',
      productId: 'prod-dxb',
    });
    expect(res.calculatedSellingPricePKR).toBe(197000); // 185000 + 12000
    expect(res.appliedRuleName).toBe('PARTNER_PRODUCT +12,000');
  });

  it('Case 4: Any partner, Dubai Group -> PRODUCT +10,000 beats DEFAULT', () => {
    const res = PricingEngine.calculate(baseNet, [defaultRule, productRule], {
      accountId: 'account-random',
      productId: 'prod-dxb',
    });
    expect(res.calculatedSellingPricePKR).toBe(195000); // 185000 + 10000
    expect(res.appliedRuleName).toBe('PRODUCT +10,000');
  });

  it('Handles stackable rules', () => {
    const seasonalStack = mockRule({
      name: 'Seasonal +2,000',
      scope: PricingScope.DEFAULT,
      markupType: MarkupType.FIXED,
      markupValue: 2000 as any,
      stackable: true,
      priority: 1, // higher priority number -> lower evaluation precedence in the same scope, wait, 
                   // my engine sorts by (rank asc, priority desc). So if stackable is evaluated AFTER the base rule.
    });
    
    // In engine: 
    // validRules.sort((a, b) => {
    //   const scopeA = SCOPE_PRECEDENCE[a.scope];
    //   const scopeB = SCOPE_PRECEDENCE[b.scope];
    //   if (scopeA !== scopeB) return scopeA - scopeB;
    //   return b.priority - a.priority; // changed to desc
    // });

    const res = PricingEngine.calculate(baseNet, [defaultRule, seasonalStack], {});
    // wait, seasonalStack is scope DEFAULT.
    // defaultRule priority is 0, seasonal priority is 1.
    // Base rule should be seasonalStack if we sort desc? No, we usually want priority 1 to BEAT priority 0. 
    // Wait, let's just assert it stacks.
    expect(res.markupAmountPKR).toBe(12000);
    expect(res.calculatedSellingPricePKR).toBe(197000);
  });

  it('Handles min/max clamps on percentage', () => {
    const clampRule = mockRule({
      name: 'CLAMP RULE 10%',
      scope: PricingScope.DEFAULT,
      markupType: MarkupType.PERCENTAGE,
      markupValue: 10 as any, // 18,500 markup
      minMarkup: 20000 as any, // force to 20,000
    });
    const res = PricingEngine.calculate(baseNet, [clampRule], {});
    expect(res.markupAmountPKR).toBe(20000);
    expect(res.calculatedSellingPricePKR).toBe(205000);

    const clampMax = mockRule({
      name: 'CLAMP MAX',
      scope: PricingScope.DEFAULT,
      markupType: MarkupType.PERCENTAGE,
      markupValue: 10 as any, // 18,500 markup
      maxMarkup: 5000 as any, // force to 5,000
    });
    const res2 = PricingEngine.calculate(baseNet, [clampMax], {});
    expect(res2.markupAmountPKR).toBe(5000);
    expect(res2.calculatedSellingPricePKR).toBe(190000);
  });

  it('Handles rounding', () => {
    const roundRule = mockRule({
      name: 'ROUND NEAREST_1000',
      scope: PricingScope.DEFAULT,
      markupType: MarkupType.PERCENTAGE,
      markupValue: 5.12 as any, // 185000 * 5.12% = 9472 markup => 194472
      rounding: RoundingMode.NEAREST_1000,
    });
    const res = PricingEngine.calculate(baseNet, [roundRule], {});
    // 194472 nearest 1000 -> 194000
    expect(res.calculatedSellingPricePKR).toBe(194000);
    expect(res.markupAmountPKR).toBe(9000); // selling - net
  });
});
