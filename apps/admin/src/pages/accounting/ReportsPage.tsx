import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, Download, Printer, TriangleAlert } from 'lucide-react';
import { todayPk } from '@gnk/validation';
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  SegmentedControl,
  Spinner,
  StatCard,
  cn,
  formatDate,
  formatMoney,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { RequirePerm } from '@/components/guards';

export function ReportsPage() {
  const [view, setView] = useState<'tb' | 'pl'>('tb');
  return (
    <RequirePerm perm="ledger:read">
      <PageHeader
        title="Financial reports"
        description="Built from posted vouchers only. Drafts and vouchers awaiting approval are not included."
        actions={
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        }
      />
      <SegmentedControl
        className="mb-5 no-print"
        value={view}
        onChange={setView}
        items={[
          { value: 'tb', label: 'Trial balance' },
          { value: 'pl', label: 'Profit and loss' },
        ]}
      />
      {view === 'tb' ? <TrialBalance /> : <ProfitAndLoss />}
    </RequirePerm>
  );
}

const amt = (n: number) => (n ? formatMoney(n, { decimals: true, currency: false }) : '');

function TrialBalance() {
  const navigate = useNavigate();
  const [asOf, setAsOf] = useState(todayPk());
  const q = useQuery({
    queryKey: ['accounting', 'trial-balance', asOf],
    queryFn: () => api.accounting.trialBalance(asOf),
    placeholderData: keepPreviousData,
  });
  const tb = q.data;
  const balanced = tb && Math.abs(tb.totalDebit - tb.totalCredit) < 0.005;
  return (
    <Card>
      <CardHeader
        title={`Trial balance as of ${formatDate(asOf)}`}
        description={
          tb &&
          (balanced ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3.5" /> Debits equal credits
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-danger">
              <TriangleAlert className="size-3.5" /> Out of balance — contact support
            </span>
          ))
        }
        actions={
          <div className="flex items-center gap-2 no-print">
            <Input
              type="date"
              className="w-auto"
              value={asOf}
              onChange={(e) => e.target.value && setAsOf(e.target.value)}
              aria-label="As of"
            />
            <Button
              variant="secondary"
              disabled={!tb}
              onClick={() =>
                tb &&
                downloadCsv(`trial-balance-${asOf}.csv`, [
                  ['Code', 'Account', 'Class', 'Debit', 'Credit'],
                  ...tb.rows.map((r) => [r.code, r.name, r.class, r.debit || '', r.credit || '']),
                  ['', 'Total', '', tb.totalDebit, tb.totalCredit],
                ])
              }
            >
              <Download /> CSV
            </Button>
          </div>
        }
      />
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <DataTable
            rows={tb?.rows}
            loading={q.isLoading}
            rowKey={(r) => r.accountId}
            onRowClick={() => navigate('/accounting/accounts')}
            empty={<EmptyState title="No balances yet" />}
            columns={[
              {
                key: 'c',
                header: 'Code',
                cell: (r) => <span className="tabular text-muted-foreground">{r.code}</span>,
              },
              { key: 'n', header: 'Account', cell: (r) => r.name },
              {
                key: 'k',
                header: 'Class',
                hideBelow: 'md',
                cell: (r) => <span className="text-muted-foreground">{r.class.toLowerCase()}</span>,
              },
              { key: 'd', header: 'Debit', align: 'right', cell: (r) => amt(r.debit) },
              { key: 'cr', header: 'Credit', align: 'right', cell: (r) => amt(r.credit) },
            ]}
          />
          {tb && (
            <div className="flex justify-end gap-10 border-t-2 border-foreground/80 px-4 py-3 text-sm font-semibold tabular">
              <span>{formatMoney(tb.totalDebit, { decimals: true })}</span>
              <span>{formatMoney(tb.totalCredit, { decimals: true })}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function ProfitAndLoss() {
  const today = todayPk();
  const [range, setRange] = useState({ from: `${today.slice(0, 7)}-01`, to: today });
  const q = useQuery({
    queryKey: ['accounting', 'income-statement', range],
    queryFn: () => api.accounting.incomeStatement(range),
    placeholderData: keepPreviousData,
  });
  const pl = q.data;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2 no-print">
        <Input
          type="date"
          className="w-auto"
          value={range.from}
          onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
          aria-label="From"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="date"
          className="w-auto"
          value={range.to}
          onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
          aria-label="To"
        />
      </div>
      {!pl ? (
        <Spinner className="py-16" />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="Income" value={formatMoney(pl.totalIncome)} />
            <StatCard label="Expenses" value={formatMoney(pl.totalExpenses)} />
            <StatCard
              label={pl.netProfit >= 0 ? 'Net profit' : 'Net loss'}
              value={
                <span className={cn(pl.netProfit < 0 && 'text-danger')}>
                  {formatMoney(pl.netProfit)}
                </span>
              }
              tone={pl.netProfit >= 0 ? 'success' : 'danger'}
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {(
              [
                ['Income', pl.income, pl.totalIncome],
                ['Expenses', pl.expenses, pl.totalExpenses],
              ] as const
            ).map(([title, rows, total]) => (
              <Card key={title}>
                <CardHeader
                  title={title}
                  description={`${formatDate(pl.from)} – ${formatDate(pl.to)}`}
                />
                <div className="divide-y divide-border/60">
                  {!rows.length && (
                    <p className="px-5 py-6 text-sm text-muted-foreground">
                      Nothing posted in this period.
                    </p>
                  )}
                  {rows.map((r) => (
                    <div
                      key={r.code}
                      className="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span>
                        <span className="tabular mr-3 text-muted-foreground">{r.code}</span>
                        {r.name}
                      </span>
                      <span className="tabular">{formatMoney(r.amount, { decimals: true })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-5 py-3 text-sm font-semibold">
                    <span>Total {title.toLowerCase()}</span>
                    <span className="tabular">{formatMoney(total, { decimals: true })}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
