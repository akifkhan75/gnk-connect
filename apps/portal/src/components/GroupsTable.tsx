import { Link } from 'react-router-dom';
import { ArrowRight, Luggage, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import type { FlightLegDto, GroupListItem } from '@gnk/types';
import { Badge, Button, DataTable, Money, StatusBadge, formatDate, type Column } from '@gnk/ui';
import { TYPE_LABEL } from '@/lib/labels';

export function FlightLeg({ leg, dir }: { leg: FlightLegDto | null; dir: 'out' | 'in' }) {
  if (!leg) return null;
  const Icon = dir === 'out' ? PlaneTakeoff : PlaneLanding;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      <span className="font-medium text-foreground">{leg.flightNo}</span>
      <span className="tabular">
        {leg.departTime}–{leg.arriveTime}
      </span>
    </span>
  );
}

export function SeatsLeft({ n }: { n: number }) {
  if (n <= 0) return <span className="text-xs font-medium text-muted-foreground">Sold out</span>;
  return <span className={`tabular font-semibold ${n <= 5 ? 'text-danger' : ''}`}>{n}</span>;
}

/** Dense AirDesk-style group fare table. */
export function GroupsTable({
  rows,
  loading,
  canBook,
  empty,
  compact,
}: {
  rows?: GroupListItem[];
  loading?: boolean;
  canBook: boolean;
  empty?: React.ReactNode;
  compact?: boolean;
}) {
  const columns: Column<GroupListItem>[] = [
    {
      key: 'sector',
      header: 'Sector',
      cell: (g) => (
        <div className="min-w-[9rem]">
          <Link
            to={`/groups/${g.productId}?departure=${g.departureId}`}
            className="font-semibold hover:text-link"
          >
            {g.sector ?? g.destination}
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge tone={g.type === 'UMRAH' ? 'gold' : 'primary'}>
              {TYPE_LABEL[g.type] ?? g.type}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'airline',
      header: 'Airline & flights',
      hideBelow: 'md',
      cell: (g) => (
        <div className="space-y-0.5">
          <p className="font-medium">{g.airline}</p>
          {!compact && (
            <div className="flex flex-col">
              <FlightLeg leg={g.outbound} dir="out" />
              <FlightLeg leg={g.inbound} dir="in" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Departure',
      cell: (g) => (
        <div className="whitespace-nowrap">
          <p className="font-medium">{formatDate(g.departureDate, 'weekday')}</p>
          <p className="text-xs text-muted-foreground">
            Return {formatDate(g.returnDate)} · {g.durationDays}d
          </p>
        </div>
      ),
    },
    {
      key: 'baggage',
      header: 'Baggage',
      hideBelow: compact ? '2xl' : 'xl',
      cell: (g) => (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Luggage className="size-3.5" />
          {g.baggage ?? '—'}
        </span>
      ),
    },
    {
      key: 'seats',
      header: 'Seats',
      align: 'right',
      cell: (g) => <SeatsLeft n={g.seatsAvailable} />,
    },
    {
      key: 'price',
      header: 'Fare / seat',
      align: 'right',
      cell: (g) =>
        g.price == null ? (
          <span className="text-xs text-muted-foreground">After approval</span>
        ) : (
          <Money value={g.price} className="font-semibold" />
        ),
    },
    {
      key: 'action',
      header: <span className="sr-only">Action</span>,
      align: 'right',
      cell: (g) =>
        g.status === 'SOLD_OUT' || g.seatsAvailable <= 0 ? (
          <StatusBadge status="SOLD_OUT" />
        ) : (
          <Button asChild size="sm" variant={canBook ? 'primary' : 'secondary'}>
            <Link
              to={
                canBook
                  ? `/bookings/new?departure=${g.departureId}`
                  : `/groups/${g.productId}?departure=${g.departureId}`
              }
            >
              {canBook ? 'Book' : 'View'} <ArrowRight />
            </Link>
          </Button>
        ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(g) => g.departureId}
      loading={loading}
      empty={empty}
      dense={compact}
    />
  );
}
