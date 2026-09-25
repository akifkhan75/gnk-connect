import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@gnk/api-client';
import { Printer, Download, MapPin, Calendar, Clock, Plane, FileText } from 'lucide-react';
import { Button } from '@gnk/ui';

export function VoucherPage() {
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getBookingById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading voucher...</div>;
  }

  if (!booking) {
    return <div className="p-8 text-center text-red-500">Booking not found</div>;
  }

  // Determine if it's confirmed
  const isConfirmed = booking.status === 'APPROVED' || booking.status === 'CONFIRMED';
  
  if (!isConfirmed) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center mt-12 bg-white rounded-xl shadow-sm border border-border">
        <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Voucher Not Available</h2>
        <p className="text-muted-foreground">
          This booking is currently in <strong>{booking.status}</strong> state.
          The travel voucher will be available once the booking is approved and confirmed.
        </p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[800px] mx-auto pb-12">
      {/* Header Actions (hidden on print) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Travel Voucher</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Voucher
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Printable Voucher Paper */}
      <div className="bg-white border rounded-lg shadow-sm p-8 print:p-0 print:border-none print:shadow-none font-sans text-slate-800">
        
        {/* Voucher Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h2 className="text-3xl font-black text-primary tracking-tight uppercase">GNK CONNECT</h2>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">Official B2B Travel Voucher</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Booking Reference</div>
            <div className="text-2xl font-mono font-bold">{booking.reference}</div>
            <div className="text-sm mt-1">
              <span className="text-slate-500">Status: </span>
              <span className="font-bold text-green-600">CONFIRMED</span>
            </div>
            {booking.supplierBookingRef && (
              <div className="text-sm mt-1">
                <span className="text-slate-500">Supplier PNR: </span>
                <span className="font-mono font-bold">{booking.supplierBookingRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tour Details */}
        <div className="mb-8">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 uppercase tracking-wider text-slate-400">Tour & Destination</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-slate-500 mb-1">Product Title</div>
              <div className="font-semibold text-lg">{booking.product?.title || 'Unknown Tour'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500 mb-1">Destination</div>
              <div className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {booking.product?.destination || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary Summary */}
        <div className="mb-8 p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Travel Dates
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-sm text-slate-500 uppercase font-semibold">Departure</div>
              <div className="text-xl font-bold mt-1">
                {new Date(booking.departure?.departureDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 uppercase font-semibold">Return</div>
              <div className="text-xl font-bold mt-1">
                {booking.departure?.returnDate ? new Date(booking.departure.returnDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Manifest */}
        <div className="mb-8">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 uppercase tracking-wider text-slate-400">Passenger Manifest</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="py-3 px-4 border-b font-semibold text-sm text-slate-600">No.</th>
                <th className="py-3 px-4 border-b font-semibold text-sm text-slate-600">Name</th>
                <th className="py-3 px-4 border-b font-semibold text-sm text-slate-600">Type</th>
                <th className="py-3 px-4 border-b font-semibold text-sm text-slate-600">Passport</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers?.map((p: any, idx: number) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 px-4 text-sm text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold">
                    {p.title} {p.firstName} {p.lastName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {p.passportMasked}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Important Notes */}
        <div className="text-sm text-slate-500 mt-12 pt-6 border-t print:text-xs">
          <h4 className="font-bold text-slate-700 mb-2 uppercase tracking-wider">Important Notes</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Please present this voucher along with a valid passport at the time of boarding/check-in.</li>
            <li>All passengers must hold a valid passport with at least 6 months validity from the date of return.</li>
            <li>This is a system generated document and does not require a physical signature.</li>
          </ul>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}} />
    </div>
  );
}
