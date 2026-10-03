import type { ReactNode } from 'react';
import { Plane } from 'lucide-react';
import type { FlightLegDto } from '@gnk/types';
import { cn, formatDate } from '@gnk/ui';

export function sectorCode(
  sector: string | null | undefined,
  outbound?: FlightLegDto | null,
  inbound?: FlightLegDto | null,
) {
  if (outbound && inbound) return `${outbound.from}-${outbound.to}-${inbound.to}`;
  if (outbound) return `${outbound.from}-${outbound.to}`;
  return sector ?? '—';
}

export function visaLabel(type?: string | null, sector?: string | null) {
  if (type === 'UMRAH' || /JED|MED|RUH|MAK/.test(sector ?? '')) return 'Yes';
  return '—';
}

export function FlightStrip({
  outbound,
  inbound,
  departureDate,
  returnDate,
  baggage,
  visa,
}: {
  outbound: FlightLegDto | null;
  inbound: FlightLegDto | null;
  departureDate: string;
  returnDate: string | null;
  baggage?: string | null;
  visa?: string | null;
}) {
  const rows = [
    { leg: outbound, date: departureDate },
    { leg: inbound, date: returnDate },
  ].filter((r): r is { leg: FlightLegDto; date: string } => Boolean(r.leg && r.date));

  if (!rows.length) return null;

  return (
    <div className="divide-y divide-border/50">
      {rows.map(({ leg, date }) => (
        <div
          key={`${leg.flightNo}-${date}`}
          className="grid grid-cols-[7.25rem_minmax(0,1fr)_5.75rem] items-center gap-3 px-5 py-3 sm:grid-cols-[8.25rem_minmax(0,1fr)_7rem]"
        >
          <div>
            <p className="text-[13px] font-medium leading-5">{formatDate(date, 'long')}</p>
            <p className="text-[12px] tabular text-muted-foreground">{leg.departTime}</p>
            <p className="text-[11px] font-semibold text-accent">{leg.flightNo}</p>
          </div>
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <p className="text-sm font-semibold tracking-wide">{leg.from}</p>
            <div className="relative mx-1 h-px bg-accent/35">
              <span className="absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
              <Plane className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-accent" />
              <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tracking-wide">{leg.to}</p>
              <p className="text-[12px] tabular text-muted-foreground">{leg.arriveTime}</p>
            </div>
          </div>
          <div className="text-right text-[12px] leading-5 text-muted-foreground">
            {baggage && <p>{baggage}</p>}
            {visa && <p>{visa}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FareItinerary({
  sector,
  airline,
  outbound,
  inbound,
  departureDate,
  returnDate,
  baggage,
  visa,
  aside,
  className,
}: {
  sector: string | null;
  airline: string | null;
  outbound: FlightLegDto | null;
  inbound: FlightLegDto | null;
  departureDate: string;
  returnDate: string | null;
  baggage?: string | null;
  visa?: string | null;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('overflow-hidden rounded-xl bg-surface shadow-card', className)}>
      <header className="bg-accent px-5 py-2.5 text-center text-[15px] font-semibold tracking-[0.06em] text-accent-foreground">
        {sectorCode(sector, outbound, inbound)}
      </header>
      {airline && (
        <p className="border-b border-border/50 py-2 text-center text-[13px] font-medium capitalize text-muted-foreground">
          {airline}
        </p>
      )}
      <div className={aside ? 'grid md:grid-cols-[minmax(0,1fr)_11rem]' : undefined}>
        {outbound || inbound ? (
          <FlightStrip
            outbound={outbound}
            inbound={inbound}
            departureDate={departureDate}
            returnDate={returnDate}
            baggage={baggage}
            visa={visa}
          />
        ) : (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            {formatDate(departureDate, 'long')}
            {returnDate ? ` – ${formatDate(returnDate, 'long')}` : ''}
          </p>
        )}
        {aside}
      </div>
    </article>
  );
}
