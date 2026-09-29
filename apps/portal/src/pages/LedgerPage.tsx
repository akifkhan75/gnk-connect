import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Printer, ScrollText } from 'lucide-react';
import { todayPk } from '@gnk/validation';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Money,
  PageHeader,
  StatCard,
  formatDate,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { downloadCsv } from '@/lib/csv';
import { ApprovedGate, RoleGate, rolesWith } from '@/components/guards';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export function LedgerPage() {
  return (
    <ApprovedGate>
      <RoleGate roles={rolesWith('ledger:view')}>
        <Ledger />
      </RoleGate>
    </ApprovedGate>
  );
}

function Ledger() {
  const [range, setRange] = useState({ from: daysAgo(90), to: todayPk() });
  const q = useQuery({
    queryKey: keys.statement(range),
    queryFn: () => api.ledger.statement(range),
    placeholderData: keepPreviousData,
  });
  const s = q.data;

  const exportCsv = () =>
    s &&
    downloadCsv(`gnk-statement-${s.accountCode}-${s.from}-to-${s.to}.csv`, [
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
      ['', '', 'Closing balance', s.totalDebits, s.totalCredits, s.closingBalance],
    ]);

  return (
    <>
      <PageHeader
        title="Ledger"
        description="Statement of account. Deposits are credits; confirmed bookings are debits."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!s}>
              <Download /> CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()} disabled={!s}>
              <Printer /> Print
            </Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Opening balance" value={<Money value={s?.openingBalance} signed />} />
        <StatCard label="Debits" value={<Money value={s?.totalDebits} />} />
        <StatCard label="Credits" value={<Money value={s?.totalCredits} />} />
        <StatCard
          label="Closing balance"
          value={<Money value={s?.closingBalance} signed />}
          tone="primary"
        />
        <StatCard
          label="Available to book"
          value={<Money value={s?.availableFunds} />}
          hint={s && `Credit limit ${s.creditLimit.toLocaleString('en-PK')}`}
          tone="gold"
          className="col-span-2 lg:col-span-1"
        />
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <label className="grid gap-1 text-xs text-muted-foreground">
            From
            <Input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            To
            <Input
              type="date"
              value={range.to}
              min={range.from}
              max={todayPk()}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </label>
          <div className="flex gap-1">
            {[30, 90, 365].map((d) => (
              <Button
                key={d}
                variant="ghost"
                size="sm"
                onClick={() => setRange({ from: daysAgo(d), to: todayPk() })}
              >
                {d === 365 ? '1 year' : `${d} days`}
              </Button>
            ))}
          </div>
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            rows={s?.lines}
            loading={q.isLoading}
            rowKey={(l) => l.reference + l.date + l.debit + l.credit}
            empty={<EmptyState icon={<ScrollText />} title="No transactions in this period" />}
            columns={[
              {
                key: 'd',
                header: 'Date',
                cell: (l) => <span className="whitespace-nowrap">{formatDate(l.date)}</span>,
              },
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
    </>
  );
}
