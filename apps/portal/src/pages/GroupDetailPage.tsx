import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BedDouble, Check, Luggage, Plane, X } from 'lucide-react';
import type { GroupDepartureDto } from '@gnk/types';
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
  Tabs,
  Timeline,
  cn,
  formatDate,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { TYPE_LABEL } from '@/lib/labels';
import { FlightLeg } from '@/components/GroupsTable';
import { can } from '@/components/guards';
import { listingPath, serviceByType } from '@/lib/services';

export function GroupDetailPage() {
  const { productId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const approved = session!.account.accountStatus === 'APPROVED';
  const bookable = approved && can.book(session!.account.role);

  const q = useQuery({ queryKey: keys.group(productId), queryFn: () => api.groups.get(productId) });
  const [departureId, setDepartureId] = useState<string | null>(params.get('departure'));
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (q.data && (!departureId || !q.data.departures.some((d) => d.id === departureId))) {
      setDepartureId(q.data.departures.find((d) => d.seatsAvailable > 0)?.id ?? null);
    }
  }, [q.data, departureId]);

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const g = q.data;
  const selected = g.departures.find((d) => d.id === departureId);

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: serviceByType(g.type).title, onClick: () => navigate(listingPath(g.type)) },
              { label: g.sector ?? g.title },
            ]}
          />
        }
        title={g.title}
        meta={
          <Badge tone={g.type === 'UMRAH' ? 'gold' : 'primary'}>
            {TYPE_LABEL[g.type] ?? g.type}
          </Badge>
        }
        description={`${g.airline} · ${g.destination} · ${g.durationDays} days`}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Departures"
              description="Pick a date. Seats shown are what GNK can still sell."
            />
            <ul className="divide-y">
              {g.departures.length === 0 && (
                <li className="p-5 text-sm text-muted-foreground">No upcoming departures.</li>
              )}
              {g.departures.map((d) => (
                <DepartureRow
                  key={d.id}
                  d={d}
                  selected={d.id === departureId}
                  onSelect={() => setDepartureId(d.id)}
                  showPrice={approved}
                />
              ))}
            </ul>
          </Card>

          <Card>
            <div className="px-5 pt-2">
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'overview', label: 'Overview' },
                  ...(g.content.itinerary.length
                    ? [{ value: 'itinerary', label: 'Itinerary' }]
                    : []),
                  { value: 'inclusions', label: 'Inclusions' },
                ]}
              />
            </div>
            <CardBody>
              {tab === 'overview' && (
                <div className="space-y-5">
                  <p className="text-sm leading-relaxed text-foreground/85">{g.content.overview}</p>
                  {(g.content.outbound || g.content.inbound) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[g.content.outbound, g.content.inbound].map(
                        (leg, i) =>
                          leg && (
                            <div key={i} className="rounded-lg border bg-surface-sunken p-3.5">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {i === 0 ? 'Outbound' : 'Return'}
                              </p>
                              <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                                {leg.from} <Plane className="size-4 text-accent" /> {leg.to}
                              </p>
                              <FlightLeg leg={leg} dir={i === 0 ? 'out' : 'in'} />
                            </div>
                          ),
                      )}
                    </div>
                  )}
                  {g.content.hotels?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {g.content.hotels.map((h) => (
                        <div
                          key={h.name}
                          className="flex items-start gap-3 rounded-lg border p-3.5"
                        >
                          <BedDouble className="mt-0.5 size-5 text-link" />
                          <div>
                            <p className="text-sm font-semibold">{h.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {h.city} · {'★'.repeat(h.stars)} · {h.nights} nights
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {tab === 'itinerary' && (
                <Timeline
                  items={g.content.itinerary.map((d) => ({
                    title: `Day ${d.day}: ${d.title}`,
                    body: d.description,
                    tone: 'info',
                  }))}
                />
              )}
              {tab === 'inclusions' && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <ul className="space-y-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Included
                    </p>
                    {g.content.inclusions.map((i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" /> {i}
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Not included
                    </p>
                    {g.content.exclusions.map((i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <X className="mt-0.5 size-4 shrink-0" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Book this group" />
            <CardBody className="space-y-4">
              {!selected ? (
                <p className="text-sm text-muted-foreground">
                  Select a departure with seats available.
                </p>
              ) : (
                <>
                  <div className="text-sm">
                    <p className="font-semibold">{formatDate(selected.departureDate, 'weekday')}</p>
                    <p className="text-muted-foreground">
                      Return {formatDate(selected.returnDate)}
                    </p>
                    {selected.baggage && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Luggage className="size-3.5" /> {selected.baggage}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selected.seatsAvailable} seat{selected.seatsAvailable === 1 ? '' : 's'} left
                    </p>
                  </div>
                  {approved && selected.price != null ? (
                    <div className="space-y-1 rounded-md bg-surface-sunken p-3 text-sm">
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium">Fare per seat</span>
                        <Money value={selected.price} className="text-lg font-semibold" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Choose passenger counts on the next step. Price locks when you confirm.
                      </p>
                    </div>
                  ) : (
                    <Alert tone="info">Fares appear once your account is approved.</Alert>
                  )}
                  {bookable ? (
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={!selected.seatsAvailable}
                      onClick={() =>
                        navigate(`/bookings/new?product=${g.id}&departure=${selected.id}`)
                      }
                    >
                      Continue to booking
                    </Button>
                  ) : approved ? (
                    <p className="text-xs text-muted-foreground">
                      Your role can view fares but not create bookings.
                    </p>
                  ) : (
                    <Button asChild variant="secondary" className="w-full">
                      <Link to="/onboarding">Complete your application</Link>
                    </Button>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function DepartureRow({
  d,
  selected,
  onSelect,
  showPrice,
}: {
  d: GroupDepartureDto;
  selected: boolean;
  onSelect: () => void;
  showPrice: boolean;
}) {
  const disabled = d.seatsAvailable <= 0 || d.status === 'SOLD_OUT' || d.status === 'CLOSED';
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-55',
          selected && 'bg-accent-soft/60 hover:bg-accent-soft',
        )}
      >
        <span
          className={cn(
            'flex size-4 items-center justify-center rounded-full border-2',
            selected ? 'border-accent' : 'border-border-strong',
          )}
        >
          {selected && <span className="size-2 rounded-full bg-accent" />}
        </span>
        <span>
          <span className="block text-sm font-semibold">
            {formatDate(d.departureDate, 'weekday')}
          </span>
          <span className="block text-xs text-muted-foreground">
            Return {formatDate(d.returnDate)} · {d.seatsAvailable} seat
            {d.seatsAvailable === 1 ? '' : 's'} left
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          {showPrice && d.price != null && <Money value={d.price} className="font-semibold" />}
          {d.status !== 'OPEN' && <StatusBadge status={d.status} />}
        </span>
      </button>
    </li>
  );
}
