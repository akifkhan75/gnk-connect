import React, { useState, useEffect } from 'react';
import { b2bStore } from '../../services/b2b/b2bStore';
import { PaymentTransaction, B2BBooking } from '../../types/b2b';
import { 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Eye 
} from 'lucide-react';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [bookings, setBookings] = useState<B2BBooking[]>([]);

  // Document Viewer State
  const [activeDoc, setActiveDoc] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    category?: string;
    subtitle?: string;
  }>({
    isOpen: false,
    title: '',
    url: '',
  });

  useEffect(() => {
    const update = () => {
      setPayments(b2bStore.getPayments());
      setBookings(b2bStore.getBookings());
    };
    update();
    return b2bStore.subscribe(update);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Receipt className="text-amber-400" size={24} />
            Payment Receipts & Verification Queue
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Audit bank transfer reference numbers, verify deposit receipts, and reconcile wholesale accounts
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {payments.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No payment slips submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">GNK Booking</th>
                  <th className="py-3.5 px-4">Payment Method & Ref</th>
                  <th className="py-3.5 px-4">Amount (PKR)</th>
                  <th className="py-3.5 px-4">Receipt Proof</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {payments.map((p) => {
                  const booking = bookings.find(b => b.id === p.bookingId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-cyan-400">{p.id}</td>

                      <td className="py-4 px-4">
                        <strong className="text-white block font-mono">{p.bookingId}</strong>
                        <span className="text-[11px] text-slate-400">{booking?.agencyName || booking?.agentName}</span>
                      </td>

                      <td className="py-4 px-4 space-y-0.5">
                        <div className="font-bold text-white">{p.method.replace('_', ' ')}</div>
                        <div className="font-mono text-[11px] text-amber-400">{p.referenceNumber}</div>
                      </td>

                      <td className="py-4 px-4 font-black text-white text-sm">
                        PKR {p.amountPKR.toLocaleString()}
                      </td>

                      <td className="py-4 px-4">
                        {p.proofImageUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDoc({
                                isOpen: true,
                                title: `Bank Deposit Receipt - ${p.bookingId}`,
                                subtitle: `Tx ID: ${p.id} • Ref: ${p.referenceNumber} • PKR ${p.amountPKR.toLocaleString()}`,
                                url: p.proofImageUrl!,
                                category: 'PAYMENT_SLIP'
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-cyan-400 font-bold text-[11px] transition-all"
                          >
                            <Eye size={13} /> Inspect Receipt
                          </button>
                        ) : (
                          <span className="text-slate-500 italic">No file attached</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {p.status === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                            <CheckCircle2 size={11} /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                            <Clock size={11} /> Pending Audit
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Lightbox Receipt Viewer */}
      <DocumentViewerModal
        isOpen={activeDoc.isOpen}
        onClose={() => setActiveDoc(prev => ({ ...prev, isOpen: false }))}
        title={activeDoc.title}
        subtitle={activeDoc.subtitle}
        documentUrl={activeDoc.url}
        category={activeDoc.category}
      />
    </div>
  );
};

