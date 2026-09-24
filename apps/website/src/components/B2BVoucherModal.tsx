import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Plane, 
  Hotel, 
  Users, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Check, 
  QrCode, 
  Calendar, 
  FileText,
  BadgeCheck
} from 'lucide-react';
import { B2BVoucherData } from '../types/b2b';

interface B2BVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: B2BVoucherData | null;
}

export const B2BVoucherModal: React.FC<B2BVoucherModalProps> = ({
  isOpen,
  onClose,
  voucher,
}) => {
  const [copied, setCopied] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + `/agent/bookings?voucher=${voucher.voucherNumber}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header Controls */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Official B2B Travel E-Voucher
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Confirmed
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">{voucher.voucherNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              {copied ? 'Link Copied' : 'Share Voucher'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div ref={printableRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-200 print:bg-white print:text-black print:p-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-800 print:border-black/20 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white print:text-black">GNK CONNECT TRAVELS</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 print:border print:border-blue-600 print:text-blue-700">
                  AirDesk Group Supplier
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                Wholesale B2B Reseller Confirmation & Passenger E-Voucher
              </p>
              <p className="text-[11px] text-slate-500 print:text-gray-500">
                Issued by GNK Connect Central Operations • Verified AirDesk Group Allocation
              </p>
            </div>

            {/* Verification QR & PNR Badge */}
            <div className="bg-slate-950 print:bg-gray-100 p-3.5 rounded-2xl border border-slate-800 print:border-gray-300 flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-inner">
                <QrCode size={52} className="text-slate-950" />
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-500 block">Supplier PNR</span>
                <div className="text-base font-black font-mono text-emerald-400 print:text-emerald-700">
                  {voucher.supplierPnr}
                </div>
                <div className="text-[10px] font-mono text-cyan-400 print:text-blue-600">
                  GNK ID: {voucher.gnkBookingId}
                </div>
              </div>
            </div>
          </div>

          {/* Tour Title & Travel Dates Grid */}
          <div className="bg-slate-950 print:bg-gray-50 p-5 rounded-2xl border border-slate-800 print:border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2 space-y-1">
              <span className="text-[10px] uppercase font-bold text-cyan-400 print:text-blue-600 block">Group Tour Program</span>
              <h2 className="text-base font-black text-white print:text-black">{voucher.tourTitle}</h2>
              <p className="text-slate-400 print:text-gray-600 flex items-center gap-1">
                <MapPin size={12} className="text-amber-400" /> Destination: <strong className="text-slate-200 print:text-black">{voucher.destination}</strong> ({voucher.durationDays} Days / {voucher.durationDays - 1} Nights)
              </p>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-slate-800 sm:pl-4 print:border-gray-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-500 block">Travel Schedule</span>
              <div className="flex items-center gap-2 text-white print:text-black font-bold">
                <Calendar size={13} className="text-cyan-400" />
                <span>{voucher.departureDate}</span>
              </div>
              <p className="text-[11px] text-slate-400 print:text-gray-600">
                Return: <strong>{voucher.returnDate}</strong>
              </p>
            </div>
          </div>

          {/* Hotel, Flight & Meeting Point Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 print:bg-gray-50 p-4 rounded-2xl border border-slate-800 print:border-gray-200 space-y-2">
              <h4 className="font-bold text-white print:text-black flex items-center gap-2">
                <Hotel size={15} className="text-amber-400" /> Accommodation & Hospitality
              </h4>
              <p className="text-slate-300 print:text-gray-700">{voucher.hotelDetails}</p>
              <div className="pt-2 border-t border-slate-800/80 print:border-gray-200 flex items-center gap-2">
                <Plane size={14} className="text-cyan-400" />
                <span className="text-slate-400 print:text-gray-600">Flight: <strong className="text-white print:text-black">{voucher.airline}</strong></span>
              </div>
            </div>

            <div className="bg-slate-950 print:bg-gray-50 p-4 rounded-2xl border border-slate-800 print:border-gray-200 space-y-2">
              <h4 className="font-bold text-white print:text-black flex items-center gap-2">
                <Users size={15} className="text-purple-400" /> Booking Agency Details
              </h4>
              <p className="text-slate-200 print:text-black font-bold">{voucher.agencyName}</p>
              <p className="text-slate-400 print:text-gray-600">
                Agent: {voucher.agentName} • Phone: {voucher.agentPhone}
              </p>
              <div className="pt-2 border-t border-slate-800/80 print:border-gray-200 flex items-center gap-1.5 text-[11px] text-amber-400 print:text-amber-700 font-bold">
                <Phone size={12} /> 24/7 Helpline: {voucher.emergencyCoordinator}
              </div>
            </div>
          </div>

          {/* Passenger Roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white print:text-black flex items-center gap-1.5">
                <BadgeCheck size={14} className="text-emerald-400" /> Confirmed Passenger Roster ({voucher.passengers.length} Pax)
              </h3>
            </div>

            <div className="overflow-hidden border border-slate-800 print:border-gray-300 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 print:bg-gray-100 border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Passenger Name</th>
                    <th className="py-2.5 px-4">Type & Gender</th>
                    <th className="py-2.5 px-4">Passport #</th>
                    <th className="py-2.5 px-4">Passport Expiry</th>
                    <th className="py-2.5 px-4">Nationality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 print:divide-gray-200 text-slate-300 print:text-gray-800">
                  {voucher.passengers.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-800/20 print:hover:bg-transparent">
                      <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-white print:text-black">
                        {p.title} {p.firstName} {p.lastName}
                      </td>
                      <td className="py-3 px-4">{p.passengerType} ({p.gender})</td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400 print:text-blue-700">{p.passportNumber}</td>
                      <td className="py-3 px-4 font-mono">{p.passportExpiry || '2030-10-15'}</td>
                      <td className="py-3 px-4">{p.nationality || 'Pakistani'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inclusions & Terms */}
          <div className="bg-slate-950 print:bg-gray-50 p-4 rounded-2xl border border-slate-800 print:border-gray-200 space-y-2 text-xs">
            <h4 className="font-bold text-white print:text-black uppercase text-[10px] tracking-wider text-cyan-400 print:text-blue-600">
              Package Inclusions & Services Confirmed
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-300 print:text-gray-700">
              {voucher.inclusions.map((inc, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <Check size={13} className="text-emerald-400 print:text-emerald-600 shrink-0 mt-0.5" />
                  <span>{inc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Airport Meeting Point & Voucher Validation */}
          <div className="pt-4 border-t border-slate-800 print:border-black/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-slate-500 print:text-gray-600">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-300 print:text-black flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                Present this voucher along with original passports at airport check-in and hotel reception.
              </p>
              <p className="text-[11px]">Meeting Point: {voucher.meetingPoint}</p>
            </div>

            <div className="text-left sm:text-right font-mono text-[10px] text-slate-400 print:text-gray-500">
              <div>Auth Code: <strong>{voucher.verificationCode}</strong></div>
              <div>Issued: {new Date(voucher.issuedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
