import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { InvoiceDetailDto } from '@gnk/types';
import { ErrorState, Spinner, formatDate, formatMoney, titleCase } from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { PrintSheet } from '@/components/PrintSheet';

export function InvoicePage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: keys.invoice(id), queryFn: () => api.invoices.get(id) });
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner className="py-20" />;
  return <InvoiceDocument invoice={q.data} backTo="/invoices" />;
}

export function InvoiceDocument({
  invoice: inv,
  backTo,
}: {
  invoice: InvoiceDetailDto;
  backTo: string;
}) {
  return (
    <PrintSheet title={inv.voided ? 'Invoice (void)' : 'Invoice'} backTo={backTo}>
      <section className="mb-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">From</p>
          <p className="font-semibold">{inv.company.name}</p>
          <p className="text-slate-600">{inv.company.address}</p>
          <p className="text-slate-600">
            {inv.company.phone} · {inv.company.email}
          </p>
          {inv.company.ntn && <p className="text-slate-600">NTN {inv.company.ntn}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Invoice</p>
          <p className="text-base font-semibold">{inv.number}</p>
          <p className="text-slate-600">Issued {formatDate(inv.issuedAt)}</p>
          <p className="text-slate-600">Booking {inv.bookingReference}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Bill to</p>
          <p className="font-semibold">{inv.billTo.name}</p>
          <p className="text-slate-600">
            {inv.billTo.code}
            {inv.billTo.ntn ? ` · NTN ${inv.billTo.ntn}` : ''}
          </p>
          <p className="text-slate-600">
            {[inv.billTo.address, inv.billTo.city].filter(Boolean).join(', ')}
          </p>
          <p className="text-slate-600">{inv.billTo.email}</p>
        </div>
      </section>

      <table className="mb-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-2">Description</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Unit price</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-200 align-top">
            <td className="py-3">
              <p className="font-medium">{inv.booking.title}</p>
              <p className="text-slate-600">
                {inv.booking.sector} · {inv.booking.airline} ·{' '}
                {formatDate(inv.booking.departureDate)} – {formatDate(inv.booking.returnDate)}
                {inv.booking.pnr ? ` · PNR ${inv.booking.pnr}` : ''}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                {inv.booking.passengers.map((p) => `${p.name} (${titleCase(p.type)})`).join(', ')}
              </p>
            </td>
            <td className="py-3 text-right tabular">{inv.booking.seats}</td>
            <td className="py-3 text-right tabular">{formatMoney(inv.booking.unitPrice)}</td>
            <td className="py-3 text-right tabular">{formatMoney(inv.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="ml-auto w-64 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-600">Total</span>
          <span className="tabular font-semibold">{formatMoney(inv.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Charged to account</span>
          <span className="tabular">{formatMoney(inv.amountPaid)}</span>
        </div>
      </div>
      {inv.voided && (
        <p className="mt-8 text-center text-lg font-bold uppercase tracking-widest text-red-600">
          Void: booking cancelled and refunded
        </p>
      )}
      <p className="mt-16 text-[11px] text-slate-400">
        This is a computer-generated invoice and does not require a signature.
      </p>
    </PrintSheet>
  );
}
