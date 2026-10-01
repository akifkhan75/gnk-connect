import type { ReceiptDto } from '@gnk/types';
import { amountInWords, formatDate, formatMoney, titleCase } from '../lib/format';
import { PrintSheet } from './PrintSheet';

/** Printable payment receipt (receipt voucher), shared by the portal and admin. */
export function ReceiptDocument({
  receipt: r,
  onBack,
  onDownload,
}: {
  receipt: ReceiptDto;
  onBack: () => void;
  onDownload?: () => Promise<void>;
}) {
  const p = r.payment;
  return (
    <PrintSheet title="Payment receipt" onBack={onBack} onDownload={onDownload}>
      <section className="mb-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Issued by</p>
          <p className="font-semibold">{r.company.name}</p>
          <p className="text-slate-600">{r.company.address}</p>
          <p className="text-slate-600">
            {r.company.phone} · {r.company.email}
          </p>
          {r.company.ntn && <p className="text-slate-600">NTN {r.company.ntn}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Receipt</p>
          <p className="text-base font-semibold">{r.number}</p>
          <p className="text-slate-600">Dated {formatDate(r.date)}</p>
          <p className="text-slate-600">Payment {p.reference}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Received from</p>
          <p className="font-semibold">{r.receivedFrom.name}</p>
          <p className="text-slate-600">{r.receivedFrom.code}</p>
          <p className="text-slate-600">
            {[r.receivedFrom.address, r.receivedFrom.city].filter(Boolean).join(', ')}
          </p>
          <p className="text-slate-600">{r.receivedFrom.email}</p>
        </div>
      </section>

      <div className="mb-8 rounded-xl bg-slate-50 p-6">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Amount received</p>
        <p className="tabular mt-1 text-3xl font-semibold tracking-tight">
          {formatMoney(p.amount, { decimals: true })}
        </p>
        <p className="mt-1 text-slate-600">{amountInWords(p.amount)}</p>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-x-8 gap-y-3">
        {[
          ['Method', titleCase(p.method)],
          ['Bank', p.bankName ?? '—'],
          ['Transaction / slip no.', p.transactionRef ?? '—'],
          ['Paid on', formatDate(p.paidAt)],
          ['Deposited to', r.depositAccount ?? '—'],
          ['Approved by', r.approvedBy ?? '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      {p.allocations.length > 0 && (
        <table className="mb-6 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="py-2">Applied to booking</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {p.allocations.map((a) => (
              <tr key={a.bookingId} className="border-b border-slate-200">
                <td className="py-2">{a.bookingReference}</td>
                <td className="py-2 text-right tabular">{formatMoney(a.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {p.notes && <p className="text-slate-600">Note: {p.notes}</p>}
      <p className="mt-16 text-[11px] text-slate-400">
        This receipt is computer generated and valid without a signature. The amount has been
        credited to the account balance of {r.receivedFrom.code}.
      </p>
    </PrintSheet>
  );
}
