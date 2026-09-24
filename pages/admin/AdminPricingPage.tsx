import React, { useState, useEffect } from 'react';
import { pricingEngine } from '../../services/b2b/pricingEngine';
import { b2bStore } from '../../services/b2b/b2bStore';
import { airDeskAdapter } from '../../services/b2b/airdeskAdapter';
import { PricingRule, RulePriority, MarkupType, StandardGroupProduct, AgentUser, Agency } from '../../types/b2b';
import { 
  Percent, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Calculator, 
  Info, 
  X 
} from 'lucide-react';

export const AdminPricingPage: React.FC = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [products, setProducts] = useState<StandardGroupProduct[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [priority, setPriority] = useState<RulePriority>(2);
  const [markupType, setMarkupType] = useState<MarkupType>('PERCENTAGE');
  const [markupValue, setMarkupValue] = useState<number>(5);
  const [targetAgencyId, setTargetAgencyId] = useState('');
  const [targetProductId, setTargetProductId] = useState('');

  // Simulator State
  const [simAgentId, setSimAgentId] = useState('');
  const [simProductId, setSimProductId] = useState('');
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    const loadAll = async () => {
      setRules(pricingEngine.getRules());
      setAgents(b2bStore.getUsers().filter(u => u.role !== 'GNK_ADMIN'));
      setAgencies(b2bStore.getAgencies());
      const prodList = await airDeskAdapter.getProducts();
      setProducts(prodList);
      if (prodList.length > 0) {
        setSimProductId(prodList[0].supplierProductId);
      }
      const initialUsers = b2bStore.getUsers();
      if (initialUsers.length > 0) {
        setSimAgentId(initialUsers[0].id);
      }
    };
    loadAll();
  }, []);

  // Recalculate simulation whenever simulator inputs or rules change
  useEffect(() => {
    if (!simProductId || products.length === 0) return;
    const selectedProd = products.find(p => p.supplierProductId === simProductId || p.id === simProductId);
    if (!selectedProd || selectedProd.departures.length === 0) return;

    const selectedAgent = agents.find(a => a.id === simAgentId);
    const departure = selectedProd.departures[0];

    const result = pricingEngine.calculatePrice({
      supplierNetPricePKR: departure.supplierNetPricePKR,
      supplierId: selectedProd.supplierId,
      product: { id: selectedProd.id, supplierProductId: selectedProd.supplierProductId, productType: selectedProd.productType },
      agent: selectedAgent ? { id: selectedAgent.id, agencyId: selectedAgent.agencyId } : undefined
    });

    setSimResult({
      result,
      departure,
      selectedProd,
      selectedAgent
    });
  }, [simAgentId, simProductId, products, agents, rules]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: PricingRule = {
      id: `rule-${Date.now()}`,
      name: ruleName,
      priority,
      markupType,
      markupValue: Number(markupValue),
      agencyId: targetAgencyId || undefined,
      productId: targetProductId || undefined,
      supplierId: priority === 4 ? 'airdesk' : undefined,
      currency: 'PKR',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    pricingEngine.saveRule(newRule);
    setRules(pricingEngine.getRules());
    setIsModalOpen(false);
    setRuleName('');
  };

  const handleDeleteRule = (ruleId: string) => {
    pricingEngine.deleteRule(ruleId);
    setRules(pricingEngine.getRules());
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all pricing rules to original GNK default hierarchy?')) {
      pricingEngine.resetToDefaults();
      setRules(pricingEngine.getRules());
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Percent className="text-amber-400" size={24} />
            Hierarchical Pricing & Markup Rules Engine
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Strict precedence calculation ensures complete margin governance before quotes reach B2B partner portals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Plus size={15} /> Add Pricing Rule
          </button>
        </div>
      </div>

      {/* Interactive Margin Simulator Box */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Calculator size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Live Margin & Precedence Simulator</h3>
              <p className="text-xs text-slate-400">Test how pricing rules resolve across any partner and AirDesk group departure</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Select Partner Agent</label>
            <select
              value={simAgentId}
              onChange={(e) => setSimAgentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
            >
              {agents.map((a) => {
                const agency = agencies.find(ag => ag.id === a.agencyId);
                return (
                  <option key={a.id} value={a.id}>
                    {agency ? `${agency.name} (${a.fullName})` : `${a.fullName} (Independent)`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Select Group Product</label>
            <select
              value={simProductId}
              onChange={(e) => setSimProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.supplierProductId}>
                  {p.title} ({p.supplierProductId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Calculation Output Card */}
        {simResult && (
          <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">AirDesk Supplier Net:</span>
              <div className="text-base font-black text-slate-200 mt-0.5">
                PKR {simResult.departure?.supplierNetPricePKR.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Wholesale cost</span>
            </div>

            <div>
              <span className="text-slate-400 block">GNK Markup Retained:</span>
              <div className="text-base font-black text-amber-400 mt-0.5">
                +PKR {simResult.result.markupAmountPKR.toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-400/80 font-bold">
                {simResult.result.markupTypeApplied === 'PERCENTAGE'
                  ? `${simResult.result.markupValueApplied}% margin`
                  : 'Fixed margin'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Agent Portal Selling Price:</span>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                PKR {simResult.result.calculatedSellingPricePKR.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-400/80 font-bold">Per Pax</span>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
              <span className="text-slate-400 block font-bold">Precedence Applied:</span>
              <div className="text-white font-semibold text-[11px] mt-0.5">
                {simResult.result.appliedRuleName}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Priority Rank #{simResult.result.priorityApplied}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hierarchical Precedence Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
        <h4 className="font-bold text-white flex items-center gap-1.5">
          <Info size={14} className="text-amber-400" /> Precedence Calculation Pipeline
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 font-bold">
            1. Agent + Product Override
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            2. Specific Agent Rule
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            3. Product Specific Rule
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            4. Supplier Level Rule
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
            5. GNK Global Default
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-white text-base">Active Pricing Rules</h3>
          <span className="text-xs text-slate-400 font-mono">{rules.length} rules loaded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Rule Name</th>
                <th className="py-3.5 px-4">Markup Value</th>
                <th className="py-3.5 px-4">Target Scope</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {rules.map((rule) => {
                const agency = rule.agencyId ? agencies.find(a => a.id === rule.agencyId) : null;
                const product = rule.productId ? products.find(p => p.supplierProductId === rule.productId || p.id === rule.productId) : null;

                return (
                  <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                        rule.priority === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : rule.priority === 2
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : rule.priority === 3
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        Priority #{rule.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <strong className="text-white block">{rule.name}</strong>
                      <span className="text-[11px] text-slate-400">{rule.description || 'Custom markup rule'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {rule.markupType === 'FIXED' ? `+PKR ${rule.markupValue.toLocaleString()}` : `+${rule.markupValue}%`}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {agency && <span className="block text-white">Agency: <strong>{agency.name}</strong></span>}
                      {product && <span className="block text-slate-300">Tour: <strong>{product.title}</strong></span>}
                      {rule.supplierId && <span className="block text-slate-300">Supplier: <strong>{rule.supplierId}</strong></span>}
                      {!agency && !product && !rule.supplierId && <span className="text-slate-500 italic">Global Fallback</span>}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {rule.priority !== 5 && (
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Pricing Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateRule} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white">Create New Pricing Rule</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-300">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Al-Haram Dubai Special Override"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                >
                  <option value={1}>Priority 1 (Agent + Product Override)</option>
                  <option value={2}>Priority 2 (Specific Agent Rule)</option>
                  <option value={3}>Priority 3 (Product Specific Rule)</option>
                  <option value={4}>Priority 4 (Supplier Level)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Markup Type</label>
                <select
                  value={markupType}
                  onChange={(e) => setMarkupType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed PKR Amount</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-300">
                Markup Value ({markupType === 'FIXED' ? 'PKR' : '%'})
              </label>
              <input
                type="number"
                value={markupValue}
                onChange={(e) => setMarkupValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none font-mono"
                required
              />
            </div>

            {(priority === 1 || priority === 2) && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Target Agency / Partner</label>
                <select
                  value={targetAgencyId}
                  onChange={(e) => setTargetAgencyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                >
                  <option value="">Select Agency...</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(priority === 1 || priority === 3) && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Target Product</label>
                <select
                  value={targetProductId}
                  onChange={(e) => setTargetProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                >
                  <option value="">Select Product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.supplierProductId}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-md mt-2"
            >
              Save Rule to Engine
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
