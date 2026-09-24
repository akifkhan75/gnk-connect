import React, { useState, useEffect } from 'react';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { b2bStore } from '../../services/b2b/b2bStore';
import { B2BBooking, B2BVoucherData } from '../../types/b2b';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  Upload, 
  Eye, 
  Calendar, 
  X, 
  Printer 
} from 'lucide-react';
import { B2BVoucherModal } from '../../components/B2BVoucherModal';

export const AgentBookingsPage: React.FC = () => {
  const { currentUser } = useB2BAuth();
  const [bookings, setBookings] = useState<B2BBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<B2BBooking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<B2BBooking | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<B2BBooking | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [activeVoucher, setActiveVoucher] = useState<B2BVoucherData | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      if (currentUser) {
        const list = b2bStore.getBookings(currentUser.id);
        setBookings(list);
      }
    };
    update();
    return b2bStore.subscribe(update);
  }, [currentUser]);

  useEffect(() => {
    let list = [...bookings];
    if (statusFilter !== 'ALL') {
      list = list.filter(b => b.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => 
        b.id.toLowerCase().includes(q) ||
        (b.supplierBookingId && b.supplierBookingId.toLowerCase().includes(q)) ||
        b.productTitle.toLowerCase().includes(q) ||
        b.passengers.some(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))
      );
    }
    setFilteredBookings(list);
  }, [statusFilter, searchQuery, bookings]);

  const handleOpenVoucher = (booking: B2BBooking) => {
    try {
      const voucherData = b2bStore.generateVoucherData(booking.id);
      setActiveVoucher(voucherData);
      setIsVoucherModalOpen(true);
    } catch (e: any) {
      alert(e.message || 'Unable to generate voucher data');
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForPayment) return;
    b2bStore.submitPaymentProof(selectedBookingForPayment.id, {
      referenceNumber: paymentRefInput || 'MANUAL-RECEIPT',
      proofUrl: paymentSlipUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop'
    });
    setSelectedBookingForPayment(null);
    setPaymentRefInput('');
    setPaymentSlipUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="text-cyan-400" size={24} />
            My Bookings & Invoices
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitor real-time status synchronization, supplier references, passenger rosters, and payment receipts
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by GNK ID, AirDesk ref, or pax name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'All Bookings', value: 'ALL' },
            { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
            { label: 'AirDesk Confirmed', value: 'SUPPLIER_CONFIRMED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
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
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText size={36} className="mx-auto text-slate-600 mb-2" />
            <p className="font-bold text-slate-300">No bookings found</p>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Try adjusting your search criteria' : 'Book a group departure to see it here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Tour Details</th>
                  <th className="py-3.5 px-4">Departure & Pax</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Booking Reference Dual IDs */}
                    <td className="py-4 px-4 space-y-1">
                      <div className="font-mono font-black text-cyan-400 text-sm">{b.id}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        AirDesk Ref:{' '}
                        {b.supplierBookingId ? (
                          <span className="text-emerald-400 font-bold">{b.supplierBookingId}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </td>

                    {/* Product */}
                    <td className="py-4 px-4 space-y-0.5">
                      <div className="font-bold text-white max-w-[200px] truncate">{b.productTitle}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">{b.supplierProductId}</div>
                    </td>

                    {/* Departure */}
                    <td className="py-4 px-4 space-y-0.5">
                      <div className="text-slate-200 flex items-center gap-1 font-bold">
                        <Calendar size={12} className="text-cyan-400" /> {b.departureDate}
                      </div>
                      <div className="text-[11px] text-slate-400 max-w-[140px] truncate">
                        Lead: {b.passengers[0]?.firstName} {b.passengers[0]?.lastName} ({b.totalSeats} Pax)
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4">
                      <div className="font-black text-white text-sm">
                        PKR {b.totalAgentSellingPricePKR.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        PKR {b.sellingPricePerSeatPKR.toLocaleString()} / seat
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {b.status === 'SUPPLIER_CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                          <CheckCircle2 size={12} /> AirDesk Confirmed
                        </span>
                      ) : b.status === 'PENDING_APPROVAL' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                          <Clock size={12} /> Pending Approval
                        </span>
                      ) : b.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30">
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold">
                          {b.status}
                        </span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="py-4 px-4">
                      {b.paymentStatus === 'PAYMENT_VERIFIED' ? (
                        <span className="text-emerald-400 font-bold text-[11px] block">✓ Verified</span>
                      ) : b.paymentStatus === 'PAYMENT_SUBMITTED' ? (
                        <span className="text-amber-400 font-semibold text-[11px] block">⏳ Slip Submitted</span>
                      ) : (
                        <button
                          onClick={() => setSelectedBookingForPayment(b)}
                          className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold underline flex items-center gap-1"
                        >
                          <Upload size={11} /> Upload Slip
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedBookingForDetails(b)}
                          title="View Details"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>

                        {b.status === 'SUPPLIER_CONFIRMED' ? (
                          <button
                            onClick={() => handleOpenVoucher(b)}
                            title="View / Print Official B2B E-Voucher"
                            className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
                          >
                            <Printer size={13} /> Voucher
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenVoucher(b)}
                            title="Preview Booking Voucher"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                          >
                            <Printer size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Booking Details & Status History */}
      {selectedBookingForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase font-extrabold text-cyan-400">Booking Summary</span>
                <h3 className="text-xl font-black text-white font-mono">{selectedBookingForDetails.id}</h3>
              </div>
              <button
                onClick={() => setSelectedBookingForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Product Overview */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-white text-base">{selectedBookingForDetails.productTitle}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>Supplier Code: <strong className="text-white font-mono">{selectedBookingForDetails.supplierProductId}</strong></div>
                <div>Departure Date: <strong className="text-white">{selectedBookingForDetails.departureDate}</strong></div>
                <div>Return Date: <strong className="text-white">{selectedBookingForDetails.returnDate}</strong></div>
                <div>AirDesk Booking ID: <strong className="text-emerald-400 font-mono">{selectedBookingForDetails.supplierBookingId || 'Pending'}</strong></div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block">Total Invoiced to Agency:</span>
                <div className="text-xl font-black text-cyan-400">
                  PKR {selectedBookingForDetails.totalAgentSellingPricePKR.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Status:</span>
                <span className="font-bold text-white">{selectedBookingForDetails.status}</span>
              </div>
            </div>

            {/* Passengers */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Confirmed Passengers ({selectedBookingForDetails.passengers.length})
              </h4>
              <div className="space-y-2 text-xs">
                {selectedBookingForDetails.passengers.map((p, i) => (
                  <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-slate-500 font-mono mr-2">#{i + 1}</span>
                      <strong className="text-white">{p.title} {p.firstName} {p.lastName}</strong>
                      <span className="text-slate-400 ml-2">({p.passengerType}, {p.gender})</span>
                    </div>
                    <div className="font-mono text-cyan-400">{p.passportNumber}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Timeline History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Lifecycle & Audit Trail</h4>
              <div className="space-y-2">
                {selectedBookingForDetails.statusHistory.map((hist, i) => (
                  <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white">{hist.status}</strong>
                        <span className="text-slate-500 text-[10px]">{new Date(hist.changedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{hist.notes} (By {hist.changedBy})</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* E-Voucher Action in Details */}
            {selectedBookingForDetails.status === 'SUPPLIER_CONFIRMED' && (
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenVoucher(selectedBookingForDetails);
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                >
                  <Printer size={14} /> View & Print Official B2B E-Voucher
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Payment Slip Submission */}
      {selectedBookingForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handlePaymentSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Submit Payment Slip</h3>
                <p className="text-xs text-slate-400">Booking: {selectedBookingForPayment.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForPayment(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Amount Due:</div>
              <div className="text-cyan-400 font-black text-base">
                PKR {selectedBookingForPayment.totalAgentSellingPricePKR.toLocaleString()}
              </div>
              <div className="text-slate-500 text-[11px]">GNK Bank: Habib Bank Limited (0042-798201823901)</div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-300">Bank Transfer Reference #</label>
              <input
                type="text"
                placeholder="e.g. HBL-FT-9482019"
                value={paymentRefInput}
                onChange={(e) => setPaymentRefInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-300">Upload Receipt Proof URL / Slip</label>
              <input
                type="text"
                placeholder="https://example.com/receipt.jpg (or simulated upload)"
                value={paymentSlipUrl}
                onChange={(e) => setPaymentSlipUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-md"
            >
              Submit Slip for Verification
            </button>
          </form>
        </div>
      )}

      {/* Official B2B E-Voucher Modal with QR Code */}
      <B2BVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        voucher={activeVoucher}
      />
    </div>
  );
};
