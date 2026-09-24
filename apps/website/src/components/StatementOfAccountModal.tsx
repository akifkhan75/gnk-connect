import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Building2, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';
import { StatementOfAccount } from '../types/b2b';

interface StatementOfAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  statement: StatementOfAccount | null;
}

export const StatementOfAccountModal: React.FC<StatementOfAccountModalProps> = ({
  isOpen,
  onClose,
  statement,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !statement) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Transaction ID', 'Date', 'Type', 'Reference', 'Description', 'Amount (PKR)', 'Balance After (PKR)'];
    const rows = statement.transactions.map(t => [
      t.id,
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
    link.setAttribute('download', `${statement.statementNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">B2B Statement of Account (SOA)</h3>
              <p className="text-[11px] text-slate-400 font-mono">{statement.statementNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <Download size={14} className="text-cyan-400" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            >
              <Printer size={14} /> Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable SOA Document Body */}
        <div ref={printableRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-200 print:bg-white print:text-black print:p-8">
          {/* Header Brand & Statement Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-800 print:border-black/20 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white print:text-black">GNK CONNECT TRAVELS</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 print:border print:border-amber-600 print:text-amber-700">
                  Wholesale B2B
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                AirDesk Direct Supplier Reseller & Group Consolidator
              </p>
              <p className="text-[11px] text-slate-500 print:text-gray-500 mt-0.5">
                NTN: 8940219-5 • DTS Tourism Reg: DTS-PAK-2026 • Karachi, Pakistan
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <h2 className="text-lg font-black text-amber-400 print:text-amber-700 uppercase tracking-wide">
                Statement of Account
              </h2>
              <div className="text-xs font-mono font-bold text-white print:text-black">
                {statement.statementNumber}
              </div>
              <div className="text-xs text-slate-400 print:text-gray-600 flex items-center sm:justify-end gap-1">
                <Calendar size={12} />
                <span>{statement.periodStart} to {statement.periodEnd}</span>
              </div>
              <div className="text-[10px] text-slate-500 print:text-gray-500">
                Generated: {new Date(statement.generatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Agency Billing Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 print:bg-gray-50 p-4 rounded-2xl border border-slate-800 print:border-gray-200">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-500">Billed Agency</span>
              <h4 className="text-sm font-black text-white print:text-black flex items-center gap-1.5">
                <Building2 size={14} className="text-cyan-400 print:text-blue-600" />
                {statement.agencyName}
              </h4>
              <p className="text-xs text-slate-400 print:text-gray-600">{statement.officeAddress}</p>
            </div>

            <div className="space-y-1 sm:text-right text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-500">Agency Credentials</span>
              <p className="text-slate-300 print:text-gray-700">
                NTN Number: <strong className="font-mono text-white print:text-black">{statement.agencyNtn}</strong>
              </p>
              <p className="text-slate-300 print:text-gray-700">
                DTS License: <strong className="font-mono text-white print:text-black">{statement.agencyDtsLicense}</strong>
              </p>
            </div>
          </div>

          {/* Financial Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 print:bg-gray-100 p-3.5 rounded-xl border border-slate-800 print:border-gray-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-500 block">Opening Balance</span>
              <span className="text-sm font-black text-slate-200 print:text-black mt-1 block">
                PKR {statement.openingBalancePKR.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-950 print:bg-gray-100 p-3.5 rounded-xl border border-slate-800 print:border-gray-200">
              <span className="text-[10px] uppercase font-bold text-emerald-400 print:text-emerald-700 flex items-center gap-1">
                <TrendingUp size={12} /> Total Credits
              </span>
              <span className="text-sm font-black text-emerald-400 print:text-emerald-700 mt-1 block">
                +PKR {statement.totalCreditsPKR.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-950 print:bg-gray-100 p-3.5 rounded-xl border border-slate-800 print:border-gray-200">
              <span className="text-[10px] uppercase font-bold text-rose-400 print:text-rose-700 flex items-center gap-1">
                <TrendingDown size={12} /> Total Debits
              </span>
              <span className="text-sm font-black text-rose-400 print:text-rose-700 mt-1 block">
                -PKR {statement.totalDebitsPKR.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-950 print:bg-gray-100 p-3.5 rounded-xl border border-cyan-500/40 print:border-blue-500">
              <span className="text-[10px] uppercase font-bold text-cyan-400 print:text-blue-700 block">Closing Balance</span>
              <span className="text-sm font-black text-cyan-400 print:text-blue-700 mt-1 block">
                PKR {statement.closingBalancePKR.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Itemized Transactions Table */}
          <div className="overflow-hidden border border-slate-800 print:border-gray-300 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 print:bg-gray-100 border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Tx ID & Ref</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Debit (PKR)</th>
                  <th className="py-2.5 px-3 text-right">Credit (PKR)</th>
                  <th className="py-2.5 px-3 text-right">Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-gray-200 text-slate-300 print:text-gray-800">
                {statement.transactions.map((t) => {
                  const isDebit = t.type === 'BOOKING_DEBIT';
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/20 print:hover:bg-transparent">
                      <td className="py-3 px-3 font-mono whitespace-nowrap text-[11px] text-slate-400 print:text-gray-600">
                        {t.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-white print:text-black block text-[11px]">{t.id}</span>
                        <span className="font-mono text-[10px] text-amber-400 print:text-amber-700">{t.reference}</span>
                      </td>
                      <td className="py-3 px-3 max-w-[220px]">
                        <span className="font-medium text-white print:text-black block">{t.description}</span>
                        {t.bookingId && (
                          <span className="font-mono text-[10px] text-cyan-400 print:text-blue-600">Booking: {t.bookingId}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-400 print:text-rose-700 whitespace-nowrap">
                        {isDebit ? `-${t.amountPKR.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 print:text-emerald-700 whitespace-nowrap">
                        {!isDebit ? `+${t.amountPKR.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-white print:text-black whitespace-nowrap">
                        PKR {t.balanceAfterPKR.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer & Authorized Signatures */}
          <div className="pt-6 border-t border-slate-800 print:border-black/20 flex flex-col sm:flex-row justify-between items-end gap-4 text-xs text-slate-500 print:text-gray-600">
            <div className="space-y-1">
              <p className="font-bold text-slate-400 print:text-gray-700 flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-400 print:text-emerald-600" />
                Officially Verified Wholesale Travel Statement
              </p>
              <p className="text-[11px]">
                For reconciliation inquiries, contact GNK Accounts: accounts@gnkconnect.pk • +92 21 34567890
              </p>
            </div>

            <div className="text-right space-y-2 print:block">
              <div className="w-40 border-b border-slate-700 print:border-black mx-auto sm:ml-auto"></div>
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block">
                Authorized GNK Finance Officer
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
