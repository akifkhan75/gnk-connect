import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plane } from 'lucide-react';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  formatDateTime,
} from '@gnk/ui';
import type { InventoryGroupDetail, InventoryLotSummary } from '@gnk/types';
import { api, useAuth } from '@/lib/api';
import { can } from '@/components/guards';

export function InventoryGroupDetailPage() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const bookable = session!.account.accountStatus === 'APPROVED' && can.book(session!.account.role);

  const q = useQuery({
    queryKey: ['inventory-group', groupId],
    queryFn: () => api.inventory.groups.get(groupId),
    enabled: !!groupId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const g = q.data;

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Group tickets', onClick: () => navigate('/book/groups') },
              { label: g.code },
            ]}
          />
        }
        title={g.name}
        description={`${g.airline ?? 'Airline'} · Payment window ${g.paymentDeadlineHours}h after booking`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Itinerary" />
            <CardBody className="space-y-3">
              {g.legs.length === 0 && (
                <p className="text-sm text-muted-foreground">Flight legs not published yet.</p>
              )}
              {g.legs.map((leg, i) => (
                <div key={i} className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{leg.direction}</p>
                    <p className="font-semibold">{leg.flightNo}</p>
                  </div>
                  <div className="flex flex-1 items-center gap-3">
                    <div className="text-center">
                      <p className="font-bold">{leg.from}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(leg.departAt)}
                      </p>
                    </div>
                    <Plane className="size-4 text-primary" />
                    <div className="text-center">
                      <p className="font-bold">{leg.to}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(leg.arriveAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cabins" description="Pick a cabin to continue to booking." />
            <ul className="divide-y">
              {g.lots.length === 0 && (
                <li className="p-5 text-sm text-muted-foreground">No open cabins.</li>
              )}
              {g.lots.map((lot) => (
                <LotRow key={lot.id} lot={lot} group={g} bookable={bookable} />
              ))}
            </ul>
          </Card>
        </div>

        <aside>
          <Card>
            <CardHeader title="Booking notes" />
            <CardBody className="space-y-2 text-sm text-muted-foreground">
              <p>Hold expires {g.paymentDeadlineHours} hours after you confirm seats.</p>
              <p>Add passengers now or later before ticketing.</p>
              {g.description && <p className="pt-2 text-foreground">{g.description}</p>}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function LotRow({
  lot,
  group,
  bookable,
}: {
  lot: InventoryLotSummary;
  group: InventoryGroupDetail;
  bookable: boolean;
}) {
  const available = lot.seatsAvailable;
  const soldOut = available != null && available <= 0;
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="font-semibold">
          {lot.cabinClass} · {lot.bucketCode}
        </p>
        <p className="text-xs text-muted-foreground">
          {group.showAvailableSeats && available != null
            ? `${available} seat${available === 1 ? '' : 's'} left`
            : 'Seats available on request'}
          {lot.hasInfantFare ? '' : ' · Infants not configured'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {lot.fareAmount != null && <Money value={lot.fareAmount} className="font-semibold" />}
        {bookable ? (
          <Button asChild disabled={soldOut || lot.status !== 'OPEN'}>
            <Link to={`/bookings/new?lot=${lot.id}&group=${group.id}`}>Book</Link>
          </Button>
        ) : (
          <Alert tone="info">Complete approval to book.</Alert>
        )}
      </div>
    </li>
  );
}
