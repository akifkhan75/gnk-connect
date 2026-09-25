import { PricingRule, MarkupType, RoundingMode, PricingScope } from '@prisma/client';

export interface PriceCalculationResult {
  supplierNetPricePKR: number;
  calculatedSellingPricePKR: number;
  markupAmountPKR: number;
  markupTypeApplied: MarkupType;
  markupValueApplied: number;
  appliedRuleId: string;
  appliedRuleName: string;
  breakdown: any;
}

const SCOPE_PRECEDENCE: Record<PricingScope, number> = {
  PARTNER_PRODUCT: 1,
  PARTNER: 2,
  TIER: 3,
  DEPARTURE: 4,
  PRODUCT: 5,
  PRODUCT_TYPE: 6,
  SUPPLIER: 7,
  DEFAULT: 8,
};

export class PricingEngine {
  static calculate(
    netPrice: number,
    rules: PricingRule[],
    context: {
      accountId?: string;
      tierId?: string;
      departureId?: string;
      productId?: string;
      productType?: string;
      supplierId?: string;
    }
  ): PriceCalculationResult {
    // 1. Filter valid rules for this context
    const validRules = rules.filter(rule => {
      if (!rule.isActive) return false;
      const now = new Date();
      if (rule.validFrom && new Date(rule.validFrom) > now) return false;
      if (rule.validTo && new Date(rule.validTo) < now) return false;

      switch (rule.scope) {
        case 'PARTNER_PRODUCT':
          return rule.accountId === context.accountId && rule.productId === context.productId;
        case 'PARTNER':
          return rule.accountId === context.accountId;
        case 'TIER':
          return rule.pricingTierId === context.tierId;
        case 'DEPARTURE':
          return rule.departureId === context.departureId;
        case 'PRODUCT':
          return rule.productId === context.productId;
        case 'PRODUCT_TYPE':
          return rule.productType === context.productType;
        case 'SUPPLIER':
          return rule.supplierId === context.supplierId;
        case 'DEFAULT':
          return true;
        default:
          return false;
      }
    });

    if (validRules.length === 0) {
      return this.buildResult(netPrice, netPrice, 0, 'FIXED', 0, 'NONE', 'No applicable rules', 'No rules found', 'NONE');
    }

    // 2. Sort by scope precedence (lower number = higher precedence), then by explicit priority (desc), then updatedAt (desc)
    validRules.sort((a, b) => {
      const scopeA = SCOPE_PRECEDENCE[a.scope];
      const scopeB = SCOPE_PRECEDENCE[b.scope];
      if (scopeA !== scopeB) return scopeA - scopeB;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // 3. Apply rules (handling stackable)
    const primaryRule = validRules[0];
    let totalMarkup = this.computeMarkup(netPrice, primaryRule);
    const appliedRules = [primaryRule];

    // Check stackable rules of LOWER precedence
    for (let i = 1; i < validRules.length; i++) {
      const rule = validRules[i];
      if (rule.stackable) {
        totalMarkup += this.computeMarkup(netPrice, rule);
        appliedRules.push(rule);
      }
    }

    // Min/Max bounds on the Primary rule (usually boundaries apply to the final composed markup)
    if (primaryRule.minMarkup && totalMarkup < Number(primaryRule.minMarkup)) {
      totalMarkup = Number(primaryRule.minMarkup);
    }
    if (primaryRule.maxMarkup && totalMarkup > Number(primaryRule.maxMarkup)) {
      totalMarkup = Number(primaryRule.maxMarkup);
    }

    let sellingPrice = netPrice + totalMarkup;
    sellingPrice = this.applyRounding(sellingPrice, primaryRule.rounding);

    const breakdown = {
      primaryRule: primaryRule.name,
      stackedRules: appliedRules.slice(1).map(r => r.name),
      baseNet: netPrice,
      totalMarkup,
      finalPrice: sellingPrice,
    };

    return this.buildResult(
      netPrice,
      sellingPrice,
      sellingPrice - netPrice,
      primaryRule.markupType,
      Number(primaryRule.markupValue),
      primaryRule.id,
      primaryRule.name,
      breakdown,
      primaryRule.rounding
    );
  }

  private static computeMarkup(netPrice: number, rule: PricingRule): number {
    const val = Number(rule.markupValue);
    if (rule.markupType === 'FIXED') {
      return val;
    } else {
      return (netPrice * val) / 100;
    }
  }

  private static applyRounding(value: number, mode: RoundingMode): number {
    switch (mode) {
      case 'NEAREST_10': return Math.round(value / 10) * 10;
      case 'NEAREST_100': return Math.round(value / 100) * 100;
      case 'NEAREST_500': return Math.round(value / 500) * 500;
      case 'NEAREST_1000': return Math.round(value / 1000) * 1000;
      case 'CEIL_100': return Math.ceil(value / 100) * 100;
      case 'CEIL_500': return Math.ceil(value / 500) * 500;
      case 'CEIL_1000': return Math.ceil(value / 1000) * 1000;
      case 'NONE':
      default:
        return value;
    }
  }

  private static buildResult(
    netPrice: number,
    sellingPrice: number,
    markupAmount: number,
    markupTypeApplied: MarkupType,
    markupValueApplied: number,
    appliedRuleId: string,
    appliedRuleName: string,
    breakdown: any,
    rounding: RoundingMode
  ): PriceCalculationResult {
    return {
      supplierNetPricePKR: netPrice,
      calculatedSellingPricePKR: sellingPrice,
      markupAmountPKR: markupAmount,
      markupTypeApplied,
      markupValueApplied,
      appliedRuleId,
      appliedRuleName,
      breakdown,
    };
  }
}
