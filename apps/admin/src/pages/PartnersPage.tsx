import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Tabs,
  formatDate,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { RequirePerm } from '@/components/guards';

const TABS = [
  { value: 'PENDING', label: 'Awaiting review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DRAFT', label: 'Not submitted' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export function PartnersPage() {
  return (
    <RequirePerm perm="partners:read">
      <Partners />
    </RequirePerm>
  );
}

function Partners() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const q = {
    status: params.get('status') ?? 'PENDING',
    q: params.get('q') || undefined,
    type: params.get('type') || undefined,
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };
  const counts = useQuery({ queryKey: ['partner-counts'], queryFn: api.partners.counts });
  const list = useQuery({
    queryKey: ['partners', q],
    queryFn: () => api.partners.list(q),
    placeholderData: keepPreviousData,
  });

  const set = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => {
    const t = setTimeout(
      () => text !== (params.get('q') ?? '') && set('q', text.trim() || undefined),
      350,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <>
      <PageHeader
        title="Partners"
        description="Travel agencies and individual agents. Review new applications and manage credit."
      />
      <Card>
        <div className="px-4">
          <Tabs
            value={q.status}
            onChange={(v) => set('status', v)}
            items={TABS.map((t) => ({
              ...t,
              count: counts.data?.[t.value] ?? (t.value === 'all' ? counts.data?.all : 0),
            }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <SearchInput
            placeholder="Name, code, email or city"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-w-[16rem] flex-1"
          />
          <Select
            className="w-40 shrink-0"
            value={q.type ?? 'ALL'}
            onChange={(e) => set('type', e.target.value === 'ALL' ? undefined : e.target.value)}
            aria-label="Type"
          >
            <option value="ALL">All types</option>
            <option value="AGENCY">Agency</option>
            <option value="INDIVIDUAL">Individual</option>
          </Select>
        </div>
        {list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataTable
              rows={list.data?.items}
              loading={list.isLoading}
              rowKey={(p) => p.id}
              onRowClick={(p) => navigate(`/partners/${p.id}`)}
              empty={<EmptyState icon={<Building2 />} title="No partners here" />}
              columns={[
                {
                  key: 'n',
                  header: 'Partner',
                  cell: (p) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.legalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.code} · {p.city}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 't',
                  header: 'Type',
                  hideBelow: 'sm',
                  cell: (p) => (
                    <Badge tone={p.type === 'AGENCY' ? 'primary' : 'neutral'}>
                      {p.type === 'AGENCY' ? 'Agency' : 'Individual'}
                    </Badge>
                  ),
                },
                {
                  key: 'c',
                  header: 'Owner',
                  hideBelow: 'md',
                  cell: (p) => (
                    <div className="min-w-0">
                      <p className="truncate">{p.ownerName}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  ),
                },
                {
                  key: 'b',
                  header: 'Bookings',
                  align: 'right',
                  hideBelow: 'lg',
                  cell: (p) => p.bookingsCount,
                },
                {
                  key: 'bal',
                  header: 'Balance',
                  align: 'right',
                  hideBelow: 'lg',
                  cell: (p) => <Money value={p.balance} signed />,
                },
                {
                  key: 'd',
                  header: 'Joined',
                  hideBelow: 'xl',
                  cell: (p) => formatDate(p.createdAt),
                },
                {
                  key: 's',
                  header: 'Status',
                  align: 'right',
                  cell: (p) => <StatusBadge status={p.status} />,
                },
              ]}
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
    </>
  );
}
