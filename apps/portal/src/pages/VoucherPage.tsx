import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plane } from 'lucide-react';
import {
  Alert,
  ErrorState,
  PrintSheet,
  Spinner,
  formatDate,
  formatDateTime,
  titleCase,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';

export function VoucherPage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: keys.booking(id), queryFn: () => api.bookings.get(id) });
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner className="py-20" />;
  const b = q.data;
  if (b.status !== 'CONFIRMED' && b.status !== 'COMPLETED') {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Alert tone="warning">The voucher is available once the booking is confirmed.</Alert>
      </div>
    );
  }
  return (
    <PrintSheet title="Travel voucher" onBack={() => navigate(`/bookings/${b.id}`)}>
      <section className="mb-6 grid grid-cols-3 gap-4 rounded-md bg-slate-50 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Booking reference</p>
          <p className="text-base font-semibold">{b.reference}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Airline PNR</p>
          <p className="font-mono text-base font-semibold">{b.pnr ?? '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Issued to</p>
          <p className="font-semibold">{session?.account.accountName}</p>
        </div>
      </section>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Itinerary
      </h2>
      <table className="mb-6 w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-2">Flight</th>
            <th>From</th>
            <th>To</th>
            <th>Date</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {[
            { leg: b.outbound, date: b.departureDate },
            { leg: b.inbound, date: b.returnDate },
          ].map(
            ({ leg, date }, i) =>
              leg && (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-2.5 font-semibold">
                    <Plane className="mr-1.5 inline size-3.5 text-[#00A3E0]" />
                    {leg.flightNo}
                  </td>
                  <td>{leg.from}</td>
                  <td>{leg.to}</td>
                  <td>{formatDate(date, 'weekday')}</td>
                  <td className="tabular">
                    {leg.departTime} → {leg.arriveTime}
                  </td>
                </tr>
              ),
          )}
        </tbody>
      </table>
      <p className="mb-6 text-slate-600">
        {b.title} · {b.airline} · Baggage {b.baggage ?? 'as per airline policy'}
      </p>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Passengers
      </h2>
      <table className="mb-8 w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-2">#</th>
            <th>Name</th>
            <th>Type</th>
            <th>Passport</th>
          </tr>
        </thead>
        <tbody>
          {b.passengers.map((p, i) => (
            <tr key={p.id} className="border-b border-slate-200">
              <td className="py-2">{i + 1}</td>
              <td className="font-medium">{`${titleCase(p.title)} ${p.firstName} ${p.lastName}`}</td>
              <td>{titleCase(p.type)}</td>
              <td className="tabular">{p.passportMasked}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="rounded-md border border-slate-200 p-4 text-[12px] text-slate-600">
        <p className="mb-1 font-semibold text-slate-800">Important</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            Report at the airline check-in counter at least 4 hours before departure with original
            passports.
          </li>
          <li>Group fares are non-refundable and non-changeable unless the airline allows it.</li>
          <li>
            Visa, travel insurance and local requirements are the traveller's responsibility unless
            included above.
          </li>
        </ul>
      </section>
      <p className="mt-8 text-[11px] text-slate-400">
        Generated {formatDateTime(new Date())} · GNK Connect
      </p>
    </PrintSheet>
  );
}
