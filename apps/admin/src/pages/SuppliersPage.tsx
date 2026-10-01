import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlugZap, RefreshCw } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  Field,
  KeyValue,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  StatusBadge,
  formatDateTime,
  formatRelative,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

export function SuppliersPage() {
  return (
    <RequirePerm perm="suppliers:read">
      <Suppliers />
    </RequirePerm>
  );
}

function Suppliers() {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['suppliers'], queryFn: api.suppliers.list });
  const sync = useMutation({
    mutationFn: api.suppliers.sync,
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] });
      void qc.invalidateQueries({ queryKey: ['supplier-calls'] });
      toast.success(
        'Sync complete',
        `${r.products} products, ${r.departures} departures in ${r.durationMs} ms.`,
      );
    },
    onError: (e) => toast.error('Sync failed', errorMessage(e)),
  });
  const status = useMutation({
    mutationFn: ({ id, s }: { id: string; s: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' }) =>
      api.suppliers.setStatus(id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const accounts = useQuery({
    queryKey: ['accounting', 'options'],
    queryFn: api.accounting.options,
    enabled: can('ledger:read'),
  });
  const payables = (accounts.data ?? []).filter((a) => a.class === 'LIABILITY');
  const payable = useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string | null }) =>
      api.suppliers.setPayable(id, accountId),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(
        'Payable account saved',
        s?.payableAccount && s.payableAccount.currency !== 'PKR'
          ? `New bookings post in ${s.payableAccount.currency} at the latest rate.`
          : 'New bookings post in PKR.',
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Inventory sources. Inventory syncs automatically every 15 minutes; you can also sync now."
      />
      <div className="space-y-6">
        {q.data.map((s) => (
          <div key={s.id} className="space-y-6">
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {s.name} <StatusBadge status={s.status} />{' '}
                    {s.mode === 'mock' && <Badge tone="warning">Mock API</Badge>}
                  </span>
                }
                icon={<PlugZap className="size-5" />}
                actions={
                  can('suppliers:sync') && (
                    <>
                      <Select
                        className="h-8 w-40"
                        value={s.status}
                        onChange={(e) => status.mutate({ id: s.id, s: e.target.value as 'ACTIVE' })}
                        aria-label="Supplier status"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="MAINTENANCE">Maintenance (hide products)</option>
                        <option value="INACTIVE">Inactive</option>
                      </Select>
                      <Button size="sm" onClick={() => sync.mutate(s.id)} loading={sync.isPending}>
                        <RefreshCw /> Sync now
                      </Button>
                    </>
                  )
                }
              />
              <CardBody className="space-y-4">
                {s.mode === 'mock' && (
                  <Alert tone="warning">
                    Using the built-in mock AirDesk adapter. Bookings are confirmed by the mock, not
                    the airline. Switch to the live adapter once AirDesk sandbox credentials are
                    available.
                  </Alert>
                )}
                <KeyValue
                  columns={3}
                  items={[
                    { label: 'Adapter', value: s.adapterKey },
                    { label: 'Products', value: s.productsCount },
                    {
                      label: 'Last sync',
                      value: s.lastSyncAt
                        ? `${formatRelative(s.lastSyncAt)} (${s.lastSyncStatus})`
                        : 'Never',
                    },
                    {
                      label: 'Bills in',
                      value: s.payableAccount?.currency ?? 'PKR',
                    },
                    { label: 'Calls (24h)', value: s.calls24h },
                    {
                      label: 'Failures (24h)',
                      value: (
                        <span className={s.failures24h ? 'text-danger' : ''}>{s.failures24h}</span>
                      ),
                    },
                  ]}
                />
                {can('ledger:coa') && payables.length > 0 && (
                  <Field
                    label="Payable account"
                    hint="Confirmed bookings are credited here. Pick a SAR (or other foreign) account if this supplier bills in that currency; the cost is posted at the latest rate from Accounting → Setup."
                    className="max-w-md"
                  >
                    <Select
                      value={s.payableAccount?.id ?? ''}
                      disabled={payable.isPending}
                      onChange={(e) =>
                        payable.mutate({ id: s.id, accountId: e.target.value || null })
                      }
                    >
                      <option value="">Supplier payables (PKR, default)</option>
                      {payables.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.name} ({a.currency})
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </CardBody>
            </Card>
            <CallLog supplierId={s.id} />
          </div>
        ))}
      </div>
    </>
  );
}

function CallLog({ supplierId }: { supplierId: string }) {
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const q = useQuery({
    queryKey: ['supplier-calls', supplierId, page, failed],
    queryFn: () =>
      api.suppliers.calls(supplierId, { page, pageSize: 20, failed: failed ? 'true' : undefined }),
    placeholderData: keepPreviousData,
  });
  return (
    <Card>
      <CardHeader
        title="Call log"
        description="Requests are logged with passport numbers redacted."
        actions={
          <Select
            className="h-8 w-36"
            value={failed ? 'failed' : 'all'}
            onChange={(e) => {
              setFailed(e.target.value === 'failed');
              setPage(1);
            }}
            aria-label="Filter"
          >
            <option value="all">All calls</option>
            <option value="failed">Failures only</option>
          </Select>
        }
      />
      <DataTable
        dense
        rows={q.data?.items}
        loading={q.isLoading}
        rowKey={(c) => c.id}
        columns={[
          { key: 't', header: 'Time', cell: (c) => formatDateTime(c.createdAt) },
          {
            key: 'o',
            header: 'Operation',
            cell: (c) => <span className="font-medium">{c.operation}</span>,
          },
          {
            key: 'r',
            header: 'Result',
            cell: (c) =>
              c.errorKind ? (
                <Badge tone="danger">{c.errorKind}</Badge>
              ) : (
                <Badge tone="success">OK</Badge>
              ),
          },
          { key: 'd', header: 'Duration', align: 'right', cell: (c) => `${c.durationMs} ms` },
          {
            key: 'x',
            header: 'Details',
            hideBelow: 'md',
            cell: (c) => (
              <details>
                <summary className="cursor-pointer text-xs text-link">View</summary>
                <pre className="mt-1 max-h-48 max-w-xl overflow-auto rounded bg-surface-sunken p-2 text-[11px]">
                  {JSON.stringify({ request: c.requestBody, response: c.responseBody }, null, 2)}
                </pre>
              </details>
            ),
          },
        ]}
      />
      {q.data && <Pagination page={page} pageSize={20} total={q.data.total} onChange={setPage} />}
    </Card>
  );
}
