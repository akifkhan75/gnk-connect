import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Printer, Scale, ScrollText } from 'lucide-react';
import { ledgerAdjustmentSchema, todayPk, type LedgerAdjustmentInput } from '@gnk/validation';
import {
  Alert,
  Breadcrumbs,
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
  StatCard,
  StatusBadge,
  formatDate,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { applyServerErrors } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

export function LedgerPage() {
  return (
    <RequirePerm perm="ledger:read">
      <Accounts />
    </RequirePerm>
  );
}

function Accounts() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useQuery({
    queryKey: ['ledger-accounts', page, search],
    queryFn: () => api.ledger.accounts({ page, pageSize: 25, q: search || undefined }),
    placeholderData: keepPreviousData,
  });
  const owed = q.data?.items.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0) ?? 0;
  return (
    <>
      <PageHeader
        title="Ledger"
        description="Partner balances. Negative balances are amounts partners owe GNK on credit."
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
        <div className="border-b p-4">
          <SearchInput
            className="max-w-md"
            placeholder="Partner name or code"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <DataTable
              rows={q.data?.items}
              loading={q.isLoading}
              rowKey={(a) => a.id}
              onRowClick={(a) => navigate(`/ledger/${a.id}`)}
              empty={<EmptyState icon={<ScrollText />} title="No approved partners yet" />}
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
              <Pagination page={page} pageSize={25} total={q.data.total} onChange={setPage} />
            )}
          </>
        )}
      </Card>
    </>
  );
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

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
  const can = useCan();
  const [range, setRange] = useState({ from: daysAgo(90), to: todayPk() });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const q = useQuery({
    queryKey: ['statement', accountId, range],
    queryFn: () => api.ledger.statement(accountId, range),
    placeholderData: keepPreviousData,
  });
  const s = q.data;
  const exportCsv = () =>
    s &&
    downloadCsv(`statement-${s.accountCode}-${s.from}-${s.to}.csv`, [
      ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
      ['', '', 'Opening balance', '', '', s.openingBalance],
      ...s.lines.map((l) => [
        l.date.slice(0, 10),
        l.reference,
        l.description,
        l.debit || '',
        l.credit || '',
        l.balance,
      ]),
    ]);

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Ledger', onClick: () => navigate('/ledger') },
              { label: s?.accountCode ?? '…' },
            ]}
          />
        }
        title={s ? `Statement: ${s.accountName}` : 'Statement'}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!s}>
              <Download /> CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            {can('ledger:adjust') && (
              <Button onClick={() => setAdjustOpen(true)}>Post adjustment</Button>
            )}
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Opening" value={<Money value={s?.openingBalance} signed />} />
        <StatCard label="Debits" value={<Money value={s?.totalDebits} />} />
        <StatCard label="Credits" value={<Money value={s?.totalCredits} />} />
        <StatCard
          label="Closing"
          value={<Money value={s?.closingBalance} signed />}
          tone="primary"
        />
        <StatCard
          label="Available"
          value={<Money value={s?.availableFunds} />}
          hint={s && `Credit ${s.creditLimit.toLocaleString('en-PK')}`}
          tone="gold"
        />
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <Input
            type="date"
            className="w-auto"
            value={range.from}
            onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
            aria-label="From"
          />
          <Input
            type="date"
            className="w-auto"
            value={range.to}
            onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
            aria-label="To"
          />
        </div>
        {q.error ? (
          <ErrorState error={q.error} />
        ) : (
          <DataTable
            rows={s?.lines}
            loading={q.isLoading}
            rowKey={(l) => l.reference + l.date + l.debit}
            empty={<EmptyState icon={<ScrollText />} title="No transactions in this period" />}
            columns={[
              { key: 'd', header: 'Date', cell: (l) => formatDate(l.date) },
              {
                key: 'r',
                header: 'Reference',
                hideBelow: 'md',
                cell: (l) => <span className="tabular text-muted-foreground">{l.reference}</span>,
              },
              { key: 'x', header: 'Description', cell: (l) => l.description },
              {
                key: 'dr',
                header: 'Debit',
                align: 'right',
                cell: (l) => (l.debit ? <Money value={l.debit} /> : ''),
              },
              {
                key: 'cr',
                header: 'Credit',
                align: 'right',
                cell: (l) => (l.credit ? <Money value={l.credit} className="text-success" /> : ''),
              },
              {
                key: 'b',
                header: 'Balance',
                align: 'right',
                cell: (l) => <Money value={l.balance} signed className="font-medium" />,
              },
            ]}
          />
        )}
      </Card>
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
