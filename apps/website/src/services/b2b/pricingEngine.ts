import { 
  PricingRule, 
  PriceCalculationResult 
} from '../../types/b2b';

export const DEFAULT_PRICING_RULES: PricingRule[] = [
  // 1. Agent + Product Override (Priority 1)
  {
    id: 'rule-agent-prod-01',
    name: 'ABC Travels Dubai Group VIP Override',
    description: 'Special fixed markup for ABC Travels on Dubai departures',
    priority: 1,
    supplierId: 'airdesk',
    productId: 'AD-DXB-7D-EXP',
    agencyId: 'agency-abc-travels',
    markupType: 'FIXED',
    markupValue: 12000,
    currency: 'PKR',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  // 2. Specific Agent / Agency Rule (Priority 2)
  {
    id: 'rule-agent-02',
    name: 'ABC Travels Preferred Partner Margin (5%)',
    description: 'Standard 5% markup across all products for ABC Travels',
    priority: 2,
    agencyId: 'agency-abc-travels',
    markupType: 'PERCENTAGE',
    markupValue: 5,
    currency: 'PKR',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'rule-agent-03',
    name: 'Al-Haram Tours Fixed Commission',
    description: 'PKR 7,500 markup for Al-Haram Tours',
    priority: 2,
    agencyId: 'agency-al-haram',
    markupType: 'FIXED',
    markupValue: 7500,
    currency: 'PKR',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  // 3. Product / Group Level Markup (Priority 3)
  {
    id: 'rule-prod-04',
    name: 'Dubai Group Standard Markup',
    description: 'PKR 10,000 standard markup on Dubai group products',
    priority: 3,
    productId: 'AD-DXB-7D-EXP',
    markupType: 'FIXED',
    markupValue: 10000,
    currency: 'PKR',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'rule-prod-05',
    name: 'Umrah Group Standard Markup',
    description: 'PKR 15,000 standard markup on Umrah groups',
    priority: 3,
    productId: 'AD-KSA-15D-UMRAH',
    markupType: 'FIXED',
    markupValue: 15000,
    currency: 'PKR',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  // 4. Supplier Specific Rule (Priority 4)
  {
    id: 'rule-sup-06',
    name: 'AirDesk Groups Default Margin (6%)',
    description: '6% standard margin on all AirDesk group inventory',
    priority: 4,
    supplierId: 'airdesk',
    markupType: 'PERCENTAGE',
    markupValue: 6,
    currency: 'PKR',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  // 5. Global GNK Fallback (Priority 5)
  {
    id: 'rule-default-07',
    name: 'GNK Connect Global Default Markup',
    description: 'PKR 10,000 fallback markup across all inventory',
    priority: 5,
    markupType: 'FIXED',
    markupValue: 10000,
    currency: 'PKR',
    isActive: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  }
];

export class PricingEngine {
  private rules: PricingRule[] = [];

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('gnk_pricing_rules');
      if (stored) {
        try {
          this.rules = JSON.parse(stored);
        } catch (e) {
          this.rules = [...DEFAULT_PRICING_RULES];
        }
      } else {
        this.rules = [...DEFAULT_PRICING_RULES];
        this.persist();
      }
    } else {
      this.rules = [...DEFAULT_PRICING_RULES];
    }
  }

  private persist() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('gnk_pricing_rules', JSON.stringify(this.rules));
      } catch (e) {
        console.warn('Failed to persist pricing rules', e);
      }
    }
  }

  public getRules(): PricingRule[] {
    return [...this.rules].sort((a, b) => a.priority - b.priority);
  }

  public saveRule(rule: PricingRule): void {
    const index = this.rules.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      this.rules[index] = { ...rule, updatedAt: new Date().toISOString() };
    } else {
      this.rules.push({ ...rule, updatedAt: new Date().toISOString() });
    }
    this.persist();
  }

  public deleteRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.persist();
  }

  public resetToDefaults(): void {
    this.rules = [...DEFAULT_PRICING_RULES];
    this.persist();
  }

  /**
   * Main calculation engine implementing strict precedence hierarchy:
   * Priority 1: Agent/Agency + Specific Product Override
   * Priority 2: Specific Agent/Agency Rule
   * Priority 3: Specific Product / Group Rule
   * Priority 4: Supplier Rule (e.g. AirDesk)
   * Priority 5: Default GNK Rule
   */
  public calculatePrice(params: {
    supplierNetPricePKR: number;
    supplierId: string;
    product: { id: string; supplierProductId: string; productType: string };
    agent?: { id: string; agencyId?: string };
  }): PriceCalculationResult {
    const net = params.supplierNetPricePKR;
    const activeRules = this.rules.filter(r => r.isActive);

    // 1. Check Priority 1: Agent/Agency + Product Match
    const p1Rule = activeRules.find(r => {
      if (r.priority !== 1) return false;
      const agentMatch = (r.agentId && r.agentId === params.agent?.id) || 
                         (r.agencyId && r.agencyId === params.agent?.agencyId);
      const productMatch = (r.productId && (r.productId === params.product.id || r.productId === params.product.supplierProductId));
      return agentMatch && productMatch;
    });

    if (p1Rule) {
      return this.applyRule(p1Rule, net, 'Priority 1: Specific Agent + Product Override');
    }

    // 2. Check Priority 2: Specific Agent / Agency Rule
    const p2Rule = activeRules.find(r => {
      if (r.priority !== 2) return false;
      return (r.agentId && r.agentId === params.agent?.id) || 
             (r.agencyId && r.agencyId === params.agent?.agencyId);
    });

    if (p2Rule) {
      return this.applyRule(p2Rule, net, 'Priority 2: Specific Agent / Agency Rule');
    }

    // 3. Check Priority 3: Specific Product / Group Rule
    const p3Rule = activeRules.find(r => {
      if (r.priority !== 3) return false;
      return (r.productId && (r.productId === params.product.id || r.productId === params.product.supplierProductId));
    });

    if (p3Rule) {
      return this.applyRule(p3Rule, net, 'Priority 3: Product / Group Rule');
    }

    // 4. Check Priority 4: Supplier Rule (e.g. AirDesk)
    const p4Rule = activeRules.find(r => {
      if (r.priority !== 4) return false;
      return r.supplierId && r.supplierId.toLowerCase() === params.supplierId.toLowerCase();
    });

    if (p4Rule) {
      return this.applyRule(p4Rule, net, 'Priority 4: Supplier Level Rule');
    }

    // 5. Fallback to Priority 5: Global Default
    const defaultRule = activeRules.find(r => r.priority === 5) || {
      id: 'fallback-hardcoded',
      name: 'Fallback Hardcoded Default (+PKR 10,000)',
      priority: 5 as const,
      markupType: 'FIXED' as const,
      markupValue: 10000,
      currency: 'PKR' as const,
      isActive: true,
      createdAt: '',
      updatedAt: ''
    };

    return this.applyRule(defaultRule, net, 'Priority 5: GNK Default Global Rule');
  }

  private applyRule(rule: PricingRule, netPricePKR: number, priorityDesc: string): PriceCalculationResult {
    let markupAmountPKR = 0;
    let breakdown = '';

    if (rule.markupType === 'FIXED') {
      markupAmountPKR = rule.markupValue;
      breakdown = `Supplier Net PKR ${netPricePKR.toLocaleString()} + Fixed Markup PKR ${rule.markupValue.toLocaleString()}`;
    } else {
      markupAmountPKR = Math.round((netPricePKR * rule.markupValue) / 100);
      breakdown = `Supplier Net PKR ${netPricePKR.toLocaleString()} + ${rule.markupValue}% (PKR ${markupAmountPKR.toLocaleString()})`;
    }

    const calculatedSellingPricePKR = netPricePKR + markupAmountPKR;

    return {
      supplierNetPricePKR: netPricePKR,
      calculatedSellingPricePKR,
      markupAmountPKR,
      markupTypeApplied: rule.markupType,
      markupValueApplied: rule.markupValue,
      appliedRuleId: rule.id,
      appliedRuleName: rule.name,
      priorityApplied: rule.priority,
      breakdown: `${priorityDesc} — [${rule.name}]: ${breakdown}`
    };
  }
}

export const pricingEngine = new PricingEngine();
