import React, { useState, useEffect } from 'react';
import { b2bStore } from '../../services/b2b/b2bStore';
import { Agency, LedgerTransaction, StatementOfAccount, AdminFinancialSummary } from '../../types/b2b';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  PlusCircle, 
  Search, 
  Download, 
  FileSpreadsheet, 
  X 
} from 'lucide-react';
import { StatementOfAccountModal } from '../../components/StatementOfAccountModal';

export const AdminLedgerPage: React.FC = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [financialSummary, setFinancialSummary] = useState<AdminFinancialSummary | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Topup Modal State
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupAgencyId, setTopupAgencyId] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupRef, setTopupRef] = useState('');
  const [topupNotes, setTopupNotes] = useState('');
  const [topupSuccess, setTopupSuccess] = useState(false);

  // Credit Limit Modal State
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditAgencyId, setCreditAgencyId] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  // Statement of Account Modal State
  const [soaModalOpen, setSoaModalOpen] = useState(false);
  const [soaData, setSoaData] = useState<StatementOfAccount | null>(null);

  useEffect(() => {
    const update = () => {
      setAgencies(b2bStore.getAgencies());
      setFinancialSummary(b2bStore.getAdminFinancialSummary());
    };
    update();
    return b2bStore.subscribe(update);
  }, []);

  // Collect all transactions
  const allTransactions: (LedgerTransaction & { agencyName?: string })[] = [];
  agencies.forEach((a) => {
    const txns = b2bStore.getAgencyLedger(a.id);
    txns.forEach((t) => {
      allTransactions.push({
        ...t,
        agencyName: a.name,
      });
    });
  });

  allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleTopupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAgencyId || !topupAmount) return;

    b2bStore.topUpAgencyWallet(
      topupAgencyId,
      Number(topupAmount),
      topupRef || `DEP-ADM-${Date.now().toString().slice(-6)}`,
      topupNotes || 'Admin Verified Wholesale Bank Transfer'
    );

    setTopupSuccess(true);
    setTimeout(() => {
      setTopupSuccess(false);
      setTopupModalOpen(false);
      setTopupAmount('');
      setTopupRef('');
      setTopupNotes('');
    }, 1200);
  };

  const handleCreditLimitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditAgencyId || !newCreditLimit) return;

    b2bStore.updateAgencyCreditLimit(creditAgencyId, Number(newCreditLimit));
    setCreditModalOpen(false);
    setNewCreditLimit('');
  };

  const handleViewAgencySoa = (agencyId: string) => {
    const soa = b2bStore.generateStatementOfAccount(agencyId);
    setSoaData(soa);
    setSoaModalOpen(true);
  };

  const handleExportMasterCsv = () => {
    const headers = ['Tx ID', 'Agency', 'Date', 'Type', 'Reference', 'Description', 'Amount (PKR)', 'Running Balance (PKR)'];
    const rows = allTransactions.map(t => [
      t.id,
      `"${t.agencyName || t.agencyId}"`,
      t.createdAt.slice(0, 10),
      t.type,
      `"${t.reference}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type === 'BOOKING_DEBIT' ? `-${t.amountPKR}` : `+${t.amountPKR}`,
      t.balanceAfterPKR
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GNK_Master_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = allTransactions.filter((t) => {
    if (selectedAgencyId !== 'ALL' && t.agencyId !== selectedAgencyId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.agencyName && t.agencyName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <DollarSign className="text-amber-400" size={24} />
            Financial Ledger & Margin Reconciliation
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Audit wholesale payments, calculate AirDesk cost vs GNK markup margin, and manage agency credit lines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportMasterCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
          >
            <Download size={14} className="text-cyan-400" /> Export Master CSV
          </button>
          <button
            onClick={() => {
              if (agencies.length > 0) setTopupAgencyId(agencies[0].id);
              setTopupModalOpen(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <PlusCircle size={15} /> Top-Up Agency Float
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <span className="text-slate-400 text-xs uppercase font-bold">Gross Wholesale Sales</span>
          <div className="text-2xl font-black text-white">
            PKR {(financialSummary?.grossBookingsVolumePKR || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-cyan-400 flex items-center gap-1">
            <TrendingUp size={12} /> Total invoiced booking value
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <span className="text-slate-400 text-xs uppercase font-bold">AirDesk Supplier Cost</span>
          <div className="text-2xl font-black text-slate-300">
            PKR {(financialSummary?.totalSupplierCostPKR || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">
            Net supplier fulfillment cost
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <span className="text-slate-400 text-xs uppercase font-bold">GNK Retained Gross Margin</span>
          <div className="text-2xl font-black text-amber-400">
            +PKR {(financialSummary?.retainedGnkMarginPKR || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-400 font-bold">
            Target margin retained
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <span className="text-slate-400 text-xs uppercase font-bold">Active Agency Floats</span>
          <div className="text-2xl font-black text-cyan-400">
            PKR {(financialSummary?.totalAgencyWalletDepositsPKR || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-purple-400">
            Prepaid wholesale wallet balances
          </span>
        </div>
      </div>

      {/* Agency Credit Line Manager Carousel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <CreditCard size={16} className="text-purple-400" />
            Partner Agencies Credit Lines & Wallets
          </h3>
          <span className="text-xs text-slate-400">{agencies.length} Registered Agencies</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map((agency) => {
            return (
              <div
                key={agency.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-xs">{agency.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {agency.approvalStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{agency.city}, Pakistan</p>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prepaid Wallet:</span>
                    <strong className="text-cyan-400">PKR {(agency.walletBalancePKR || 0).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Credit Limit:</span>
                    <strong className="text-purple-400">PKR {(agency.creditLimitPKR || 0).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => handleViewAgencySoa(agency.id)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <FileSpreadsheet size={12} /> View SOA
                  </button>
                  <button
                    onClick={() => {
                      setCreditAgencyId(agency.id);
                      setNewCreditLimit((agency.creditLimitPKR || 1500000).toString());
                      setCreditModalOpen(true);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold transition-all"
                  >
                    Adjust Credit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Master Transactions Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter by ref, agency name, or Tx ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedAgencyId}
              onChange={(e) => setSelectedAgencyId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="ALL">All Partner Agencies</option>
              {agencies.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Tx ID & Ref</th>
                <th className="py-3 px-4">Agency</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Debit (PKR)</th>
                <th className="py-3 px-4 text-right">Credit (PKR)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {filteredTransactions.map((t) => {
                const isDebit = t.type === 'BOOKING_DEBIT';
                return (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {t.createdAt.slice(0, 10)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-white block">{t.id}</span>
                      <span className="font-mono text-[11px] text-amber-400">{t.reference}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white">{t.agencyName || 'Agency'}</span>
                    </td>

                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="font-medium text-white">{t.description}</p>
                      {t.bookingId && (
                        <span className="text-[10px] font-mono text-cyan-400">
                          Booking: {t.bookingId}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold text-slate-300">
                        {t.type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                      {isDebit ? `-${t.amountPKR.toLocaleString()}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {!isDebit ? `+${t.amountPKR.toLocaleString()}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black text-cyan-400 whitespace-nowrap">
                      PKR {t.balanceAfterPKR.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Topup Modal */}
      {topupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Wallet size={18} className="text-emerald-400" />
                Credit Agency Wallet Float
              </h3>
              <button
                onClick={() => setTopupModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTopupSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Select Partner Agency</label>
                <select
                  value={topupAgencyId}
                  onChange={(e) => setTopupAgencyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                >
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Deposit Amount (PKR)</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Bank Ref / Deposit Slip #</label>
                <input
                  type="text"
                  placeholder="e.g. HBL-DEP-84920"
                  value={topupRef}
                  onChange={(e) => setTopupRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Ledger Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Advance wire transfer for Oct group blocks"
                  value={topupNotes}
                  onChange={(e) => setTopupNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all mt-2 shadow-lg shadow-emerald-500/20"
              >
                {topupSuccess ? 'Wallet Successfully Credited!' : 'Confirm Float Deposit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Credit Limit Modal */}
      {creditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CreditCard size={18} className="text-purple-400" />
                Adjust Agency Credit Line
              </h3>
              <button
                onClick={() => setCreditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreditLimitSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">New Approved Credit Limit (PKR)</label>
                <input
                  type="number"
                  placeholder="e.g. 2500000"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl text-xs transition-all mt-2 shadow-lg shadow-purple-500/20"
              >
                Update Credit Limit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Statement of Account Modal */}
      <StatementOfAccountModal
        isOpen={soaModalOpen}
        onClose={() => setSoaModalOpen(false)}
        statement={soaData}
      />
    </div>
  );
};
