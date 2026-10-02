import { useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FilePlus2, ReceiptText } from 'lucide-react';
import type { VoucherType } from '@gnk/types';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  StatusBadge,
  formatDate,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';
import { useVoucherOverlays } from './voucher-overlay-context';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'SUBMITTED', label: 'Awaiting approval' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'REJECTED', label: 'Returned' },
  { value: 'POSTED', label: 'Posted' },
] as const;
type StatusTab = (typeof STATUS_TABS)[number]['value'];

export function VoucherRegister({
  type,
  title,
  description,
  newLabel,
  emptyTitle,
  hideHeader,
  actions,
}: {
  type: Extract<VoucherType, 'JOURNAL' | 'PAYMENT' | 'RECEIPT'>;
  title: string;
  description: string;
  newLabel?: string;
  emptyTitle?: string;
  hideHeader?: boolean;
  actions?: ReactNode;
}) {
  const overlays = useVoucherOverlays();
  const can = useCan();
  const [status, setStatus] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const counts = useQuery({
    queryKey: ['accounting', 'voucher-counts', type],
    queryFn: () => api.accounting.voucherCounts(type),
  });
  const q = useQuery({
    queryKey: ['accounting', 'vouchers', { type, status, search, from, to, page }],
    queryFn: () =>
      api.accounting.vouchers({
        status,
        type,
        q: search || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: 25,
      }),
    placeholderData: keepPreviousData,
  });

  const canCreate = type === 'JOURNAL' ? can('ledger:jv_prepare') : can('ledger:post');
  const showSubmitted = type === 'JOURNAL';
  const tabs = STATUS_TABS.filter((t) => showSubmitted || t.value !== 'SUBMITTED');

  return (
    <>
      {!hideHeader && (
        <PageHeader
          title={title}
          description={description}
          actions={
            actions ??
            (canCreate && newLabel && (
              <Button onClick={() => overlays.openNew(type)}>
                <FilePlus2 /> {newLabel}
              </Button>
            ))
          }
        />
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          items={tabs.map((t) => ({
            ...t,
            count:
              t.value === 'SUBMITTED' || t.value === 'REJECTED' || t.value === 'DRAFT'
                ? counts.data?.[t.value]
                : undefined,
          }))}
        />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 p-4">
          <SearchInput
            className="w-full max-w-xs"
            placeholder="Number or narration"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            className="w-auto"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From"
          />
          <Input
            type="date"
            className="w-auto"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To"
          />
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <DataTable
              rows={q.data?.items}
              loading={q.isLoading}
              rowKey={(v) => v.id}
              onRowClick={(v) => overlays.openView(v.id)}
              empty={
                <EmptyState
                  icon={<ReceiptText />}
                  title={emptyTitle ?? `No ${title.toLowerCase()} match`}
                />
              }
              columns={[
                { key: 'd', header: 'Date', cell: (v) => formatDate(v.date) },
                {
                  key: 'r',
                  header: 'Number',
                  cell: (v) => (
                    <span className="tabular font-medium">
                      {v.reference.startsWith('DRAFT-') ? (
                        <span className="text-muted-foreground">Unnumbered</span>
                      ) : (
                        v.reference
                      )}
                    </span>
                  ),
                },
                {
                  key: 'n',
                  header: 'Narration',
                  cell: (v) => (
                    <div className="min-w-0 max-w-md">
                      <p className="truncate">{v.description}</p>
                      {v.partnerName && (
                        <p className="truncate text-xs text-muted-foreground">{v.partnerName}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'a',
                  header: 'Amount',
                  align: 'right',
                  cell: (v) => <Money value={v.total} decimals />,
                },
                {
                  key: 's',
                  header: 'Status',
                  cell: (v) =>
                    v.reversed ? (
                      <Badge tone="neutral" dot>
                        Reversed
                      </Badge>
                    ) : (
                      <StatusBadge
                        status={v.status}
                        label={
                          v.status === 'SUBMITTED'
                            ? 'Awaiting approval'
                            : v.status === 'REJECTED'
                              ? 'Returned'
                              : undefined
                        }
                      />
                    ),
                },
                {
                  key: 'p',
                  header: 'Prepared by',
                  hideBelow: 'lg',
                  cell: (v) => (
                    <span className="text-muted-foreground">{v.createdBy?.name ?? 'System'}</span>
                  ),
                },
              ]}
            />
            {q.data && (
              <Pagination page={page} pageSize={25} total={q.data.total} onChange={setPage} />
            )}
          </>
        )}
      </Card>
    </>
  );
}

export function JournalVouchersPage() {
  return (
    <RequirePerm perm="ledger:read">
      <VoucherRegister
        type="JOURNAL"
        title="Vouchers"
        description="Journal vouchers that transfer amounts between accounts. Payments and receipts have their own modules."
        newLabel="New journal voucher"
        emptyTitle="No journal vouchers match"
      />
    </RequirePerm>
  );
}

export function ReceiptsPage() {
  return (
    <RequirePerm perm="ledger:read">
      <VoucherRegister
        type="RECEIPT"
        title="Receipts"
        description="Money received into cash or bank, including receipts issued when a partner deposit is approved."
        newLabel="New receipt"
        emptyTitle="No receipts match"
      />
    </RequirePerm>
  );
}

export { VOUCHER_TYPE_LABEL } from './voucher-home';
