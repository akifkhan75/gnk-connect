import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlaneTakeoff, Plus } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Tabs,
  formatDate,
  useToast,
  type Column,
} from '@gnk/ui';
import type { InventoryGroupListItem } from '@gnk/types';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { RequirePerm } from '@/components/guards';
import { useCan } from '@/lib/useCan';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CLOSED', label: 'Closed' },
] as const;

export function InventoryGroupsPage() {
  return (
    <RequirePerm perm="bookings:read">
      <Groups />
    </RequirePerm>
  );
}

function Groups() {
  const can = useCan();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const q = {
    status: (params.get('status') ?? 'all') as (typeof TABS)[number]['value'],
    q: params.get('q') || undefined,
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };
  const list = useQuery({
    queryKey: ['admin-inventory-groups', q],
    queryFn: () =>
      api.inventory.groups.list({
        ...q,
        status: q.status === 'all' ? undefined : q.status,
      }),
    placeholderData: keepPreviousData,
  });

  const set = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => setText(params.get('q') ?? ''), [params]);
  useEffect(() => {
    const t = setTimeout(
      () => text !== (params.get('q') ?? '') && set('q', text.trim() || undefined),
      350,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const columns: Column<InventoryGroupListItem>[] = [
    {
      key: 'code',
      header: 'Group',
      cell: (g) => (
        <div>
          <p className="font-semibold tabular">{g.code}</p>
          <p className="text-xs text-muted-foreground">{g.name}</p>
        </div>
      ),
    },
    {
      key: 'sector',
      header: 'Sector',
      cell: (g) => (
        <div>
          <p className="font-medium">{g.sector ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{g.airline ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'dep',
      header: 'Departure',
      hideBelow: 'md',
      cell: (g) => (g.departureDate ? formatDate(g.departureDate) : '—'),
    },
    {
      key: 'lots',
      header: 'Lots',
      align: 'right',
      hideBelow: 'md',
      cell: (g) => g.lots.length,
    },
    {
      key: 'seats',
      header: 'Seats left',
      align: 'right',
      cell: (g) => g.seatsAvailable ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (g) => <StatusBadge status={g.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Inventory groups"
        description="Group-ticket seat pools (AirDesk): cabins, PNR blocks and freeze/close controls."
        actions={
          can('bookings:approve') && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> New group
            </Button>
          )
        }
      />
      <Card>
        <div className="px-4">
          <Tabs
            value={q.status}
            onChange={(v) => set('status', v === 'all' ? undefined : v)}
            items={[...TABS]}
          />
        </div>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)]">
          <SearchInput
            placeholder="Code, name, sector or airline"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        {list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.data?.items}
              loading={list.isLoading}
              rowKey={(g) => g.id}
              onRowClick={(g) => navigate(`/inventory-groups/${g.id}`)}
              empty={
                <EmptyState
                  icon={<PlaneTakeoff />}
                  title="No inventory groups yet"
                  description="Create one to start selling group-PNR seat blocks."
                />
              }
            />
            {list.data && (
              <Pagination
                page={q.page}
                pageSize={q.pageSize}
                total={list.data.total}
                onChange={(p) => set('page', String(p))}
              />
            )}
          </>
        )}
      </Card>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [airline, setAirline] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [paymentDeadlineHours, setPaymentDeadlineHours] = useState(48);

  useEffect(() => {
    if (open) {
      setCode('');
      setName('');
      setSector('');
      setAirline('');
      setCurrency('PKR');
      setPaymentDeadlineHours(48);
    }
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      api.inventory.groups.create({
        code: code.trim(),
        name: name.trim() || undefined,
        sector: sector.trim() || undefined,
        airline: airline.trim() || undefined,
        currency: currency.trim() || undefined,
        paymentDeadlineHours,
      }),
    onSuccess: (g) => {
      toast.success(`Group ${g.code} created`);
      void qc.invalidateQueries({ queryKey: ['admin-inventory-groups'] });
      onOpenChange(false);
      navigate(`/inventory-groups/${g.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New inventory group"
      description="A seat pool for a sector/airline that partners can book cabins from."
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!code.trim()}
          >
            Create group
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code" required>
          <Input
            className="uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="JED-GRP-01"
          />
        </Field>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jeddah Umrah block"
          />
        </Field>
        <Field label="Sector">
          <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="KHI-JED" />
        </Field>
        <Field label="Airline">
          <Input
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            placeholder="Saudia"
          />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="PKR">PKR</option>
            <option value="SAR">SAR</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
        <Field label="Payment deadline (hours after hold)">
          <Input
            type="number"
            min={1}
            max={168}
            value={paymentDeadlineHours}
            onChange={(e) => setPaymentDeadlineHours(Number(e.target.value))}
          />
        </Field>
      </div>
    </Dialog>
  );
}
