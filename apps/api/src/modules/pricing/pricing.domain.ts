import { MarkupType, PricingRule, PricingScope, RoundingMode } from '@prisma/client';

export interface PriceCalculationResult {
  supplierNetPricePKR: number;
  calculatedSellingPricePKR: number;
  markupAmountPKR: number;
  markupTypeApplied: MarkupType;
  markupValueApplied: number;
  appliedRuleId: string;
  appliedRuleName: string;
  breakdown:
    | {
        primaryRule: string;
        stackedRules: string[];
        baseNet: number;
        totalMarkup: number;
        finalPrice: number;
      }
    | string;
}

export interface PricingContext {
  accountId?: string;
  tierId?: string;
  departureId?: string;
  productId?: string;
  productType?: string;
  supplierId?: string;
}

export type RuleOutcome =
  'applied' | 'stacked' | 'overridden' | 'not_matching' | 'inactive' | 'expired';

export interface PricingEvaluation {
  result: PriceCalculationResult;
  applied: { rule: PricingRule; amount: number }[];
  evaluated: { rule: PricingRule; outcome: RuleOutcome }[];
}

// Most specific scope wins (plan 07 §4.1).
export const SCOPE_PRECEDENCE: Record<PricingScope, number> = {
  PARTNER_PRODUCT: 1,
  PARTNER: 2,
  TIER: 3,
  DEPARTURE: 4,
  PRODUCT: 5,
  PRODUCT_TYPE: 6,
  SUPPLIER: 7,
  DEFAULT: 8,
};

function matches(rule: PricingRule, ctx: PricingContext): boolean {
  switch (rule.scope) {
    case 'PARTNER_PRODUCT':
      return rule.accountId === ctx.accountId && rule.productId === ctx.productId;
    case 'PARTNER':
      return rule.accountId === ctx.accountId;
    case 'TIER':
      return !!ctx.tierId && rule.pricingTierId === ctx.tierId;
    case 'DEPARTURE':
      return rule.departureId === ctx.departureId;
    case 'PRODUCT':
      return rule.productId === ctx.productId;
    case 'PRODUCT_TYPE':
      return rule.productType === ctx.productType;
    case 'SUPPLIER':
      return rule.supplierId === ctx.supplierId;
    case 'DEFAULT':
      return true;
    default:
      return false;
  }
}

/** Pure, server-side pricing engine. The client never computes or sends prices. */
export class PricingEngine {
  static calculate(
    netPrice: number,
    rules: PricingRule[],
    context: PricingContext,
  ): PriceCalculationResult {
    return this.evaluate(netPrice, rules, context).result;
  }

  static evaluate(
    netPrice: number,
    rules: PricingRule[],
    context: PricingContext,
    now = new Date(),
  ): PricingEvaluation {
    const evaluated: PricingEvaluation['evaluated'] = [];
    const candidates: PricingRule[] = [];

    for (const rule of rules) {
      if (!rule.isActive || rule.deletedAt) evaluated.push({ rule, outcome: 'inactive' });
      else if (
        (rule.validFrom && new Date(rule.validFrom) > now) ||
        (rule.validTo && new Date(rule.validTo) < now)
      )
        evaluated.push({ rule, outcome: 'expired' });
      else if (!matches(rule, context)) evaluated.push({ rule, outcome: 'not_matching' });
      else candidates.push(rule);
    }

    if (candidates.length === 0) {
      return {
        result: this.buildResult(
          netPrice,
          netPrice,
          0,
          'FIXED',
          0,
          'NONE',
          'No applicable rules',
          'No rules found',
        ),
        applied: [],
        evaluated,
      };
    }

    candidates.sort((a, b) => {
      const scope = SCOPE_PRECEDENCE[a.scope] - SCOPE_PRECEDENCE[b.scope];
      if (scope !== 0) return scope;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Stackable rules are explicit add-ons (e.g. seasonal +2,000): they never replace the base
    // rule, they add to it. The base is the most specific non-stackable rule.
    const primary = candidates.find((r) => !r.stackable) ?? candidates[0];
    const applied = [{ rule: primary, amount: this.computeMarkup(netPrice, primary) }];
    evaluated.push({ rule: primary, outcome: 'applied' });

    for (const rule of candidates) {
      if (rule === primary) continue;
      if (rule.stackable) {
        applied.push({ rule, amount: this.computeMarkup(netPrice, rule) });
        evaluated.push({ rule, outcome: 'stacked' });
      } else {
        evaluated.push({ rule, outcome: 'overridden' });
      }
    }

    let totalMarkup = applied.reduce((sum, a) => sum + a.amount, 0);
    if (primary.minMarkup != null && totalMarkup < Number(primary.minMarkup))
      totalMarkup = Number(primary.minMarkup);
    if (primary.maxMarkup != null && totalMarkup > Number(primary.maxMarkup))
      totalMarkup = Number(primary.maxMarkup);

    // Never sell below net.
    const sellingPrice = Math.max(
      netPrice,
      this.round2(this.applyRounding(netPrice + totalMarkup, primary.rounding)),
    );

    return {
      result: this.buildResult(
        netPrice,
        sellingPrice,
        this.round2(sellingPrice - netPrice),
        primary.markupType,
        Number(primary.markupValue),
        primary.id,
        primary.name,
        {
          primaryRule: primary.name,
          stackedRules: applied.slice(1).map((a) => a.rule.name),
          baseNet: netPrice,
          totalMarkup,
          finalPrice: sellingPrice,
        },
      ),
      applied,
      evaluated,
    };
  }

  private static computeMarkup(netPrice: number, rule: PricingRule): number {
    const value = Number(rule.markupValue);
    return rule.markupType === 'FIXED' ? value : (netPrice * value) / 100;
  }

  private static round2(v: number) {
    return Math.round(v * 100) / 100;
  }

  private static applyRounding(value: number, mode: RoundingMode): number {
    switch (mode) {
      case 'NEAREST_10':
        return Math.round(value / 10) * 10;
      case 'NEAREST_100':
        return Math.round(value / 100) * 100;
      case 'NEAREST_500':
        return Math.round(value / 500) * 500;
      case 'NEAREST_1000':
        return Math.round(value / 1000) * 1000;
      case 'CEIL_100':
        return Math.ceil(value / 100) * 100;
      case 'CEIL_500':
        return Math.ceil(value / 500) * 500;
      case 'CEIL_1000':
        return Math.ceil(value / 1000) * 1000;
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
    breakdown: PriceCalculationResult['breakdown'],
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
