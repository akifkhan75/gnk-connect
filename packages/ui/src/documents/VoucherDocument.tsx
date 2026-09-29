import type { VoucherDto } from '@gnk/types';
import { amountInWords, formatDate, formatDateTime, formatMoney } from '../lib/format';
import { PrintSheet } from './PrintSheet';

const TITLES: Record<VoucherDto['type'], string> = {
  SALE: 'Sales voucher',
  RECEIPT: 'Receipt voucher',
  PAYMENT: 'Payment voucher',
  JOURNAL: 'Journal voucher',
  REVERSAL: 'Reversal voucher',
  ADJUSTMENT: 'Adjustment voucher',
};

/** Printable accounting voucher with lines, foreign amounts and sign-offs. */
export function VoucherDocument({
  voucher: v,
  companyName,
  onBack,
}: {
  voucher: VoucherDto;
  companyName: string;
  onBack: () => void;
}) {
  const fc = v.lines.some((l) => l.currency !== 'PKR');
  return (
    <PrintSheet title={TITLES[v.type]} onBack={onBack}>
      <section className="mb-6 grid grid-cols-3 gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Voucher no.</p>
          <p className="text-base font-semibold">{v.reference}</p>
          <p className="text-slate-600">{companyName}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Date</p>
          <p className="font-medium">{formatDate(v.date)}</p>
          {v.status !== 'POSTED' && <p className="font-semibold text-amber-700">{v.status}</p>}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Party</p>
          <p className="font-medium">{v.partnerName ?? '—'}</p>
        </div>
      </section>
      <p className="mb-6">
        <span className="text-slate-500">Narration: </span>
        {v.description}
      </p>
      <table className="mb-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-800 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-2">Account</th>
            {fc && <th className="text-right">Foreign amount</th>}
            <th className="text-right">Debit (PKR)</th>
            <th className="text-right">Credit (PKR)</th>
          </tr>
        </thead>
        <tbody>
          {v.lines.map((l, i) => (
            <tr key={i} className="border-b border-slate-200 align-top">
              <td className="py-2">
                <p className="font-medium">
                  {l.accountCode} · {l.accountName}
                </p>
                {l.narration && <p className="text-[12px] text-slate-500">{l.narration}</p>}
              </td>
              {fc && (
                <td className="py-2 text-right tabular text-slate-600">
                  {l.fcAmount != null
                    ? `${l.currency} ${l.fcAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })} @ ${l.rate}`
                    : ''}
                </td>
              )}
              <td className="py-2 text-right tabular">
                {l.debit ? formatMoney(l.debit, { decimals: true, currency: false }) : ''}
              </td>
              <td className="py-2 text-right tabular">
                {l.credit ? formatMoney(l.credit, { decimals: true, currency: false }) : ''}
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2">Total</td>
            {fc && <td />}
            <td className="py-2 text-right tabular">
              {formatMoney(v.totalDebit, { decimals: true, currency: false })}
            </td>
            <td className="py-2 text-right tabular">
              {formatMoney(v.totalCredit, { decimals: true, currency: false })}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mb-12 text-slate-600">{amountInWords(v.totalDebit)}</p>
      <section className="grid grid-cols-3 gap-6 text-[12px]">
        {[
          ['Prepared by', v.createdBy?.name, v.submittedAt ?? null],
          ['Approved by', v.approvedBy?.name, v.approvedAt],
          ['Posted', v.postedAt ? 'Ledger' : null, v.postedAt],
        ].map(([label, name, at]) => (
          <div key={label} className="border-t border-slate-300 pt-2">
            <p className="text-slate-500">{label}</p>
            <p className="font-medium">{name ?? '—'}</p>
            {at && <p className="text-slate-500">{formatDateTime(at)}</p>}
          </div>
        ))}
      </section>
    </PrintSheet>
  );
}
