import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plane, Plus, Snowflake, Ticket, Unlock } from 'lucide-react';
import type { AdminInventoryLotSummary, GroupPnrDto } from '@gnk/types';
import {
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  ErrorState,
  Field,
  Input,
  KeyValue,
  Money,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
  formatDateTime,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { RequirePerm } from '@/components/guards';
import { useCan } from '@/lib/useCan';

export function InventoryGroupDetailPage() {
  return (
    <RequirePerm perm="bookings:read">
      <GroupDetail />
    </RequirePerm>
  );
}

function GroupDetail() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [lotOpen, setLotOpen] = useState(false);
  const [pnrLot, setPnrLot] = useState<AdminInventoryLotSummary | null>(null);

  const q = useQuery({
    queryKey: ['admin-inventory-group', groupId],
    queryFn: () => api.inventory.groups.get(groupId),
    enabled: !!groupId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-inventory-group', groupId] });
    void qc.invalidateQueries({ queryKey: ['admin-inventory-groups'] });
  };

  const setStatus = useMutation({
    mutationFn: (status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED') =>
      api.inventory.groups.update(groupId, { status }),
    onSuccess: (g) => {
      qc.setQueryData(['admin-inventory-group', groupId], g);
      invalidate();
      toast.success(`Group is now ${g.status.toLowerCase()}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setLotStatus = useMutation({
    mutationFn: ({ lotId, status }: { lotId: string; status: 'OPEN' | 'FROZEN' | 'CLOSED' }) =>
      api.inventory.groups.updateLotStatus(lotId, status),
    onSuccess: (g) => {
      qc.setQueryData(['admin-inventory-group', groupId], g);
      toast.success('Lot updated');
    },
    onError: (e) => toast.error(errorMessage(e)),
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
              { label: 'Inventory groups', onClick: () => navigate('/inventory-groups') },
              { label: g.code },
            ]}
          />
        }
        title={g.name}
        description={`${g.airline ?? 'Airline'} · ${g.sector ?? 'Sector TBD'} · Payment window ${g.paymentDeadlineHours}h`}
        meta={<StatusBadge status={g.status} />}
        actions={
          can('bookings:approve') && (
            <>
              {g.status !== 'ACTIVE' && (
                <Button
                  variant="secondary"
                  onClick={() => setStatus.mutate('ACTIVE')}
                  loading={setStatus.isPending}
                >
                  Activate
                </Button>
              )}
              {g.status === 'ACTIVE' && (
                <Button
                  variant="secondary"
                  onClick={() => setStatus.mutate('SUSPENDED')}
                  loading={setStatus.isPending}
                >
                  Suspend
                </Button>
              )}
              {g.status !== 'CLOSED' && (
                <Button
                  variant="danger-outline"
                  onClick={() => setStatus.mutate('CLOSED')}
                  loading={setStatus.isPending}
                >
                  Close
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Itinerary"
              icon={<Plane className="size-4" />}
              actions={
                can('bookings:approve') && (
                  <Button size="sm" variant="secondary" onClick={() => setSegmentOpen(true)}>
                    <Plus /> Add segment
                  </Button>
                )
              }
            />
            <CardBody className="space-y-3">
              {g.legs.length === 0 && (
                <p className="text-sm text-muted-foreground">No flight segments yet.</p>
              )}
              {g.legs.map((leg) => (
                <div
                  key={leg.segmentId}
                  className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
                >
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
            <CardHeader
              title="Lots (cabins)"
              description="Fare buckets partners can book from."
              actions={
                can('bookings:approve') &&
                g.legs.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={() => setLotOpen(true)}>
                    <Plus /> Add lot
                  </Button>
                )
              }
            />
            <ul className="divide-y">
              {g.lots.length === 0 && (
                <li className="p-5 text-sm text-muted-foreground">No lots yet.</li>
              )}
              {g.lots.map((lot) => (
                <li
                  key={lot.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-semibold">
                      {lot.cabinClass} · {lot.bucketCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lot.seatsTotal ?? '—'} total seats · {lot.seatsAvailable ?? '—'} left ·{' '}
                      {lot.pnrs?.length ?? 0} PNR{lot.pnrs?.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lot.fareAmount != null && (
                      <Money value={lot.fareAmount} className="font-semibold" />
                    )}
                    <StatusBadge status={lot.status} />
                    <Button size="xs" variant="secondary" onClick={() => setPnrLot(lot)}>
                      <Ticket /> PNRs
                    </Button>
                    {can('bookings:approve') && (
                      <>
                        {lot.status !== 'OPEN' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setLotStatus.mutate({ lotId: lot.id, status: 'OPEN' })}
                            loading={setLotStatus.isPending}
                          >
                            <Unlock /> Open
                          </Button>
                        )}
                        {lot.status === 'OPEN' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setLotStatus.mutate({ lotId: lot.id, status: 'FROZEN' })}
                            loading={setLotStatus.isPending}
                          >
                            <Snowflake /> Freeze
                          </Button>
                        )}
                        {lot.status !== 'CLOSED' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setLotStatus.mutate({ lotId: lot.id, status: 'CLOSED' })}
                            loading={setLotStatus.isPending}
                          >
                            <Lock /> Close
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Group settings" />
            <CardBody>
              <KeyValue
                columns={1}
                items={[
                  { label: 'Currency', value: g.currency },
                  { label: 'Payment window', value: `${g.paymentDeadlineHours}h` },
                  { label: 'Show seats to partners', value: g.showAvailableSeats ? 'Yes' : 'No' },
                ]}
              />
              {g.description && (
                <p className="mt-3 text-sm text-muted-foreground">{g.description}</p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      <AddSegmentDialog groupId={groupId} open={segmentOpen} onOpenChange={setSegmentOpen} />
      <AddLotDialog
        groupId={groupId}
        legs={g.legs}
        currency={g.currency}
        open={lotOpen}
        onOpenChange={setLotOpen}
      />
      <PnrEditorDialog lot={pnrLot} onOpenChange={() => setPnrLot(null)} />
    </>
  );
}

function AddSegmentDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [flightNo, setFlightNo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departAt, setDepartAt] = useState('');
  const [arriveAt, setArriveAt] = useState('');
  const [direction, setDirection] = useState<'OUTBOUND' | 'INBOUND' | 'SINGLE'>('OUTBOUND');

  useEffect(() => {
    if (open) {
      setFlightNo('');
      setFrom('');
      setTo('');
      setDepartAt('');
      setArriveAt('');
      setDirection('OUTBOUND');
    }
  }, [open]);

  const add = useMutation({
    mutationFn: () =>
      api.inventory.groups.addSegment(groupId, {
        marketingFlightNumber: flightNo.trim(),
        departureAirport: from.trim().toUpperCase(),
        arrivalAirport: to.trim().toUpperCase(),
        departureTimeUtc: departAt,
        arrivalTimeUtc: arriveAt,
        legDirection: direction,
      }),
    onSuccess: (g) => {
      qc.setQueryData(['admin-inventory-group', groupId], g);
      toast.success('Segment added');
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const valid =
    flightNo.trim() && from.trim().length === 3 && to.trim().length === 3 && departAt && arriveAt;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add flight segment"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={add.isPending}>
            Cancel
          </Button>
          <Button onClick={() => add.mutate()} loading={add.isPending} disabled={!valid}>
            Add segment
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Flight number" required>
          <Input
            value={flightNo}
            onChange={(e) => setFlightNo(e.target.value)}
            placeholder="SV-711"
          />
        </Field>
        <Field label="Direction">
          <Select
            value={direction}
            onChange={(e) => setDirection(e.target.value as typeof direction)}
          >
            <option value="OUTBOUND">Outbound</option>
            <option value="INBOUND">Inbound</option>
            <option value="SINGLE">Single</option>
          </Select>
        </Field>
        <Field label="From (IATA)" required>
          <Input
            className="uppercase"
            maxLength={3}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="KHI"
          />
        </Field>
        <Field label="To (IATA)" required>
          <Input
            className="uppercase"
            maxLength={3}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="JED"
          />
        </Field>
        <Field label="Departs (UTC)" required>
          <Input
            type="datetime-local"
            value={departAt}
            onChange={(e) => setDepartAt(e.target.value)}
          />
        </Field>
        <Field label="Arrives (UTC)" required>
          <Input
            type="datetime-local"
            value={arriveAt}
            onChange={(e) => setArriveAt(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
}

function AddLotDialog({
  groupId,
  legs,
  currency,
  open,
  onOpenChange,
}: {
  groupId: string;
  legs: { segmentId: string; flightNo: string; from: string; to: string }[];
  currency: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [segmentId, setSegmentId] = useState('');
  const [bucketCode, setBucketCode] = useState('');
  const [cabinClass, setCabinClass] = useState<
    'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
  >('ECONOMY');
  const [seatsTotal, setSeatsTotal] = useState(20);
  const [childSeatsTotal, setChildSeatsTotal] = useState(0);
  const [infantSeatsTotal, setInfantSeatsTotal] = useState(0);
  const [fareAmount, setFareAmount] = useState(0);
  const [costAmount, setCostAmount] = useState(0);
  const [childFareAmount, setChildFareAmount] = useState(0);
  const [infantFareAmount, setInfantFareAmount] = useState(0);

  useEffect(() => {
    if (open) {
      setSegmentId(legs[0]?.segmentId ?? '');
      setBucketCode('');
      setCabinClass('ECONOMY');
      setSeatsTotal(20);
      setChildSeatsTotal(0);
      setInfantSeatsTotal(0);
      setFareAmount(0);
      setCostAmount(0);
      setChildFareAmount(0);
      setInfantFareAmount(0);
    }
  }, [open, legs]);

  const create = useMutation({
    mutationFn: () =>
      api.inventory.groups.createLot(groupId, {
        flightSegmentId: segmentId,
        bucketCode: bucketCode.trim(),
        cabinClass,
        seatsTotal,
        childSeatsTotal: childSeatsTotal || undefined,
        infantSeatsTotal: infantSeatsTotal || undefined,
        fareAmount,
        costAmount: costAmount || undefined,
        childFareAmount: childFareAmount || undefined,
        infantFareAmount: infantFareAmount || undefined,
        fareCurrency: currency,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-inventory-group', groupId] });
      toast.success('Lot created');
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const valid = segmentId && bucketCode.trim() && seatsTotal > 0 && fareAmount > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add lot"
      description="A fare bucket for one cabin on one segment."
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!valid}>
            Create lot
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Segment" required>
          <Select value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
            {legs.map((l) => (
              <option key={l.segmentId} value={l.segmentId}>
                {l.flightNo} {l.from}-{l.to}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cabin class">
          <Select
            value={cabinClass}
            onChange={(e) => setCabinClass(e.target.value as typeof cabinClass)}
          >
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM_ECONOMY">Premium economy</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">First</option>
          </Select>
        </Field>
        <Field label="Bucket code" required>
          <Input
            value={bucketCode}
            onChange={(e) => setBucketCode(e.target.value)}
            placeholder="Q"
          />
        </Field>
        <Field label={`Fare (${currency})`} required>
          <Input
            type="number"
            min={0}
            value={fareAmount}
            onChange={(e) => setFareAmount(Number(e.target.value))}
          />
        </Field>
        <Field label="Adult seats" required>
          <Input
            type="number"
            min={1}
            value={seatsTotal}
            onChange={(e) => setSeatsTotal(Number(e.target.value))}
          />
        </Field>
        <Field label={`Cost / seat (${currency})`}>
          <Input
            type="number"
            min={0}
            value={costAmount}
            onChange={(e) => setCostAmount(Number(e.target.value))}
          />
        </Field>
        <Field label="Child seats">
          <Input
            type="number"
            min={0}
            value={childSeatsTotal}
            onChange={(e) => setChildSeatsTotal(Number(e.target.value))}
          />
        </Field>
        <Field label={`Child fare (${currency})`}>
          <Input
            type="number"
            min={0}
            value={childFareAmount}
            onChange={(e) => setChildFareAmount(Number(e.target.value))}
          />
        </Field>
        <Field label="Infant seats">
          <Input
            type="number"
            min={0}
            value={infantSeatsTotal}
            onChange={(e) => setInfantSeatsTotal(Number(e.target.value))}
          />
        </Field>
        <Field label={`Infant fare (${currency})`}>
          <Input
            type="number"
            min={0}
            value={infantFareAmount}
            onChange={(e) => setInfantFareAmount(Number(e.target.value))}
          />
        </Field>
      </div>
    </Dialog>
  );
}

type PnrRow = {
  pnrCode: string;
  allocatedSeats: number;
  paxKind: 'ADULT' | 'CHILD' | 'INFANT' | null;
};

function PnrEditorDialog({
  lot,
  onOpenChange,
}: {
  lot: AdminInventoryLotSummary | null;
  onOpenChange: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rows, setRows] = useState<PnrRow[]>([]);

  useEffect(() => {
    if (lot) {
      setRows(
        (lot.pnrs ?? []).map((p: GroupPnrDto) => ({
          pnrCode: p.pnrCode,
          allocatedSeats: p.allocatedSeats,
          paxKind: p.paxKind,
        })),
      );
    }
  }, [lot]);

  const save = useMutation({
    mutationFn: () => {
      if (!lot) throw new Error('No lot selected');
      return api.inventory.groups.upsertPnrs(
        lot.id,
        rows
          .filter((r) => r.pnrCode.trim())
          .map((r, i) => ({
            pnrCode: r.pnrCode.trim().toUpperCase(),
            allocatedSeats: r.allocatedSeats,
            sortOrder: i,
            paxKind: r.paxKind,
          })),
      );
    },
    onSuccess: () => {
      if (lot) void qc.invalidateQueries({ queryKey: ['admin-inventory-group'] });
      toast.success('PNRs saved');
      onOpenChange();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setRow = (i: number, patch: Partial<PnrRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Dialog
      open={!!lot}
      onOpenChange={(o) => !o && onOpenChange()}
      title={lot ? `PNRs — ${lot.cabinClass} · ${lot.bucketCode}` : ''}
      description="Airline PNR blocks feeding this lot. Seats are allocated greedily in the order below."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onOpenChange} disabled={save.isPending}>
            Close
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Save PNRs
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_100px_110px_auto] items-end gap-2">
            <Field label="PNR code">
              <Input
                className="uppercase font-mono"
                value={r.pnrCode}
                onChange={(e) => setRow(i, { pnrCode: e.target.value })}
              />
            </Field>
            <Field label="Seats">
              <Input
                type="number"
                min={1}
                value={r.allocatedSeats}
                onChange={(e) => setRow(i, { allocatedSeats: Number(e.target.value) })}
              />
            </Field>
            <Field label="Pax kind">
              <Select
                value={r.paxKind ?? ''}
                onChange={(e) =>
                  setRow(i, { paxKind: (e.target.value || null) as PnrRow['paxKind'] })
                }
              >
                <option value="">Any</option>
                <option value="ADULT">Adult</option>
                <option value="CHILD">Child</option>
                <option value="INFANT">Infant</option>
              </Select>
            </Field>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setRows((rs) => [...rs, { pnrCode: '', allocatedSeats: 1, paxKind: null }])
          }
        >
          <Plus /> Add PNR row
        </Button>
      </div>
    </Dialog>
  );
}
