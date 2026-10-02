import { Link } from 'react-router-dom';
import { Ticket, User } from 'lucide-react';
import type { GroupListItem } from '@gnk/types';
import { Button, Money, StatusBadge } from '@gnk/ui';
import { FareItinerary, visaLabel } from './FlightStrip';

export function GroupFareCard({ group: g, canBook }: { group: GroupListItem; canBook: boolean }) {
  const sold = g.status === 'SOLD_OUT' || g.seatsAvailable <= 0;
  const bookTo = `/bookings/new?departure=${g.departureId}`;
  const viewTo = `/groups/${g.productId}?departure=${g.departureId}`;

  return (
    <FareItinerary
      sector={g.sector}
      airline={g.airline}
      outbound={g.outbound}
      inbound={g.inbound}
      departureDate={g.departureDate}
      returnDate={g.returnDate}
      baggage={g.baggage}
      visa={visaLabel(g.type, g.sector)}
      aside={
        <div className="flex flex-col items-center justify-center gap-2 border-t px-4 py-4 md:border-l md:border-t-0">
          {g.price == null ? (
            <p className="text-center text-xs text-muted-foreground">Fares after approval</p>
          ) : (
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <User className="size-3" /> Adult
              </p>
              <Money value={g.price} className="text-lg font-semibold" />
              <p className="text-[11px] text-muted-foreground">
                {g.seatsAvailable === 1 ? '1 seat' : `${g.seatsAvailable} seats`}
              </p>
            </div>
          )}
          {sold ? (
            <StatusBadge status="SOLD_OUT" />
          ) : (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="border-accent/40 text-accent hover:bg-accent-soft"
            >
              <Link to={canBook ? bookTo : viewTo}>
                <Ticket /> {canBook ? 'Book now' : 'View'}
              </Link>
            </Button>
          )}
        </div>
      }
    />
  );
}
