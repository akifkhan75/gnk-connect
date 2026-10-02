import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  Download,
  Lock,
  LockKeyhole,
  MoreHorizontal,
  Network,
  Pencil,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';
import type { AccountClass, ChartAccountDto } from '@gnk/types';
import { todayPk } from '@gnk/validation';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  cn,
  filterPage,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { useCan } from '@/lib/useCan';
import { DrCr } from '@/components/AccountPicker';
import { RequirePerm } from '@/components/guards';
import { AccountFormDialog } from './AccountFormDialog';

const CATEGORIES: { value: AccountClass | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All categories' },
  { value: 'ASSET', label: 'Assets' },
  { value: 'LIABILITY', label: 'Liabilities' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expenses' },
];

type CoaView = 'tree' | 'flat';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type KindFilter = 'ALL' | 'POSTABLE' | 'GROUP';

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
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => api.accounting.accounts(),
  });
  const [view, setView] = useState<CoaView>('tree');
  const [search, setSearch] = useState('');
  const [cls, setCls] = useState<AccountClass | 'ALL'>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [currency, setCurrency] = useState('ALL');
  const [showSystem, setShowSystem] = useState(true);
  const [page, setPage] = useState(1);
  // Partner receivables can be many: keep 1200 collapsed until asked.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['AR']));
  const [editing, setEditing] = useState<ChartAccountDto | 'new' | null>(null);
  const [confirm, setConfirm] = useState<{
    account: ChartAccountDto;
    action: 'deactivate' | 'lock' | 'delete';
  } | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const byId = useMemo(() => new Map((q.data ?? []).map((a) => [a.id, a])), [q.data]);
  const currencies = useMemo(
    () => [...new Set((q.data ?? []).map((a) => a.currency))].sort(),
    [q.data],
  );

  const matches = useMemo(() => {
    const all = q.data ?? [];
    const s = search.trim().toLowerCase();
    return all.filter((a) => {
      if (cls !== 'ALL' && a.class !== cls) return false;
      if (status === 'ACTIVE' && !a.isActive) return false;
      if (status === 'INACTIVE' && a.isActive) return false;
      if (kind === 'POSTABLE' && a.isGroup) return false;
      if (kind === 'GROUP' && !a.isGroup) return false;
      if (currency !== 'ALL' && a.currency !== currency) return false;
      if (!showSystem && a.systemKey) return false;
      if (s) {
        const parent = a.parentId ? byId.get(a.parentId) : undefined;
        const hay = [a.code, a.name, a.class, parent?.code, parent?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [q.data, byId, cls, status, kind, currency, showSystem, search]);

  const rows = useMemo<Row[]>(() => {
    if (view === 'flat') {
      return [...matches]
        .sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name))
        .map((a) => ({ ...a, depth: 0, hasChildren: false }));
    }

    const visible = new Map(matches.map((a) => [a.id, a]));
    for (const a of matches) {
      let p = a.parentId ? byId.get(a.parentId) : undefined;
      while (p && !visible.has(p.id)) {
        visible.set(p.id, p);
        p = p.parentId ? byId.get(p.parentId) : undefined;
      }
    }
    const children = new Map<string | null, ChartAccountDto[]>();
    for (const a of visible.values()) {
      const parentKey = a.parentId && visible.has(a.parentId) ? a.parentId : null;
      children.set(parentKey, [...(children.get(parentKey) ?? []), a]);
    }
    for (const list of children.values()) list.sort((a, b) => a.code.localeCompare(b.code));
    const out: Row[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const a of children.get(parent) ?? []) {
        const kids = children.get(a.id) ?? [];
        out.push({ ...a, depth, hasChildren: kids.length > 0 });
        const isCollapsed =
          collapsed.has(a.id) || (a.systemKey === 'AR_CONTROL' && collapsed.has('AR'));
        if (!isCollapsed) walk(a.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [matches, byId, collapsed, view]);

  const hasFilters =
    !!search.trim() ||
    cls !== 'ALL' ||
    status !== 'ALL' ||
    kind !== 'ALL' ||
    currency !== 'ALL' ||
    !showSystem;
  const clearFilters = () => {
    setSearch('');
    setCls('ALL');
    setStatus('ALL');
    setKind('ALL');
    setCurrency('ALL');
    setShowSystem(true);
    setPage(1);
  };
  const paged =
    view === 'flat'
      ? filterPage(rows, { page, pageSize: 25 })
      : { items: rows, page: 1, pageSize: rows.length || 25, total: rows.length };

  const collapseKey = (a: ChartAccountDto) => (a.systemKey === 'AR_CONTROL' ? 'AR' : a.id);
  const toggle = (a: Row) =>
    setCollapsed((c) => {
      const n = new Set(c);
      const key = collapseKey(a);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const isOpen = (a: Row) => !collapsed.has(collapseKey(a));
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const ids = new Set<string>();
    for (const a of q.data ?? []) {
      if (a.systemKey === 'AR_CONTROL') ids.add('AR');
      else if ((q.data ?? []).some((x) => x.parentId === a.id)) ids.add(a.id);
    }
    setCollapsed(ids);
  };
  const parentLabel = (a: ChartAccountDto) => {
    const p = a.parentId ? byId.get(a.parentId) : undefined;
    return p ? `${p.code} ${p.name}` : '—';
  };

  return (
    <>
      <PageHeader
        title="Chart of accounts"
        description="Every account the books use. Groups organise the tree; you post to the accounts inside them."
        actions={
          <>
            <SegmentedControl
              size="sm"
              value={view}
              onChange={(v) => {
                setView(v);
                setPage(1);
              }}
              items={[
                { value: 'tree', label: 'Hierarchy' },
                { value: 'flat', label: 'Flat' },
              ]}
            />
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
                    'Locked',
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
                    a.isLocked ? 'yes' : 'no',
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
      <Card>
        <div className="space-y-3 border-b border-border/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              className="min-w-[16rem] flex-1"
              placeholder="Search code, name, parent, category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              className="w-40 shrink-0"
              value={cls}
              onChange={(e) => {
                setCls(e.target.value as AccountClass | 'ALL');
                setPage(1);
              }}
              aria-label="Category"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select
              className="w-36 shrink-0"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(1);
              }}
              aria-label="Status"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
            <Select
              className="w-44 shrink-0"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as KindFilter);
                setPage(1);
              }}
              aria-label="Account type"
            >
              <option value="ALL">All account types</option>
              <option value="POSTABLE">Postable only</option>
              <option value="GROUP">Headers only</option>
            </Select>
            <Select
              className="w-36 shrink-0"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setPage(1);
              }}
              aria-label="Currency"
            >
              <option value="ALL">All currencies</option>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              label="Show system accounts"
              checked={showSystem}
              onChange={(e) => {
                setShowSystem(e.target.checked);
                setPage(1);
              }}
            />
            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {matches.length === 0
                  ? 'No accounts'
                  : `Showing ${matches.length} of ${q.data?.length ?? 0}`}
              </span>
              {hasFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>
        {view === 'tree' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2">
            <p className="text-xs text-muted-foreground">
              Hierarchy view — expand groups to see posting accounts
            </p>
            <div className="flex items-center gap-3">
              <Button variant="link" size="sm" onClick={expandAll}>
                Expand all
              </Button>
              <Button variant="link" size="sm" onClick={collapseAll}>
                Collapse all
              </Button>
            </div>
          </div>
        )}
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <DataTable
              rows={paged.items}
              loading={q.isLoading}
              rowKey={(a) => a.id}
              onRowClick={(a) =>
                view === 'tree' && a.isGroup
                  ? toggle(a)
                  : !a.isGroup
                    ? navigate(`/accounting/accounts/${a.id}`)
                    : undefined
              }
              rowClassName={(a) => (a.isActive && !a.isLocked ? undefined : 'opacity-50')}
              empty={<EmptyState icon={<Network />} title="No accounts match" />}
              columns={[
                {
                  key: 'n',
                  header: 'Account',
                  cell: (a) => (
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: view === 'tree' ? a.depth * 20 : 0 }}
                    >
                      {view === 'tree' ? (
                        a.hasChildren ? (
                          <ChevronRight
                            className={cn(
                              'size-3.5 shrink-0 text-muted-foreground transition-transform',
                              isOpen(a) && 'rotate-90',
                            )}
                          />
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )
                      ) : null}
                      <span className="tabular w-28 shrink-0 text-[12.5px] text-muted-foreground">
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
                      {!a.isActive && (
                        <Badge tone="neutral" className="shrink-0">
                          Inactive
                        </Badge>
                      )}
                      {a.isLocked && (
                        <Badge tone="gold" className="shrink-0">
                          Locked
                        </Badge>
                      )}
                    </div>
                  ),
                },
                ...(view === 'flat'
                  ? [
                      {
                        key: 'p',
                        header: 'Parent',
                        cell: (a: Row) => (
                          <span className="text-muted-foreground">{parentLabel(a)}</span>
                        ),
                      },
                    ]
                  : []),
                {
                  key: 'c',
                  header: 'Class',
                  hideBelow: 'md',
                  cell: (a) => (
                    <span className="text-muted-foreground">{a.class.toLowerCase()}</span>
                  ),
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
                {
                  key: 'a',
                  header: '',
                  align: 'right',
                  cell: (a) => (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <AccountActions
                        account={a}
                        canManage={can('ledger:coa')}
                        onView={() => navigate(`/accounting/accounts/${a.id}`)}
                        onEdit={() => setEditing(a)}
                        onConfirm={(action) => setConfirm({ account: a, action })}
                        onActivate={async () => {
                          await api.accounting.updateAccount(a.id, { isActive: true });
                          void qc.invalidateQueries({ queryKey: ['accounting'] });
                          toast.success('Account activated');
                        }}
                        onUnlock={async () => {
                          await api.accounting.updateAccount(a.id, { isLocked: false });
                          void qc.invalidateQueries({ queryKey: ['accounting'] });
                          toast.success('Account unlocked');
                        }}
                      />
                    </div>
                  ),
                },
              ]}
            />
            {view === 'flat' && (
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                onChange={setPage}
              />
            )}
          </>
        )}
      </Card>
      <AccountFormDialog
        account={editing}
        accounts={q.data ?? []}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={confirm?.action === 'deactivate'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Deactivate ${confirm?.account.code}?`}
        description="It drops out of voucher pickers. Only accounts with a zero balance can be deactivated."
        confirmLabel="Deactivate"
        tone="danger"
        onConfirm={async () => {
          await api.accounting.updateAccount(confirm!.account.id, { isActive: false });
          void qc.invalidateQueries({ queryKey: ['accounting'] });
          toast.success('Account deactivated');
        }}
      />
      <ConfirmDialog
        open={confirm?.action === 'lock'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Lock ${confirm?.account.code}?`}
        description="No new postings can hit this account until it is unlocked. Existing balances stay as they are."
        confirmLabel="Lock"
        onConfirm={async () => {
          await api.accounting.updateAccount(confirm!.account.id, { isLocked: true });
          void qc.invalidateQueries({ queryKey: ['accounting'] });
          toast.success('Account locked');
        }}
      />
      <ConfirmDialog
        open={confirm?.action === 'delete'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${confirm?.account.code}?`}
        description="Only accounts with no transactions and no children can be deleted. This cannot be undone."
        confirmLabel="Delete account"
        tone="danger"
        onConfirm={async () => {
          await api.accounting.deleteAccount(confirm!.account.id);
          void qc.invalidateQueries({ queryKey: ['accounting'] });
          toast.success('Account deleted');
        }}
      />
    </>
  );
}

function AccountActions({
  account,
  canManage,
  onView,
  onEdit,
  onConfirm,
  onActivate,
  onUnlock,
}: {
  account: ChartAccountDto;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onConfirm: (action: 'deactivate' | 'lock' | 'delete') => void;
  onActivate: () => Promise<void>;
  onUnlock: () => Promise<void>;
}) {
  const managed = !!account.systemKey || !!account.partnerAccountId;
  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.code}`}>
          <MoreHorizontal />
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onSelect={onView}>
          <BookOpen /> View ledger
        </DropdownItem>
        {canManage && (
          <>
            <DropdownItem onSelect={onEdit}>
              <Pencil /> Edit
            </DropdownItem>
            <DropdownSeparator />
            {account.systemKey ? null : account.isActive ? (
              <DropdownItem danger onSelect={() => onConfirm('deactivate')}>
                Deactivate
              </DropdownItem>
            ) : (
              <DropdownItem onSelect={() => void onActivate()}>Activate</DropdownItem>
            )}
            {account.isLocked ? (
              <DropdownItem onSelect={() => void onUnlock()}>
                <Unlock /> Unlock
              </DropdownItem>
            ) : (
              <DropdownItem onSelect={() => onConfirm('lock')}>
                <LockKeyhole /> Lock
              </DropdownItem>
            )}
            {!managed && (
              <>
                <DropdownSeparator />
                <DropdownItem danger onSelect={() => onConfirm('delete')}>
                  <Trash2 /> Delete
                </DropdownItem>
              </>
            )}
          </>
        )}
      </DropdownContent>
    </DropdownMenu>
  );
}
