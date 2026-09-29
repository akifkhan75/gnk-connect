import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Download, Lock, Network, Plus } from 'lucide-react';
import { ApiError } from '@gnk/api-client';
import type { AccountClass, ChartAccountDto } from '@gnk/types';
import { todayPk } from '@gnk/validation';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Select,
  Spinner,
  StatCard,
  Textarea,
  cn,
  formatDate,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { useCan } from '@/lib/useCan';
import { DrCr } from '@/components/AccountPicker';
import { RequirePerm } from '@/components/guards';

const CLASSES: { value: AccountClass | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ASSET', label: 'Assets' },
  { value: 'LIABILITY', label: 'Liabilities' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expenses' },
];

export function ChartOfAccountsPage() {
  return (
    <RequirePerm perm="ledger:read">
      <Chart />
    </RequirePerm>
  );
}

interface Row extends ChartAccountDto {
  depth: number;
  hasChildren: boolean;
}

function Chart() {
  const can = useCan();
  const q = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => api.accounting.accounts(),
  });
  const [cls, setCls] = useState<AccountClass | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  // Partner receivables can be many: keep 1200 collapsed until asked.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['AR']));
  const [ledgerOf, setLedgerOf] = useState<ChartAccountDto | null>(null);
  const [editing, setEditing] = useState<ChartAccountDto | 'new' | null>(null);

  const rows = useMemo<Row[]>(() => {
    const all = q.data ?? [];
    const children = new Map<string | null, ChartAccountDto[]>();
    for (const a of all) children.set(a.parentId, [...(children.get(a.parentId) ?? []), a]);
    const out: Row[] = [];
    const s = search.trim().toLowerCase();
    const walk = (parent: string | null, depth: number) => {
      for (const a of children.get(parent) ?? []) {
        if (cls !== 'ALL' && a.class !== cls) continue;
        const kids = children.get(a.id) ?? [];
        const match = !s || a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s);
        if (match) out.push({ ...a, depth: s ? 0 : depth, hasChildren: kids.length > 0 });
        const isCollapsed =
          collapsed.has(a.id) || (a.systemKey === 'AR_CONTROL' && collapsed.has('AR'));
        if (s || !isCollapsed) walk(a.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [q.data, cls, search, collapsed]);

  const toggle = (a: Row) =>
    setCollapsed((c) => {
      const n = new Set(c);
      const key = a.systemKey === 'AR_CONTROL' ? 'AR' : a.id;
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const isOpen = (a: Row) => !collapsed.has(a.systemKey === 'AR_CONTROL' ? 'AR' : a.id);

  const totals = useMemo(() => {
    const roots = (q.data ?? []).filter((a) => !a.parentId);
    const by = (c: AccountClass) =>
      roots.filter((a) => a.class === c).reduce((s, a) => s + a.balance, 0);
    return {
      assets: by('ASSET'),
      liabilities: -by('LIABILITY'),
      income: -by('INCOME'),
      expenses: by('EXPENSE'),
    };
  }, [q.data]);

  return (
    <>
      <PageHeader
        title="Chart of accounts"
        description="Every account the books use. Groups organise the tree; you post to the accounts inside them."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(`chart-of-accounts-${todayPk()}.csv`, [
                  [
                    'Code',
                    'Name',
                    'Class',
                    'Group',
                    'Currency',
                    'Balance (Dr+/Cr-)',
                    'Foreign balance',
                    'Active',
                  ],
                  ...(q.data ?? []).map((a) => [
                    a.code,
                    a.name,
                    a.class,
                    a.isGroup ? 'yes' : '',
                    a.currency,
                    a.balance,
                    a.fcBalance ?? '',
                    a.isActive ? 'yes' : 'no',
                  ]),
                ])
              }
            >
              <Download /> CSV
            </Button>
            {can('ledger:coa') && (
              <Button onClick={() => setEditing('new')}>
                <Plus /> New account
              </Button>
            )}
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Assets" value={<DrCr value={totals.assets} />} />
        <StatCard label="Liabilities" value={<DrCr value={-totals.liabilities} />} />
        <StatCard label="Income to date" value={<DrCr value={-totals.income} />} />
        <StatCard label="Expenses to date" value={<DrCr value={totals.expenses} />} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 p-4">
          <SegmentedControl value={cls} onChange={setCls} items={CLASSES} />
          <SearchInput
            className="ml-auto w-full max-w-xs"
            placeholder="Code or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            rows={rows}
            loading={q.isLoading}
            rowKey={(a) => a.id}
            onRowClick={(a) => (a.isGroup ? toggle(a) : setLedgerOf(a))}
            rowClassName={(a) => (a.isActive ? undefined : 'opacity-50')}
            empty={<EmptyState icon={<Network />} title="No accounts match" />}
            columns={[
              {
                key: 'n',
                header: 'Account',
                cell: (a) => (
                  <div className="flex items-center gap-2" style={{ paddingLeft: a.depth * 20 }}>
                    {a.hasChildren ? (
                      <ChevronRight
                        className={cn(
                          'size-3.5 shrink-0 text-muted-foreground transition-transform',
                          isOpen(a) && 'rotate-90',
                        )}
                      />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span className="tabular w-24 shrink-0 text-[12.5px] text-muted-foreground">
                      {a.code}
                    </span>
                    <span className={cn('truncate', a.isGroup && 'font-semibold')}>{a.name}</span>
                    {a.currency !== 'PKR' && (
                      <Badge tone="gold" className="shrink-0">
                        {a.currency}
                      </Badge>
                    )}
                    {a.systemKey && (
                      <Lock
                        className="size-3 shrink-0 text-muted-foreground"
                        aria-label="System account"
                      />
                    )}
                    {a.systemKey === 'AR_CONTROL' && (
                      <span className="text-xs text-muted-foreground">
                        {(q.data ?? []).filter((x) => x.parentId === a.id).length} partners
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'c',
                header: 'Class',
                hideBelow: 'md',
                cell: (a) => <span className="text-muted-foreground">{a.class.toLowerCase()}</span>,
              },
              {
                key: 'f',
                header: 'Foreign balance',
                align: 'right',
                hideBelow: 'lg',
                cell: (a) =>
                  a.fcBalance != null ? <DrCr value={a.fcBalance} currency={a.currency} /> : '',
              },
              {
                key: 'b',
                header: 'Balance',
                align: 'right',
                cell: (a) => (
                  <DrCr value={a.balance} className={a.isGroup ? 'font-semibold' : undefined} />
                ),
              },
            ]}
          />
        )}
      </Card>
      <LedgerDrawer
        account={ledgerOf}
        onClose={() => setLedgerOf(null)}
        onEdit={can('ledger:coa') ? (a) => setEditing(a) : undefined}
      />
      <AccountDialog account={editing} accounts={q.data ?? []} onClose={() => setEditing(null)} />
    </>
  );
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

function LedgerDrawer({
  account,
  onClose,
  onEdit,
}: {
  account: ChartAccountDto | null;
  onClose: () => void;
  onEdit?: (a: ChartAccountDto) => void;
}) {
  const navigate = useNavigate();
  const [range, setRange] = useState({ from: daysAgo(90), to: todayPk() });
  const q = useQuery({
    queryKey: ['accounting', 'account-ledger', account?.id, range],
    queryFn: () => api.accounting.accountLedger(account!.id, range),
    enabled: !!account,
    placeholderData: keepPreviousData,
  });
  const fc = account && account.currency !== 'PKR';
  const g = q.data;
  return (
    <Drawer
      open={!!account}
      onOpenChange={(o) => !o && onClose()}
      width="max-w-4xl"
      title={account ? `${account.code} · ${account.name}` : ''}
      description={
        account ? `${account.class.toLowerCase()} · kept in ${account.currency}` : undefined
      }
      footer={
        account &&
        onEdit && (
          <Button variant="secondary" onClick={() => onEdit(account)}>
            Edit account
          </Button>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
      {!g ? (
        <Spinner className="py-16" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Opening"
              value={<DrCr value={g.opening} />}
              hint={
                fc && g.fcOpening != null ? (
                  <DrCr value={g.fcOpening} currency={account!.currency} />
                ) : undefined
              }
            />
            <StatCard label="Debits" value={g.totalDebit.toLocaleString('en-PK')} />
            <StatCard label="Credits" value={g.totalCredit.toLocaleString('en-PK')} />
            <StatCard
              label="Closing"
              value={<DrCr value={g.closing} />}
              hint={
                fc && g.fcClosing != null ? (
                  <DrCr value={g.fcClosing} currency={account!.currency} />
                ) : undefined
              }
            />
          </div>
          <Card>
            <DataTable
              dense
              rows={g.lines}
              rowKey={(l) => `${l.voucherId}${l.debit}${l.credit}${l.narration}`}
              onRowClick={(l) => navigate(`/accounting/vouchers/${l.voucherId}`)}
              empty={<EmptyState title="No postings in this period" />}
              columns={[
                { key: 'd', header: 'Date', cell: (l) => formatDate(l.date) },
                {
                  key: 'r',
                  header: 'Voucher',
                  cell: (l) => <span className="tabular">{l.reference}</span>,
                },
                {
                  key: 'x',
                  header: 'Narration',
                  cell: (l) => (
                    <div className="max-w-xs">
                      <p className="truncate">{l.description}</p>
                      {l.narration && (
                        <p className="truncate text-xs text-muted-foreground">{l.narration}</p>
                      )}
                    </div>
                  ),
                },
                ...(fc
                  ? [
                      {
                        key: 'f',
                        header: account!.currency,
                        align: 'right' as const,
                        cell: (l: (typeof g.lines)[number]) =>
                          l.fcAmount != null
                            ? `${l.debit ? '' : '−'}${l.fcAmount.toLocaleString('en-PK')} @ ${l.rate}`
                            : '',
                      },
                    ]
                  : []),
                {
                  key: 'dr',
                  header: 'Debit',
                  align: 'right',
                  cell: (l) => (l.debit ? l.debit.toLocaleString('en-PK') : ''),
                },
                {
                  key: 'cr',
                  header: 'Credit',
                  align: 'right',
                  cell: (l) => (l.credit ? l.credit.toLocaleString('en-PK') : ''),
                },
                {
                  key: 'b',
                  header: 'Balance',
                  align: 'right',
                  cell: (l) => <DrCr value={l.balance} currency="" />,
                },
              ]}
            />
          </Card>
        </>
      )}
    </Drawer>
  );
}

function AccountDialog({
  account,
  accounts,
  onClose,
}: {
  account: ChartAccountDto | 'new' | null;
  accounts: ChartAccountDto[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const editing = account && account !== 'new' ? account : null;
  const currencies = useQuery({
    queryKey: ['accounting', 'currencies'],
    queryFn: api.accounting.currencies,
  });
  const groups = accounts.filter((a) => a.isGroup && a.isActive && a.systemKey !== 'AR_CONTROL');
  const [form, setForm] = useState({
    code: '',
    name: '',
    parentId: '',
    isGroup: false,
    currency: 'PKR',
    description: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<unknown>(null);
  if (account !== openedFor) {
    setOpenedFor(account);
    setErrors({});
    setError(undefined);
    setForm(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            parentId: editing.parentId ?? '',
            isGroup: editing.isGroup,
            currency: editing.currency,
            description: editing.description ?? '',
            isActive: editing.isActive,
          }
        : {
            code: '',
            name: '',
            parentId: '',
            isGroup: false,
            currency: 'PKR',
            description: '',
            isActive: true,
          },
    );
  }
  const parent = accounts.find((a) => a.id === form.parentId);
  const managed = !!editing && (!!editing.systemKey || !!editing.partnerAccountId);

  const save = async () => {
    setBusy(true);
    setErrors({});
    setError(undefined);
    try {
      if (editing)
        await api.accounting.updateAccount(editing.id, {
          name: form.name,
          ...(managed ? {} : { code: form.code, parentId: form.parentId || null }),
          description: form.description,
          isActive: form.isActive,
        });
      else
        await api.accounting.createAccount({
          code: form.code,
          name: form.name,
          class: parent?.class ?? 'ASSET',
          parentId: form.parentId || null,
          isGroup: form.isGroup,
          currency: form.isGroup ? 'PKR' : form.currency,
          description: form.description,
        });
      void qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success(editing ? 'Account updated' : 'Account created');
      onClose();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!account}
      onOpenChange={(o) => !o && onClose()}
      title={editing ? `Edit ${editing.code}` : 'New account'}
      description={
        managed
          ? 'System and partner accounts keep their code and place in the chart.'
          : 'The class follows the group you put it under.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? 'Save' : 'Create account'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {error && !Object.keys(errors).length && (
          <Alert tone="danger" className="sm:col-span-2">
            {error}
          </Alert>
        )}
        <Field
          label="Under group"
          required
          className="sm:col-span-2"
          error={errors.parentId || errors.class}
        >
          <Select
            value={form.parentId}
            disabled={managed}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          >
            <option value="">Choose a group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id} disabled={g.id === editing?.id}>
                {g.code} · {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Code"
          required
          error={errors.code}
          hint={parent ? `Suggested: starts with ${parent.code.slice(0, 2)}` : undefined}
        >
          <Input
            value={form.code}
            disabled={managed}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        {!editing && (
          <>
            <Field
              label="Currency"
              error={errors.currency}
              hint="Foreign accounts take amounts with a manual rate"
            >
              <Select
                value={form.currency}
                disabled={form.isGroup}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {(currencies.data ?? [{ code: 'PKR', name: 'Pakistani rupee', isActive: true }])
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Type">
              <div className="flex h-9 items-center">
                <Checkbox
                  label="Group (holds other accounts)"
                  checked={form.isGroup}
                  onChange={(e) => setForm({ ...form, isGroup: e.target.checked })}
                />
              </div>
            </Field>
          </>
        )}
        <Field label="Description" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        {editing && !editing.systemKey && (
          <Field className="sm:col-span-2" error={errors.isActive}>
            <Checkbox
              label="Active (only accounts with a zero balance can be deactivated)"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
          </Field>
        )}
      </div>
    </Dialog>
  );
}
