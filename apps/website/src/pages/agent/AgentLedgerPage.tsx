import React, { useState, useEffect } from 'react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { b2bStore } from '../../services/b2b/b2bStore';
import { LedgerTransaction, StatementOfAccount } from '../../types/b2b';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  FileSpreadsheet, 
  Search, 
  Building2, 
  Copy, 
  Check, 
  CreditCard
} from 'lucide-react';
import { StatementOfAccountModal } from '../../components/StatementOfAccountModal';

export const AgentLedgerPage: React.FC = () => {
  const { currentAgency } = useB2BAuth();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedIban, setCopiedIban] = useState(false);
  const [soaModalOpen, setSoaModalOpen] = useState(false);
  const [soaData, setSoaData] = useState<StatementOfAccount | null>(null);

  useEffect(() => {
    const update = () => {
      if (currentAgency?.id) {
        setTransactions(b2bStore.getAgencyLedger(currentAgency.id));
      }
    };
    update();
    return b2bStore.subscribe(update);
  }, [currentAgency?.id]);

  const handleGenerateSoa = () => {
    if (!currentAgency?.id) return;
    const soa = b2bStore.generateStatementOfAccount(currentAgency.id);
    setSoaData(soa);
    setSoaModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const walletBalance = currentAgency?.walletBalancePKR || 0;
  const creditLimit = currentAgency?.creditLimitPKR || 1500000;
  const availableCredit = creditLimit + walletBalance;
  const creditUsedPercent = Math.min(100, Math.max(0, Math.round(((creditLimit - walletBalance) / creditLimit) * 100)));

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'DEBITS' && t.type !== 'BOOKING_DEBIT') return false;
    if (filterType === 'CREDITS' && (t.type === 'BOOKING_DEBIT')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.reference.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.bookingId && t.bookingId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Wallet className="text-cyan-400" size={24} />
            Agency Wallet & Financial Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Track wholesale transactions, group booking debits, credit line utilization, and export official statements.
          </p>
        </div>

        <button
          onClick={handleGenerateSoa}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
        >
          <FileSpreadsheet size={16} />
          Generate Statement of Account (SOA)
        </button>
      </div>

      {/* Financial Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400">Prepaid Wallet Float</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wallet size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-cyan-400 tracking-tight">
              PKR {walletBalance.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">Available for instant 1-click group reservations</p>
          </div>
        </div>

        {/* Credit Line & Limit */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400">Wholesale Credit Line</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CreditCard size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              PKR {availableCredit.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>Approved Line: PKR {creditLimit.toLocaleString()}</span>
              <span>{100 - creditUsedPercent}% free</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 mt-2 overflow-hidden border border-slate-800">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(10, 100 - creditUsedPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Wire Transfer Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2.5 shadow-xl text-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-amber-400 flex items-center gap-1.5">
              <Building2 size={14} /> GNK Deposit Bank
            </span>
            <button
              onClick={() => copyToClipboard('PK36HABB0000427982018239')}
              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1"
            >
              {copiedIban ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedIban ? 'Copied' : 'Copy IBAN'}
            </button>
          </div>
          <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 space-y-1 text-slate-300">
            <p className="font-bold text-white">Habib Bank Limited (HBL)</p>
            <p className="text-slate-400 text-[11px]">Title: <strong>GNK Connect Travels (Pvt) Ltd</strong></p>
            <p className="font-mono text-amber-400 text-[11px]">A/C: 0042-798201823901</p>
            <p className="font-mono text-slate-400 text-[10px]">IBAN: PK36HABB0000427982018239</p>
          </div>
        </div>
      </div>

      {/* Filter & Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search reference, transaction #, or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: 'All Entries', value: 'ALL' },
              { label: 'Debits (Bookings)', value: 'DEBITS' },
              { label: 'Credits (Deposits)', value: 'CREDITS' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterType(tab.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === tab.value
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Tx ID & Ref</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Debit (PKR)</th>
                <th className="py-3 px-4 text-right">Credit (PKR)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No ledger transactions found matching filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
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

                      <td className="py-3.5 px-4 max-w-[240px]">
                        <p className="font-medium text-white">{t.description}</p>
                        {t.bookingId && (
                          <span className="text-[10px] font-mono text-cyan-400">
                            Booking: {t.bookingId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isDebit ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[10px] border border-rose-500/30">
                            <TrendingDown size={11} /> Booking Debit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                            <TrendingUp size={11} /> Deposit / Credit
                          </span>
                        )}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement of Account Modal */}
      <StatementOfAccountModal
        isOpen={soaModalOpen}
        onClose={() => setSoaModalOpen(false)}
        statement={soaData}
      />
    </div>
  );
};
