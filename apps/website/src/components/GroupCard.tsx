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
    <article className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgb(11_26_51/0.35)]">
      <div className="relative bg-gradient-to-br from-navy-800 to-navy-900 px-5 pb-5 pt-4 text-white">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isUmrah ? 'bg-warm text-white' : 'bg-cyan-400/20 text-cyan-200'}`}
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
          <h3 className="font-semibold text-ink">{group.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <span>{group.durationDays} days</span>
            {group.baggage && (
              <span className="inline-flex items-center gap-1">
                <Luggage size={12} /> {group.baggage}
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-ink-3">Upcoming departures</p>
          <div className="flex flex-wrap gap-1.5">
            {group.departures.slice(0, 5).map((d) => (
              <span
                key={d.id}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${d.seats <= 0 ? 'border-line text-ink-3 line-through' : 'border-line text-ink-2'}`}
                title={d.seats > 0 ? `${d.seats} seats left` : 'Sold out'}
              >
                <Calendar size={11} className="text-brand-ink" /> {fmt(d.date)}
                {d.seats > 0 && d.seats <= 5 && (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    · {d.seats} left
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
        <a
          href={`https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-canvas transition-opacity hover:opacity-90"
        >
          <MessageCircle size={16} /> Ask for fares on WhatsApp
        </a>
      </div>
    </article>
  );
};
