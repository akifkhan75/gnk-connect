import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Eye, EyeOff, Star } from 'lucide-react';
import { PRODUCT_TYPES, type AdminProductDetailDto } from '@gnk/types';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  KeyValue,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatusBadge,
  formatDate,
  formatRelative,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

export function CatalogPage() {
  return (
    <RequirePerm perm="catalog:read">
      <Catalog />
    </RequirePerm>
  );
}

function Catalog() {
  const [filters, setFilters] = useState({ q: '', type: 'all', published: 'all', page: 1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.catalog.list({ ...filters, q: filters.q || undefined, pageSize: 25 }),
    placeholderData: keepPreviousData,
  });
  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  return (
    <>
      <PageHeader
        title="Products"
        description="Inventory synced from suppliers. New products stay hidden from partners until you publish them."
      />
      <Card>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
          <SearchInput
            placeholder="Title, sector, airline or destination"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
          <Select
            value={filters.type}
            onChange={(e) => set({ type: e.target.value })}
            aria-label="Type"
          >
            <option value="all">All types</option>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </Select>
          <Select
            value={filters.published}
            onChange={(e) => set({ published: e.target.value })}
            aria-label="Visibility"
          >
            <option value="all">Published and hidden</option>
            <option value="yes">Published</option>
            <option value="no">Hidden</option>
          </Select>
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <DataTable
              rows={q.data?.items}
              loading={q.isLoading}
              rowKey={(p) => p.id}
              selectedKey={openId}
              onRowClick={(p) => setOpenId(p.id)}
              empty={
                <EmptyState
                  icon={<Boxes />}
                  title="No products"
                  description="Run a supplier sync to import inventory."
                />
              }
              columns={[
                {
                  key: 't',
                  header: 'Product',
                  cell: (p) => (
                    <div>
                      <p className="flex items-center gap-1.5 font-medium">
                        {p.isFeatured && (
                          <Star className="size-3.5 fill-highlight text-highlight" />
                        )}
                        {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.sector} · {p.airline}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'ty',
                  header: 'Type',
                  hideBelow: 'md',
                  cell: (p) => (
                    <Badge tone={p.type === 'UMRAH' ? 'gold' : 'primary'}>
                      {titleCase(p.type)}
                    </Badge>
                  ),
                },
                {
                  key: 'd',
                  header: 'Departures',
                  align: 'right',
                  hideBelow: 'sm',
                  cell: (p) => p.departuresCount,
                },
                {
                  key: 'n',
                  header: 'Next',
                  hideBelow: 'lg',
                  cell: (p) => formatDate(p.nextDeparture),
                },
                {
                  key: 's',
                  header: 'Seats',
                  align: 'right',
                  hideBelow: 'lg',
                  cell: (p) => p.seatsAvailable,
                },
                {
                  key: 'v',
                  header: 'Visibility',
                  align: 'right',
                  cell: (p) =>
                    p.isPublished ? (
                      <Badge tone="success" dot>
                        Published
                      </Badge>
                    ) : (
                      <Badge dot>Hidden</Badge>
                    ),
                },
              ]}
            />
            {q.data && (
              <Pagination
                page={filters.page}
                pageSize={25}
                total={q.data.total}
                onChange={(page) => setFilters((f) => ({ ...f, page }))}
              />
            )}
          </>
        )}
      </Card>
      <Drawer
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
        title="Product"
        width="max-w-4xl"
      >
        {openId && <ProductDetail id={openId} />}
      </Drawer>
    </>
  );
}

function ProductDetail({ id }: { id: string }) {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['product', id], queryFn: () => api.catalog.get(id) });
  const toggle = useMutation({
    mutationFn: (dto: { isPublished?: boolean; isFeatured?: boolean }) =>
      api.catalog.setVisibility(id, dto),
    onSuccess: (p: AdminProductDetailDto) => {
      qc.setQueryData(['product', id], p);
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(p.isPublished ? 'Visible to partners' : 'Hidden from partners');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner className="py-20" />;
  const p = q.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{p.title}</h2>
          <p className="text-sm text-muted-foreground">
            {p.supplierName} · synced {formatRelative(p.syncedAt)}
          </p>
        </div>
        {can('catalog:publish') && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => toggle.mutate({ isFeatured: !p.isFeatured })}
            >
              <Star className={p.isFeatured ? 'fill-highlight text-highlight' : ''} />{' '}
              {p.isFeatured ? 'Unfeature' : 'Feature'}
            </Button>
            <Button
              variant={p.isPublished ? 'danger-outline' : 'primary'}
              onClick={() => toggle.mutate({ isPublished: !p.isPublished })}
              loading={toggle.isPending}
            >
              {p.isPublished ? (
                <>
                  <EyeOff /> Hide from partners
                </>
              ) : (
                <>
                  <Eye /> Publish
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      <Card>
        <CardBody>
          <KeyValue
            columns={3}
            items={[
              { label: 'Type', value: titleCase(p.type) },
              { label: 'Sector', value: p.sector },
              { label: 'Airline', value: p.airline },
              { label: 'Destination', value: p.destination },
              { label: 'Duration', value: p.durationDays && `${p.durationDays} days` },
              { label: 'Visibility', value: p.isPublished ? 'Published' : 'Hidden' },
              { label: 'Overview', value: p.content.overview, wide: true },
            ]}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Departures"
          description="Default price uses rules without partner-specific overrides."
        />
        <DataTable
          dense
          rows={p.departures}
          rowKey={(d) => d.id}
          columns={[
            {
              key: 'd',
              header: 'Departure',
              cell: (d) => <span className="font-medium">{formatDate(d.departureDate)}</span>,
            },
            { key: 'r', header: 'Return', hideBelow: 'sm', cell: (d) => formatDate(d.returnDate) },
            {
              key: 'a',
              header: 'Supplier seats',
              align: 'right',
              cell: (d) => `${d.supplierAvailable}/${d.totalSeats}`,
            },
            { key: 'h', header: 'GNK holds', align: 'right', cell: (d) => d.heldSeats },
            ...(p.departures[0]?.supplierNet != null
              ? [
                  {
                    key: 'n',
                    header: 'Net',
                    align: 'right' as const,
                    cell: (d: (typeof p.departures)[number]) => <Money value={d.supplierNet} />,
                  },
                ]
              : []),
            {
              key: 'p',
              header: 'Default price',
              align: 'right',
              cell: (d) => <Money value={d.defaultPrice} className="font-medium" />,
            },
            {
              key: 's',
              header: 'Status',
              align: 'right',
              cell: (d) => <StatusBadge status={d.status} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
