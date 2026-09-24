import React, { useState, useEffect } from 'react';
import { b2bStore } from '../../services/b2b/b2bStore';
import { B2BBooking, B2BVoucherData } from '../../types/b2b';
import { 
  FileCheck2, 
  Search, 
  Send, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  Calendar, 
  X,
  Receipt,
  Printer
} from 'lucide-react';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import { B2BVoucherModal } from '../../components/B2BVoucherModal';

export const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<B2BBooking[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Details Modal
  const [selectedBooking, setSelectedBooking] = useState<B2BBooking | null>(null);

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

  // B2B Voucher Modal State
  const [activeVoucher, setActiveVoucher] = useState<B2BVoucherData | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setBookings(b2bStore.getBookings());
    };
    update();
    return b2bStore.subscribe(update);
  }, []);

  const handleOpenVoucher = (booking: B2BBooking) => {
    try {
      const voucherData = b2bStore.generateVoucherData(booking.id);
      setActiveVoucher(voucherData);
      setIsVoucherModalOpen(true);
    } catch (e: any) {
      alert(e.message || 'Unable to generate voucher data');
    }
  };

  const handleApproveAndPush = async (bookingId: string) => {
    setProcessingId(bookingId);
    setFeedbackMsg(null);
    try {
      const res = await b2bStore.approveAndPushToSupplier(bookingId, 'GNK Operations Admin');
      if (res.success) {
        setFeedbackMsg({ text: res.message, type: 'success' });
      } else {
        setFeedbackMsg({ text: res.message, type: 'error' });
      }
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || 'Error executing AirDesk dispatch', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (bookingId: string) => {
    const reason = prompt('Please provide reason for rejecting this booking request:');
    if (reason) {
      b2bStore.rejectBooking(bookingId, reason, 'GNK Admin');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter !== 'ALL' && b.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.id.toLowerCase().includes(q) ||
        (b.supplierBookingId && b.supplierBookingId.toLowerCase().includes(q)) ||
        b.agencyName?.toLowerCase().includes(q) ||
        b.agentName.toLowerCase().includes(q) ||
        b.productTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileCheck2 className="text-amber-400" size={24} />
            Booking Operations & AirDesk Dispatch
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Review wholesale requests, verify bank payment slips, and transmit confirmed bookings to AirDesk API
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search GNK ID, AirDesk ref, agency, or tour..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { label: 'All Bookings', value: 'ALL' },
            { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
            { label: 'AirDesk Confirmed', value: 'SUPPLIER_CONFIRMED' },
            { label: 'Supplier Failed', value: 'SUPPLIER_FAILED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === tab.value
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Identifiers</th>
                <th className="py-3.5 px-4">Agency / Agent</th>
                <th className="py-3.5 px-4">Tour & Departure</th>
                <th className="py-3.5 px-4">Financials (Net / Markup / Total)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {filteredBookings.map((b) => {
                const isPending = b.status === 'PENDING_APPROVAL';
                const isProcessing = processingId === b.id;

                return (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Dual IDs */}
                    <td className="py-4 px-4 space-y-1">
                      <div className="font-mono font-black text-cyan-400 text-sm">{b.id}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Supplier Ref:{' '}
                        {b.supplierBookingId ? (
                          <span className="text-emerald-400 font-bold">{b.supplierBookingId}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </td>

                    {/* Agency & Agent */}
                    <td className="py-4 px-4 space-y-0.5">
                      <div className="font-bold text-white">{b.agencyName || 'Independent Agent'}</div>
                      <div className="text-[11px] text-slate-400">{b.agentName} ({b.agentPhone})</div>
                    </td>

                    {/* Tour & Seats */}
                    <td className="py-4 px-4 space-y-0.5">
                      <div className="font-bold text-white max-w-[200px] truncate">{b.productTitle}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar size={12} className="text-cyan-400" /> {b.departureDate} ({b.totalSeats} Pax)
                      </div>
                    </td>

                    {/* Financial Breakdown */}
                    <td className="py-4 px-4 space-y-0.5">
                      <div className="font-bold text-white">PKR {b.totalAgentSellingPricePKR.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">
                        Net: {b.totalSupplierNetPKR.toLocaleString()} • Margin:{' '}
                        <strong className="text-amber-400">+{b.totalMarkupPKR.toLocaleString()}</strong>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {b.status === 'SUPPLIER_CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                          <CheckCircle2 size={12} /> AirDesk Confirmed
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                          <Clock size={12} /> Review Payment
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold">
                          {b.status}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isPending && (
                          <button
                            onClick={() => handleApproveAndPush(b.id)}
                            disabled={isProcessing}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all shadow-sm"
                          >
                            <Send size={12} /> {isProcessing ? 'Pushing...' : 'Approve & Push'}
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedBooking(b)}
                          title="Inspect Booking Details"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                        >
                          <Eye size={14} />
                        </button>

                        {b.status === 'SUPPLIER_CONFIRMED' && (
                          <button
                            onClick={() => handleOpenVoucher(b)}
                            title="Inspect Generated B2B E-Voucher"
                            className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg transition-colors"
                          >
                            <Printer size={14} />
                          </button>
                        )}

                        {isPending && (
                          <button
                            onClick={() => handleReject(b.id)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs uppercase font-extrabold text-amber-400">Booking Inspection</span>
                <h3 className="text-xl font-black text-white font-mono">{selectedBooking.id}</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Financial Ledger Audit */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                Pricing & Margin Audit Trail
              </h4>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block">AirDesk Net Cost:</span>
                  <strong className="text-white">PKR {selectedBooking.totalSupplierNetPKR.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Retained Markup:</span>
                  <strong className="text-amber-400">+PKR {selectedBooking.totalMarkupPKR.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Agent Invoice Total:</span>
                  <strong className="text-emerald-400">PKR {selectedBooking.totalAgentSellingPricePKR.toLocaleString()}</strong>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Pricing Rule Applied: <strong>{selectedBooking.pricingRuleSnapshot.ruleName}</strong> ({selectedBooking.pricingRuleSnapshot.markupValue}{selectedBooking.pricingRuleSnapshot.markupType === 'PERCENTAGE' ? '%' : ' PKR'})
              </p>
            </div>

            {/* Payment & Deposit Slip Audit */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Receipt size={14} className="text-cyan-400" />
                  Payment Method: {selectedBooking.paymentMethod.replace('_', ' ')}
                </span>
                {selectedBooking.paymentReferenceNumber && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    Ref #: <span className="text-amber-400">{selectedBooking.paymentReferenceNumber}</span>
                  </p>
                )}
              </div>

              {selectedBooking.paymentProofUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDoc({
                      isOpen: true,
                      title: `Deposit Slip - Booking ${selectedBooking.id}`,
                      subtitle: `${selectedBooking.agencyName || selectedBooking.agentName} • Amount: PKR ${selectedBooking.totalAgentSellingPricePKR.toLocaleString()}`,
                      url: selectedBooking.paymentProofUrl!,
                      category: 'PAYMENT_SLIP'
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Eye size={13} /> Inspect Attached Slip
                </button>
              ) : (
                <span className="text-slate-500 italic text-[11px]">No deposit slip attached</span>
              )}
            </div>

            {/* Passenger Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Passenger Details</h4>
              <div className="space-y-2 text-xs">
                {selectedBooking.passengers.map((p, idx) => (
                  <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
                    <div>
                      <span className="text-slate-500 font-mono mr-2">#{idx + 1}</span>
                      <strong className="text-white">{p.title} {p.firstName} {p.lastName}</strong>
                      <span className="text-slate-400 ml-2">({p.passengerType})</span>
                    </div>
                    <span className="font-mono text-cyan-400">{p.passportNumber}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action inside modal */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              {selectedBooking.status === 'SUPPLIER_CONFIRMED' && (
                <button
                  type="button"
                  onClick={() => handleOpenVoucher(selectedBooking)}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Printer size={14} /> Open B2B E-Voucher
                </button>
              )}

              {selectedBooking.status === 'PENDING_APPROVAL' && (
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      handleApproveAndPush(selectedBooking.id);
                      setSelectedBooking(null);
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Send size={14} /> Verify Payment & Push to AirDesk API
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Lightbox Document & Receipt Viewer */}
      <DocumentViewerModal
        isOpen={activeDoc.isOpen}
        onClose={() => setActiveDoc(prev => ({ ...prev, isOpen: false }))}
        title={activeDoc.title}
        subtitle={activeDoc.subtitle}
        documentUrl={activeDoc.url}
        category={activeDoc.category}
      />

      {/* Official B2B E-Voucher Modal with QR Code */}
      <B2BVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        voucher={activeVoucher}
      />
    </div>
  );
};
