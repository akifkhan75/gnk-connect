import React from 'react';
import { Calendar, Luggage, MessageCircle, Plane } from 'lucide-react';
import { CONTACT_INFO } from '../constants';
import type { PublicGroup } from '../hooks/usePublicGroups';

const fmt = (d: string) =>
  new Date(`${d}T00:00:00+05:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Public group departure card: route-led, no prices (fares are quoted by our team or shown to agents). */
export const GroupCard: React.FC<{ group: PublicGroup }> = ({ group }) => {
  const [from, to] = (group.sector ?? '').split('-');
  const next = group.departures[0];
  const isUmrah = group.type === 'UMRAH';
  const message = `Assalam-o-Alaikum GNK Connect, I'd like details and fares for "${group.title}"${next ? ` departing ${fmt(next.date)}` : ''}.`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative bg-[#00205B] px-5 pb-5 pt-4 text-white">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isUmrah ? 'bg-amber-400 text-[#00205B]' : 'bg-cyan-400/20 text-cyan-200'}`}
          >
            {isUmrah ? 'Umrah package' : 'Group ticket'}
          </span>
          <span className="text-xs text-white/70">{group.airline}</span>
        </div>
        {from && to ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tracking-tight">{from}</span>
            <span className="relative h-px flex-1 border-t border-dashed border-white/40">
              <Plane
                size={16}
                className="absolute -top-2 left-1/2 -translate-x-1/2 text-cyan-300"
              />
            </span>
            <span className="text-3xl font-bold tracking-tight">{to}</span>
          </div>
        ) : (
          <p className="text-2xl font-bold">{group.destination}</p>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-semibold text-[#0B1528]">{group.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{group.durationDays} days</span>
            {group.baggage && (
              <span className="inline-flex items-center gap-1">
                <Luggage size={12} /> {group.baggage}
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Upcoming departures
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.departures.slice(0, 5).map((d) => (
              <span
                key={d.id}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${d.seats <= 0 ? 'border-gray-200 text-gray-400 line-through' : 'border-gray-200 text-gray-700'}`}
                title={d.seats > 0 ? `${d.seats} seats left` : 'Sold out'}
              >
                <Calendar size={11} className="text-cyan-600" /> {fmt(d.date)}
                {d.seats > 0 && d.seats <= 5 && (
                  <span className="font-semibold text-red-600">· {d.seats} left</span>
                )}
              </span>
            ))}
          </div>
        </div>
        <a
          href={`https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00205B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#003087]"
        >
          <MessageCircle size={16} /> Ask for fares on WhatsApp
        </a>
      </div>
    </article>
  );
};
