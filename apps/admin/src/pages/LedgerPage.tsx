import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale, ScrollText } from 'lucide-react';
import type { VoucherType } from '@gnk/types';
import { ledgerAdjustmentSchema, type LedgerAdjustmentInput } from '@gnk/validation';
import {
  Alert,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
  formatDate,
  formatMoney,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';
import { LedgerSheet } from '@/pages/accounting/LedgerSheet';
import { useVoucherOverlays } from '@/pages/accounting/voucher-overlay-context';

export function LedgerPage() {
  return (
    <RequirePerm perm="ledger:read">
      <Accounts />
    </RequirePerm>
  );
}

function Accounts() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const filters = {
    q: params.get('q') || undefined,
    status: params.get('status') ?? 'all',
    type: params.get('type') ?? 'ALL',
    balance: params.get('balance') ?? 'ALL',
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };
  const q = useQuery({
    queryKey: ['ledger-accounts', filters],
    queryFn: () => api.ledger.accounts(filters),
    placeholderData: keepPreviousData,
  });
  const set = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all' && v !== 'ALL') next.set(k, v);
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
  const hasFilters = !!(
    filters.q ||
    filters.status !== 'all' ||
    filters.type !== 'ALL' ||
    filters.balance !== 'ALL'
  );
  const owed = q.data?.items.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0) ?? 0;
  return (
    <>
      <PageHeader
        title="Partners"
        description="Negative balances are amounts partners owe GNK on credit."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Partners on this page owing"
          value={<Money value={Math.abs(owed)} />}
          tone="warning"
          icon={<Scale />}
        />
      </div>
      <Card>
        <div className="space-y-3 border-b border-border/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              className="min-w-[16rem] flex-1"
              placeholder="Name, code or city"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Select
              className="w-40 shrink-0"
              value={filters.status}
              onChange={(e) => set('status', e.target.value)}
              aria-label="Status"
            >
              <option value="all">All statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
            <Select
              className="w-40 shrink-0"
              value={filters.type}
              onChange={(e) => set('type', e.target.value)}
              aria-label="Type"
            >
              <option value="ALL">All types</option>
              <option value="AGENCY">Agency</option>
              <option value="INDIVIDUAL">Individual</option>
            </Select>
            <Select
              className="w-44 shrink-0"
              value={filters.balance}
              onChange={(e) => set('balance', e.target.value)}
              aria-label="Balance"
            >
              <option value="ALL">All balances</option>
              <option value="OWING">Owing</option>
              <option value="CREDIT">In credit</option>
              <option value="ZERO">Zero</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              {q.data
                ? q.data.total === 0
                  ? 'No partners'
                  : `Showing ${(filters.page - 1) * filters.pageSize + (q.data.items.length ? 1 : 0)}–${(filters.page - 1) * filters.pageSize + q.data.items.length} of ${q.data.total}`
                : ' '}
            </span>
            {hasFilters && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setText('');
                  setParams({}, { replace: true });
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <DataTable
              headerClassName="font-bold text-foreground"
              rows={q.data?.items}
              loading={q.isLoading}
              rowKey={(a) => a.id}
              onRowClick={(a) => navigate(`/ledger/${a.id}`)}
              empty={<EmptyState icon={<ScrollText />} title="No partners match" />}
              columns={[
                {
                  key: 'n',
                  header: 'Partner',
                  cell: (a) => (
                    <div>
                      <p className="font-medium">{a.legalName}</p>
                      <p className="text-xs text-muted-foreground">{a.code}</p>
                    </div>
                  ),
                },
                {
                  key: 's',
                  header: 'Status',
                  hideBelow: 'sm',
                  cell: (a) => <StatusBadge status={a.status} />,
                },
                {
                  key: 'c',
                  header: 'Credit limit',
                  align: 'right',
                  hideBelow: 'md',
                  cell: (a) => <Money value={a.creditLimit} />,
                },
                {
                  key: 'b',
                  header: 'Balance',
                  align: 'right',
                  cell: (a) => <Money value={a.balance} signed className="font-semibold" />,
                },
                {
                  key: 'av',
                  header: 'Available',
                  align: 'right',
                  hideBelow: 'lg',
                  cell: (a) => <Money value={a.balance + a.creditLimit} />,
                },
              ]}
            />
            {q.data && (
              <Pagination
                page={filters.page}
                pageSize={25}
                total={q.data.total}
                onChange={(p) => set('page', String(p))}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}

export function StatementPage() {
  return (
    <RequirePerm perm="ledger:read">
      <Statement />
    </RequirePerm>
  );
}

function Statement() {
  const { accountId = '' } = useParams();
  const navigate = useNavigate();
  const overlays = useVoucherOverlays();
  const can = useCan();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'ALL' | VoucherType>('ALL');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const q = useQuery({
    queryKey: ['statement', accountId, from, to],
    queryFn: () =>
      api.ledger.statement(accountId, {
        from: from || undefined,
        to: to || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const s = q.data;
  const lines = useMemo(
    () => (s?.lines ?? []).map((l) => ({ ...l, balance: -l.balance })),
    [s?.lines],
  );

  if (q.isError) {
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  if (!s) return <Spinner className="py-24" />;

  return (
    <>
      <LedgerSheet
        breadcrumbs={[
          { label: 'Partners', onClick: () => navigate('/ledger') },
          { label: s.accountCode },
        ]}
        title={s.accountName}
        meta={s.status ? <StatusBadge status={s.status} /> : undefined}
        description={
          <>
            Code: {s.accountCode} · Currency: PKR
            {s.lastTransaction ? ` · Last transaction: ${formatDate(s.lastTransaction)}` : ''}
          </>
        }
        headerActions={
          <Button
            variant="secondary"
            className="no-print"
            onClick={() => navigate(`/partners/${s.accountId}`)}
          >
            View partner
          </Button>
        }
        currency="PKR"
        opening={-s.openingBalance}
        closing={-s.closingBalance}
        summaryExtra={
          <>
            <span className="text-muted-foreground">·</span>
            <span>
              Credit limit:{' '}
              <span className="tabular font-medium">{formatMoney(s.creditLimit)}</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span>
              Available:{' '}
              <span className="tabular font-medium">{formatMoney(s.availableFunds)}</span>
            </span>
          </>
        }
        toolbarExtra={
          can('ledger:adjust') ? (
            <Button variant="secondary" size="sm" onClick={() => setAdjustOpen(true)}>
              Post adjustment
            </Button>
          ) : undefined
        }
        lines={lines}
        loading={q.isLoading}
        from={from}
        to={to}
        search={search}
        type={type}
        onFrom={setFrom}
        onTo={setTo}
        onSearch={setSearch}
        onType={setType}
        onClear={() => {
          setFrom('');
          setTo('');
          setSearch('');
          setType('ALL');
        }}
        onView={(voucherId) => overlays.openView(voucherId)}
        exportName={`ledger-${s.accountCode}`}
      />
      <AdjustDialog accountId={accountId} open={adjustOpen} onOpenChange={setAdjustOpen} />
    </>
  );
}

function AdjustDialog({
  accountId,
  open,
  onOpenChange,
}: {
  accountId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    reset,
    setError: setFieldError,
  } = useForm<LedgerAdjustmentInput>({
    resolver: zodResolver(ledgerAdjustmentSchema),
    defaultValues: { direction: 'CREDIT', description: '' },
  });
  const adjust = useMutation({
    mutationFn: (v: LedgerAdjustmentInput) => api.ledger.adjust(accountId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['statement', accountId] });
      toast.success('Adjustment posted');
      reset();
      onOpenChange(false);
    },
    onError: (e) => setError(applyServerErrors(e, setFieldError)),
  });
  const onSubmit = handleSubmit((v) => adjust.mutate(v));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Post a ledger adjustment"
      description="Corrections only. The partner sees the description on their statement, and the change is audited."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={adjust.isPending}>
            Post adjustment
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error && (
          <Alert tone="danger" className="sm:col-span-2">
            {error}
          </Alert>
        )}
        <Field label="Direction">
          <Select {...register('direction')}>
            <option value="CREDIT">Credit partner (increase balance)</option>
            <option value="DEBIT">Debit partner (decrease balance)</option>
          </Select>
        </Field>
        <Field label="Amount (PKR)" required error={formState.errors.amount?.message}>
          <Input type="number" min={1} step="0.01" {...register('amount')} />
        </Field>
        <Field
          label="Description"
          required
          className="sm:col-span-2"
          error={formState.errors.description?.message}
        >
          <Input placeholder="e.g. Bank charges reversal" {...register('description')} />
        </Field>
      </form>
    </Dialog>
  );
}
