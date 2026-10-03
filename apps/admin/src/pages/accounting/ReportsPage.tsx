import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Banknote,
  Building2,
  Check,
  Download,
  Landmark,
  Percent,
  Printer,
  Receipt,
  Scale,
  ShoppingBag,
  Truck,
  TriangleAlert,
  TrendingUp,
} from 'lucide-react';
import { todayPk } from '@gnk/validation';
import type { AccountLedgerLine, SalesGroupReportDto, SalesReportDto } from '@gnk/types';
import {
  Breadcrumbs,
  Button,
  Card,
  CardHeader,
  Column,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  SearchInput,
  Spinner,
  StatCard,
  cn,
  filterPage,
  formatDate,
  formatMoney,
  includesQ,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';
import { useVoucherOverlays } from '@/pages/accounting/voucher-overlay-context';
import { VOUCHER_TYPE_LABEL } from './VouchersPage';

type ReportKind =
  | 'trial-balance'
  | 'balance-sheet'
  | 'profit-loss'
  | 'sales'
  | 'commission'
  | 'sales-by-partner'
  | 'sales-by-supplier'
  | 'expenses'
  | 'cash-bank';

const META: {
  kind: ReportKind;
  title: string;
  blurb: string;
  icon: typeof Scale;
  needsNet?: boolean;
}[] = [
  {
    kind: 'trial-balance',
    title: 'Trial balance',
    blurb: 'Debits and credits by account as of a date.',
    icon: Scale,
  },
  {
    kind: 'balance-sheet',
    title: 'Balance sheet',
    blurb: 'Assets, liabilities and equity as of a date.',
    icon: Landmark,
  },
  {
    kind: 'profit-loss',
    title: 'Profit & loss',
    blurb: 'Income less expenses for a period.',
    icon: TrendingUp,
  },
  {
    kind: 'sales',
    title: 'Sales report',
    blurb: 'Confirmed bookings in the period.',
    icon: ShoppingBag,
  },
  {
    kind: 'commission',
    title: 'Commission report',
    blurb: 'Margin earned by partner.',
    icon: Percent,
    needsNet: true,
  },
  {
    kind: 'sales-by-partner',
    title: 'Sales by partner',
    blurb: 'Confirmed sales grouped by partner.',
    icon: Building2,
  },
  {
    kind: 'sales-by-supplier',
    title: 'Sales by vendor / supplier',
    blurb: 'Confirmed sales grouped by supplier.',
    icon: Truck,
  },
  {
    kind: 'expenses',
    title: 'Expense report',
    blurb: 'Posted expense vouchers in the period.',
    icon: Receipt,
  },
  {
    kind: 'cash-bank',
    title: 'Cash and bank',
    blurb: 'Movements on cash and bank accounts.',
    icon: Banknote,
  },
];

const amt = (n: number) => (n ? formatMoney(n, { decimals: true, currency: false }) : '');
const money = (n: number | null | undefined) =>
  n == null ? '—' : formatMoney(n, { decimals: true, currency: false });

export function ReportsPage() {
  const { kind } = useParams<{ kind?: string }>();
  const report = META.find((r) => r.kind === kind);
  return (
    <RequirePerm perm="ledger:read">
      {report ? <ReportView meta={report} /> : <ReportHub />}
    </RequirePerm>
  );
}

function ReportHub() {
  const navigate = useNavigate();
  const can = useCan();
  const items = META.filter((r) => !r.needsNet || can('bookings:view_supplier_net'));
  return (
    <>
      <PageHeader
        title="Reports"
        description="Posted vouchers for the books; confirmed bookings for sales and commission."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => (
          <button
            key={r.kind}
            type="button"
            onClick={() => navigate(`/accounting/reports/${r.kind}`)}
            className="rounded-xl border border-border/80 bg-surface p-4 text-left transition-colors hover:border-foreground/20 hover:bg-muted/40"
          >
            <r.icon className="mb-3 size-5 text-muted-foreground" />
            <p className="font-semibold">{r.title}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{r.blurb}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function ReportView({ meta }: { meta: (typeof META)[number] }) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Reports', onClick: () => navigate('/accounting/reports') },
              { label: meta.title },
            ]}
          />
        }
        title={meta.title}
        description={meta.blurb}
        actions={
          <Button variant="secondary" className="no-print" onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        }
      />
      {meta.kind === 'trial-balance' && <TrialBalance />}
      {meta.kind === 'balance-sheet' && <BalanceSheet />}
      {meta.kind === 'profit-loss' && <ProfitAndLoss />}
      {meta.kind === 'sales' && <SalesReport />}
      {meta.kind === 'commission' && <GroupedSales kind="commission" />}
      {meta.kind === 'sales-by-partner' && <GroupedSales kind="partner" />}
      {meta.kind === 'sales-by-supplier' && <GroupedSales kind="supplier" />}
      {meta.kind === 'expenses' && <ExpenseReport />}
      {meta.kind === 'cash-bank' && <CashBankReport />}
    </>
  );
}

