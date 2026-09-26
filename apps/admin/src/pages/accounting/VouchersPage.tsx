import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, FilePlus2, ReceiptText, Wallet } from 'lucide-react';
import type { VoucherType } from '@gnk/types';
import {
  Badge,
  Button,
  Card,
  DataTable,
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  EmptyState,
  ErrorState,
  Input,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  StatusBadge,
  formatDate,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  SALE: 'Sale',
  RECEIPT: 'Receipt',
  PAYMENT: 'Payment',
  JOURNAL: 'Journal',
  REVERSAL: 'Reversal',
  ADJUSTMENT: 'Adjustment',
};

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'SUBMITTED', label: 'Awaiting approval' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'REJECTED', label: 'Returned' },
  { value: 'POSTED', label: 'Posted' },
] as const;
type StatusTab = (typeof STATUS_TABS)[number]['value'];

export function VouchersPage() {
  return (
    <RequirePerm perm="ledger:read">
      <Vouchers />
    </RequirePerm>
  );
}

function Vouchers() {
  const navigate = useNavigate();
  const can = useCan();
  const [status, setStatus] = useState<StatusTab>('all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const counts = useQuery({
    queryKey: ['accounting', 'voucher-counts'],
    queryFn: api.accounting.voucherCounts,
  });
  const q = useQuery({
    queryKey: ['accounting', 'vouchers', { status, type, search, from, to, page }],
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

  const canJv = can('ledger:jv_prepare');
  const canPost = can('ledger:post');

  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Every posting to the books: sales, receipts, payments, journals and reversals."
        actions={
          (canJv || canPost) && (
            <DropdownMenu>
              <DropdownTrigger asChild>
                <Button>
                  <FilePlus2 /> New voucher <ChevronDown className="opacity-70" />
                </Button>
              </DropdownTrigger>
              <DropdownContent className="w-56">
                {canJv && (
                  <DropdownItem onSelect={() => navigate('/accounting/vouchers/new?type=JOURNAL')}>
                    <FilePlus2 /> Journal voucher (JV)
                  </DropdownItem>
                )}
                {canPost && (
                  <>
                    <DropdownItem
                      onSelect={() => navigate('/accounting/vouchers/new?type=PAYMENT')}
                    >
                      <Wallet /> Payment voucher (PV)
                    </DropdownItem>
                    <DropdownItem
                      onSelect={() => navigate('/accounting/vouchers/new?type=RECEIPT')}
                    >
                      <ReceiptText /> Receipt voucher (RV)
                    </DropdownItem>
                  </>
                )}
              </DropdownContent>
            </DropdownMenu>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          items={STATUS_TABS.map((t) => ({
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
          <Select
            className="w-auto"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            aria-label="Type"
          >
            <option value="all">All types</option>
            {Object.entries(VOUCHER_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
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
              onRowClick={(v) => navigate(`/accounting/vouchers/${v.id}`)}
              empty={<EmptyState icon={<ReceiptText />} title="No vouchers match" />}
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
                  key: 't',
                  header: 'Type',
                  hideBelow: 'md',
                  cell: (v) => <Badge>{VOUCHER_TYPE_LABEL[v.type]}</Badge>,
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
