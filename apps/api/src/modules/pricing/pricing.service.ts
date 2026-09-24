import { Injectable } from '@nestjs/common';
import { PricingRule, PriceCalculationResult, RulePriority, MarkupType } from '@gnk/types';

@Injectable()
export class PricingService {
  private rules: PricingRule[] = [
    {
      id: 'rule-agent-prod-01',
      name: 'ABC Travels Dubai Group VIP Override',
      priority: 1,
      supplierId: 'airdesk',
      productId: 'AD-DXB-7D-EXP',
      agencyId: 'agency-abc-travels',
      markupType: 'FIXED',
      markupValue: 12000,
      currency: 'PKR',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rule-agent-02',
      name: 'ABC Travels Preferred Partner Margin (5%)',
      priority: 2,
      agencyId: 'agency-abc-travels',
      markupType: 'PERCENTAGE',
      markupValue: 5,
      currency: 'PKR',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rule-default-07',
      name: 'GNK Elite Global Default Markup',
      priority: 5,
      markupType: 'FIXED',
      markupValue: 10000,
      currency: 'PKR',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  getRules(): PricingRule[] {
    return [...this.rules].sort((a, b) => a.priority - b.priority);
  }

  saveRule(rule: Partial<PricingRule>): PricingRule {
    const newRule: PricingRule = {
      id: rule.id || `rule-${Date.now()}`,
      name: rule.name || 'Custom Rule',
      priority: rule.priority || 2,
      markupType: rule.markupType || 'FIXED',
      markupValue: rule.markupValue || 10000,
      currency: 'PKR',
      agencyId: rule.agencyId,
      productId: rule.productId,
      supplierId: rule.supplierId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rules.push(newRule);
    return newRule;
  }

  calculatePrice(params: {
    supplierNetPricePKR: number;
    supplierId: string;
    product: { id: string; supplierProductId: string; productType: string };
    agent?: { id: string; agencyId?: string };
  }): PriceCalculationResult {
    const net = params.supplierNetPricePKR;
    const activeRules = this.rules.filter(r => r.isActive);

    // Priority 1
    const p1 = activeRules.find(r => r.priority === 1 && r.agencyId === params.agent?.agencyId && (r.productId === params.product.id || r.productId === params.product.supplierProductId));
    if (p1) return this.applyRule(p1, net, 'Priority 1: Agent + Product Override');

    // Priority 2
    const p2 = activeRules.find(r => r.priority === 2 && r.agencyId === params.agent?.agencyId);
    if (p2) return this.applyRule(p2, net, 'Priority 2: Agent Specific Margin');

    // Priority 5
    const fallback = activeRules.find(r => r.priority === 5) || this.rules[this.rules.length - 1];
    return this.applyRule(fallback, net, 'Priority 5: Global Default');
  }

  private applyRule(rule: PricingRule, net: number, desc: string): PriceCalculationResult {
    const markupAmount = rule.markupType === 'FIXED' ? rule.markupValue : Math.round((net * rule.markupValue) / 100);
    return {
      supplierNetPricePKR: net,
      calculatedSellingPricePKR: net + markupAmount,
      markupAmountPKR: markupAmount,
      markupTypeApplied: rule.markupType,
      markupValueApplied: rule.markupValue,
      appliedRuleId: rule.id,
      appliedRuleName: rule.name,
      priorityApplied: rule.priority,
      breakdown: `${desc} [${rule.name}]`,
    };
  }
}