function AsOfBar({
  asOf,
  onChange,
  onCsv,
  disabled,
}: {
  asOf: string;
  onChange: (v: string) => void;
  onCsv?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 no-print">
      <Input
        type="date"
        className="w-auto"
        value={asOf}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label="As of"
      />
      {onCsv && (
        <Button variant="secondary" disabled={disabled} onClick={onCsv}>
          <Download /> CSV
        </Button>
      )}
    </div>
  );
}

function RangeBar({
  from,
  to,
  onChange,
  onCsv,
  disabled,
}: {
  from: string;
  to: string;
  onChange: (r: { from: string; to: string }) => void;
  onCsv?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 no-print">
      <Input
        type="date"
        className="w-auto"
        value={from}
        onChange={(e) => e.target.value && onChange({ from: e.target.value, to })}
        aria-label="From"
      />
      <span className="text-muted-foreground">to</span>
      <Input
        type="date"
        className="w-auto"
        value={to}
        onChange={(e) => e.target.value && onChange({ from, to: e.target.value })}
        aria-label="To"
      />
      {onCsv && (
        <Button variant="secondary" disabled={disabled} onClick={onCsv}>
          <Download /> CSV
        </Button>
      )}
    </div>
  );
}

function monthToToday() {
  const today = todayPk();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

function ReportTable<T>({
  rows,
  loading,
  rowKey,
  columns,
  empty,
  onRowClick,
  match,
  placeholder = 'Search…',
  dense,
}: {
  rows: T[] | undefined;
  loading?: boolean;
  rowKey: (row: T) => string;
  columns: Column<T>[];
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  match: (row: T, q: string) => boolean;
  placeholder?: string;
  dense?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const list = filterPage(rows, { q: search, page, match });
  return (
    <>
      <div className="flex items-center gap-3 border-b p-4 no-print">
        <SearchInput
          className="min-w-[16rem] flex-1"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
        dense={dense}
        headerClassName="font-bold text-foreground"
        rows={list.items}
        loading={loading}
        rowKey={rowKey}
        onRowClick={onRowClick}
        empty={empty}
        columns={columns}
      />
      <Pagination
        className="no-print"
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        onChange={setPage}
      />
    </>
  );
}

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
        title={`As of ${formatDate(asOf)}`}
        description={
          tb &&
          (balanced ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3.5" /> Debits equal credits
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-danger">
              <TriangleAlert className="size-3.5" /> Out of balance
            </span>
          ))
        }
        actions={
          <AsOfBar
            asOf={asOf}
            onChange={setAsOf}
            disabled={!tb}
            onCsv={() =>
              tb &&
              downloadCsv(`trial-balance-${asOf}.csv`, [
                ['Code', 'Account', 'Class', 'Debit', 'Credit'],
                ...tb.rows.map((r) => [r.code, r.name, r.class, r.debit || '', r.credit || '']),
                ['', 'Total', '', tb.totalDebit, tb.totalCredit],
              ])
            }
          />
        }
      />
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <ReportTable
            rows={tb?.rows}
            loading={q.isLoading}
            rowKey={(r) => r.accountId}
            onRowClick={(r) => navigate(`/accounting/accounts/${r.accountId}`)}
            empty={<EmptyState title="No balances yet" />}
            placeholder="Search code, account or class"
            match={(r, s) => includesQ(r.code, r.name, r.class).includes(s)}
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

function BalanceSheet() {
  const navigate = useNavigate();
  const [asOf, setAsOf] = useState(todayPk());
  const q = useQuery({
    queryKey: ['accounting', 'balance-sheet', asOf],
    queryFn: () => api.accounting.balanceSheet(asOf),
    placeholderData: keepPreviousData,
  });
  const bs = q.data;
  const balanced = bs && Math.abs(bs.totalAssets - bs.totalLiabilitiesAndEquity) < 0.005;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <AsOfBar
        asOf={asOf}
        onChange={setAsOf}
        disabled={!bs}
        onCsv={() => {
          if (!bs) return;
          const row = (label: string, r: { code: string; name: string; amount: number }) => [
            label,
            r.code,
            r.name,
            r.amount,
          ];
          downloadCsv(`balance-sheet-${asOf}.csv`, [
            ['Section', 'Code', 'Account', 'Amount'],
            ...bs.assets.map((r) => row('Asset', r)),
            ['Asset', '', 'Total assets', bs.totalAssets],
            ...bs.liabilities.map((r) => row('Liability', r)),
            ['Liability', '', 'Total liabilities', bs.totalLiabilities],
            ...bs.equity.map((r) => row('Equity', r)),
            ['Equity', '', 'Current year earnings', bs.currentEarnings],
            ['Equity', '', 'Total equity', bs.totalEquity],
            ['', '', 'Liabilities + equity', bs.totalLiabilitiesAndEquity],
          ]);
        }}
      />
      {!bs ? (
        <Spinner className="py-16" />
      ) : (
        <>
          <p className={cn('mb-4 text-sm', balanced ? 'text-success' : 'text-danger')}>
            {balanced
              ? 'Assets equal liabilities and equity.'
              : 'Out of balance — review postings.'}
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            <SheetSection
              title="Assets"
              rows={bs.assets}
              total={bs.totalAssets}
              onOpen={(id) => id && navigate(`/accounting/accounts/${id}`)}
            />
            <div className="space-y-5">
              <SheetSection
                title="Liabilities"
                rows={bs.liabilities}
                total={bs.totalLiabilities}
                onOpen={(id) => id && navigate(`/accounting/accounts/${id}`)}
              />
              <SheetSection
                title="Equity"
                rows={[
                  ...bs.equity,
                  { code: '', name: 'Current year earnings', amount: bs.currentEarnings },
                ]}
                total={bs.totalEquity}
                footer="Liabilities + equity"
                footerAmount={bs.totalLiabilitiesAndEquity}
                onOpen={(id) => id && navigate(`/accounting/accounts/${id}`)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function SheetSection({
  title,
  rows,
  total,
  footer,
  footerAmount,
  onOpen,
}: {
  title: string;
  rows: { accountId?: string; code: string; name: string; amount: number }[];
  total: number;
  footer?: string;
  footerAmount?: number;
  onOpen?: (id?: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const list = filterPage(rows, {
    q: search,
    page,
    pageSize: 25,
    match: (r, s) => includesQ(r.code, r.name).includes(s),
  });
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length > 8 && (
        <div className="border-b px-4 py-3 no-print">
          <SearchInput
            placeholder={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      )}
      <div className="divide-y divide-border/60">
        {!list.total && (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nothing in this section.</p>
        )}
        {list.items.map((r) => (
          <button
            key={`${r.code}-${r.name}`}
            type="button"
            disabled={!r.accountId}
            onClick={() => onOpen?.(r.accountId)}
            className="flex w-full items-center justify-between px-5 py-2.5 text-left text-sm disabled:cursor-default"
          >
            <span>
              {r.code && <span className="tabular mr-3 text-muted-foreground">{r.code}</span>}
              {r.name}
            </span>
            <span className="tabular">{formatMoney(r.amount, { decimals: true })}</span>
          </button>
        ))}
        <div className="flex justify-between px-5 py-3 text-sm font-semibold">
          <span>Total {title.toLowerCase()}</span>
          <span className="tabular">{formatMoney(total, { decimals: true })}</span>
        </div>
        {footer && (
          <div className="flex justify-between px-5 py-3 text-sm font-semibold">
            <span>{footer}</span>
            <span className="tabular">{formatMoney(footerAmount ?? 0, { decimals: true })}</span>
          </div>
        )}
      </div>
      <Pagination
        className="no-print"
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        onChange={setPage}
      />
    </Card>
  );
}

function ProfitAndLoss() {
  const [range, setRange] = useState(monthToToday);
  const q = useQuery({
    queryKey: ['accounting', 'income-statement', range],
    queryFn: () => api.accounting.incomeStatement(range),
    placeholderData: keepPreviousData,
  });
  const pl = q.data;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <RangeBar
        from={range.from}
        to={range.to}
        onChange={setRange}
        disabled={!pl}
        onCsv={() => {
          if (!pl) return;
          downloadCsv(`profit-loss-${pl.from}-to-${pl.to}.csv`, [
            ['Section', 'Code', 'Account', 'Amount'],
            ...pl.income.map((r) => ['Income', r.code, r.name, r.amount]),
            ['Income', '', 'Total income', pl.totalIncome],
            ...pl.expenses.map((r) => ['Expense', r.code, r.name, r.amount]),
            ['Expense', '', 'Total expenses', pl.totalExpenses],
            ['', '', pl.netProfit >= 0 ? 'Net profit' : 'Net loss', pl.netProfit],
          ]);
        }}
      />
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
            <SheetSection title="Income" rows={pl.income} total={pl.totalIncome} />
            <SheetSection title="Expenses" rows={pl.expenses} total={pl.totalExpenses} />
          </div>
        </>
      )}
    </>
  );
}

function SalesReport() {
  const navigate = useNavigate();
  const [range, setRange] = useState(monthToToday);
  const q = useQuery({
    queryKey: ['accounting', 'sales', range],
    queryFn: () => api.accounting.sales(range),
    placeholderData: keepPreviousData,
  });
  const s = q.data;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <RangeBar
        from={range.from}
        to={range.to}
        onChange={setRange}
        disabled={!s}
        onCsv={() => {
          if (!s) return;
          downloadCsv(`sales-${s.from}-to-${s.to}.csv`, [
            [
              'Date',
              'Reference',
              'Partner',
              'Supplier',
              'Product',
              'Seats',
              'Revenue',
              ...(s.includeCost ? ['Cost', 'Commission'] : []),
            ],
            ...s.rows.map((r) => [
              r.date,
              r.reference,
              `${r.partnerCode} ${r.partnerName}`,
              r.supplierName,
              r.product,
              r.seats,
              r.revenue,
              ...(s.includeCost ? [r.cost ?? '', r.commission ?? ''] : []),
            ]),
          ]);
        }}
      />
      {!s ? (
        <Spinner className="py-16" />
      ) : (
        <>
          <Card>
            <ReportTable
              rows={s.rows}
              loading={q.isLoading}
              rowKey={(r) => r.bookingId}
              onRowClick={(r) => navigate(`/bookings/${r.bookingId}`)}
              empty={<EmptyState title="No confirmed sales in this period" />}
              placeholder="Search reference, partner, supplier or product"
              match={(r, q) =>
                includesQ(
                  r.reference,
                  r.partnerName,
                  r.partnerCode,
                  r.supplierName,
                  r.product,
                ).includes(q)
              }
              columns={[
                { key: 'd', header: 'Date', cell: (r) => formatDate(r.date) },
                { key: 'r', header: 'Reference', cell: (r) => r.reference },
                {
                  key: 'p',
                  header: 'Partner',
                  cell: (r) => (
                    <span>
                      {r.partnerName}
                      <span className="ml-2 text-xs text-muted-foreground">{r.partnerCode}</span>
                    </span>
                  ),
                },
                { key: 's', header: 'Supplier', hideBelow: 'lg', cell: (r) => r.supplierName },
                { key: 'x', header: 'Product', hideBelow: 'md', cell: (r) => r.product },
                { key: 'n', header: 'Seats', align: 'right', cell: (r) => r.seats },
                { key: 'rev', header: 'Revenue', align: 'right', cell: (r) => money(r.revenue) },
                ...(s.includeCost
                  ? [
                      {
                        key: 'c',
                        header: 'Cost',
                        align: 'right' as const,
                        hideBelow: 'xl' as const,
                        cell: (r: SalesReportDto['rows'][number]) => money(r.cost),
                      },
                      {
                        key: 'm',
                        header: 'Commission',
                        align: 'right' as const,
                        cell: (r: SalesReportDto['rows'][number]) => money(r.commission),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}

function GroupedSales({ kind }: { kind: 'commission' | 'partner' | 'supplier' }) {
  const [range, setRange] = useState(monthToToday);
  const q = useQuery({
    queryKey: ['accounting', kind, range],
    queryFn: () =>
      kind === 'commission'
        ? api.accounting.commission(range)
        : kind === 'partner'
          ? api.accounting.salesByPartner(range)
          : api.accounting.salesBySupplier(range),
    placeholderData: keepPreviousData,
  });
  const s = q.data;
  const name = kind === 'supplier' ? 'Supplier' : 'Partner';
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <RangeBar
        from={range.from}
        to={range.to}
        onChange={setRange}
        disabled={!s}
        onCsv={() => {
          if (!s) return;
          downloadCsv(`${kind}-${s.from}-to-${s.to}.csv`, [
            [
              name,
              'Bookings',
              'Seats',
              'Revenue',
              ...(s.includeCost ? ['Cost', 'Commission', 'Rate'] : []),
            ],
            ...s.rows.map((r) => [
              r.code ? `${r.code} ${r.name}` : r.name,
              r.bookings,
              r.seats,
              r.revenue,
              ...(s.includeCost
                ? [
                    r.cost ?? '',
                    r.commission ?? '',
                    r.revenue ? (((r.commission ?? 0) / r.revenue) * 100).toFixed(1) + '%' : '',
                  ]
                : []),
            ]),
          ]);
        }}
      />
      {!s ? (
        <Spinner className="py-16" />
      ) : (
        <>
          <Card>
            <ReportTable
              rows={s.rows}
              loading={q.isLoading}
              rowKey={(r) => r.id}
              empty={<EmptyState title="No confirmed sales in this period" />}
              placeholder={`Search ${name.toLowerCase()}`}
              match={(r, q) => includesQ(r.name, r.code).includes(q)}
              columns={[
                {
                  key: 'n',
                  header: name,
                  cell: (r) => (
                    <span>
                      {r.name}
                      {r.code && (
                        <span className="ml-2 text-xs text-muted-foreground">{r.code}</span>
                      )}
                    </span>
                  ),
                },
                { key: 'b', header: 'Bookings', align: 'right', cell: (r) => r.bookings },
                { key: 's', header: 'Seats', align: 'right', cell: (r) => r.seats },
                { key: 'rev', header: 'Revenue', align: 'right', cell: (r) => money(r.revenue) },
                ...(s.includeCost
                  ? [
                      {
                        key: 'c',
                        header: 'Cost',
                        align: 'right' as const,
                        cell: (r: SalesGroupReportDto['rows'][number]) => money(r.cost),
                      },
                      {
                        key: 'm',
                        header: 'Commission',
                        align: 'right' as const,
                        cell: (r: SalesGroupReportDto['rows'][number]) => money(r.commission),
                      },
                      {
                        key: 'rate',
                        header: 'Rate',
                        align: 'right' as const,
                        cell: (r: SalesGroupReportDto['rows'][number]) =>
                          r.revenue
                            ? `${(((r.commission ?? 0) / r.revenue) * 100).toFixed(1)}%`
                            : '—',
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}

function ExpenseReport() {
  const overlays = useVoucherOverlays();
  const [range, setRange] = useState(monthToToday);
  const q = useQuery({
    queryKey: ['accounting', 'expenses', range],
    queryFn: () => api.accounting.expenses(range),
    placeholderData: keepPreviousData,
  });
  const e = q.data;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <RangeBar
        from={range.from}
        to={range.to}
        onChange={setRange}
        disabled={!e}
        onCsv={() => {
          if (!e) return;
          downloadCsv(`expenses-${e.from}-to-${e.to}.csv`, [
            ['Date', 'Type', 'Reference', 'Account', 'Description', 'Amount'],
            ...e.lines.map((l) => [
              l.date,
              VOUCHER_TYPE_LABEL[l.type],
              l.reference,
              `${l.accountCode} ${l.accountName}`,
              l.description,
              l.amount,
            ]),
            ['', '', '', '', 'Total', e.total],
          ]);
        }}
      />
      {!e ? (
        <Spinner className="py-16" />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <StatCard label="Expense lines" value={e.lines.length} />
            <StatCard label="Total expenses" value={formatMoney(e.total)} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card>
              <ReportTable
                rows={e.lines}
                loading={q.isLoading}
                rowKey={(l) => `${l.voucherId}${l.accountCode}`}
                onRowClick={(l) => overlays.openView(l.voucherId)}
                empty={<EmptyState title="No expenses posted in this period" />}
                placeholder="Search reference, account or description"
                match={(l, q) =>
                  includesQ(l.reference, l.accountCode, l.accountName, l.description).includes(q)
                }
                columns={[
                  { key: 'd', header: 'Date', cell: (l) => formatDate(l.date) },
                  {
                    key: 't',
                    header: 'Type',
                    hideBelow: 'md',
                    cell: (l) => VOUCHER_TYPE_LABEL[l.type],
                  },
                  { key: 'r', header: 'Reference', cell: (l) => l.reference },
                  {
                    key: 'a',
                    header: 'Account',
                    cell: (l) => (
                      <span>
                        <span className="tabular mr-2 text-muted-foreground">{l.accountCode}</span>
                        {l.accountName}
                      </span>
                    ),
                  },
                  {
                    key: 'x',
                    header: 'Description',
                    hideBelow: 'lg',
                    cell: (l) => l.description,
                  },
                  { key: 'amt', header: 'Amount', align: 'right', cell: (l) => money(l.amount) },
                ]}
              />
            </Card>
            <Card>
              <CardHeader title="By account" />
              <div className="divide-y divide-border/60">
                {!e.byAccount.length && (
                  <p className="px-5 py-6 text-sm text-muted-foreground">No accounts.</p>
                )}
                {e.byAccount.map((r) => (
                  <div key={r.code} className="flex justify-between px-5 py-2.5 text-sm">
                    <span>
                      <span className="tabular mr-2 text-muted-foreground">{r.code}</span>
                      {r.name}
                    </span>
                    <span className="tabular">{money(r.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-3 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular">{money(e.total)}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function CashBankReport() {
  const overlays = useVoucherOverlays();
  const [range, setRange] = useState(monthToToday);
  const q = useQuery({
    queryKey: ['accounting', 'cash-bank', range],
    queryFn: () => api.accounting.cashBank(range),
    placeholderData: keepPreviousData,
  });
  const r = q.data;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <RangeBar
        from={range.from}
        to={range.to}
        onChange={setRange}
        disabled={!r}
        onCsv={() => {
          if (!r) return;
          downloadCsv(`cash-bank-${r.from}-to-${r.to}.csv`, [
            ['Account', 'Date', 'Type', 'Reference', 'Description', 'In', 'Out', 'Balance'],
            ...r.accounts.flatMap((a) => [
              [a.code, '', '', '', a.name, a.inflows, a.outflows, a.closing],
              ...a.lines.map((l) => [
                a.code,
                l.date,
                VOUCHER_TYPE_LABEL[l.type],
                l.reference,
                l.description,
                l.debit || '',
                l.credit || '',
                l.balance,
              ]),
            ]),
          ]);
        }}
      />
      {!r ? (
        <Spinner className="py-16" />
      ) : !r.accounts.length ? (
        <EmptyState title="No cash or bank accounts" />
      ) : (
        <div className="space-y-5">
          {r.accounts.map((a) => (
            <Card key={a.accountId}>
              <CardHeader
                title={`${a.code} ${a.name}`}
                description={`${formatDate(r.from)} – ${formatDate(r.to)}`}
              />
              <div className="grid gap-3 border-b px-5 py-3 sm:grid-cols-4">
                <StatCard label="Opening" value={formatMoney(a.opening, { decimals: true })} />
                <StatCard label="In" value={formatMoney(a.inflows, { decimals: true })} />
                <StatCard label="Out" value={formatMoney(a.outflows, { decimals: true })} />
                <StatCard label="Closing" value={formatMoney(a.closing, { decimals: true })} />
              </div>
              <CashBankLines lines={a.lines} onView={(id) => overlays.openView(id)} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function CashBankLines({
  lines,
  onView,
}: {
  lines: AccountLedgerLine[];
  onView: (id: string) => void;
}) {
  return (
    <ReportTable
      dense
      rows={lines}
      rowKey={(l) => `${l.voucherId}${l.debit}${l.credit}${l.narration ?? ''}`}
      onRowClick={(l) => onView(l.voucherId)}
      empty={<EmptyState title="No movements in this period" />}
      placeholder="Search reference or description"
      match={(l, q) => includesQ(l.reference, l.description, l.narration).includes(q)}
      columns={[
        { key: 'd', header: 'Date', cell: (l) => formatDate(l.date) },
        { key: 't', header: 'Type', cell: (l) => VOUCHER_TYPE_LABEL[l.type] },
        { key: 'r', header: 'Reference', cell: (l) => l.reference },
        {
          key: 'x',
          header: 'Description',
          cell: (l) => [l.description, l.narration].filter(Boolean).join(' — '),
        },
        { key: 'in', header: 'In', align: 'right', cell: (l) => amt(l.debit) },
        { key: 'out', header: 'Out', align: 'right', cell: (l) => amt(l.credit) },
        { key: 'b', header: 'Balance', align: 'right', cell: (l) => money(l.balance) },
      ]}
    />
  );
}
