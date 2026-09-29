import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, Lock, LockOpen, Plus } from 'lucide-react';
import { ApiError } from '@gnk/api-client';
import type { CurrencyDto } from '@gnk/types';
import { todayPk } from '@gnk/validation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  Input,
  PageHeader,
  formatDate,
  formatDateTime,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

export function SetupPage() {
  return (
    <RequirePerm perm="ledger:read">
      <PageHeader
        title="Currencies and periods"
        description="Books are kept in PKR. Foreign amounts are entered with a manual rate; the latest rate here is offered as the default."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Currencies />
        <Periods />
      </div>
      <p className="mt-6 text-[13px] text-muted-foreground">
        Journal voucher approval (maker-checker) is set in{' '}
        <Link to="/settings" className="text-link hover:underline">
          Settings
        </Link>
        .
      </p>
    </RequirePerm>
  );
}

function Currencies() {
  const can = useCan();
  const q = useQuery({
    queryKey: ['accounting', 'currencies'],
    queryFn: api.accounting.currencies,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [rateFor, setRateFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<CurrencyDto | 'new' | null>(null);
  const rates = useQuery({
    queryKey: ['accounting', 'rates', selected],
    queryFn: () => api.accounting.rates(selected!),
    enabled: !!selected,
  });
  return (
    <Card>
      <CardHeader
        title="Currencies and rates"
        description="Rate = PKR for one unit of the currency."
        actions={
          can('ledger:coa') && (
            <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
              <Plus /> Currency
            </Button>
          )
        }
      />
      {q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          rows={q.data}
          loading={q.isLoading}
          rowKey={(c) => c.code}
          selectedKey={selected}
          onRowClick={(c) => setSelected(c.code === 'PKR' ? null : c.code)}
          columns={[
            {
              key: 'c',
              header: 'Currency',
              cell: (c) => (
                <div className="flex items-center gap-2">
                  <span className="tabular font-semibold">{c.code}</span>
                  <span className="text-muted-foreground">{c.name}</span>
                  {c.code === 'PKR' && <Badge tone="primary">Base</Badge>}
                  {!c.isActive && <Badge>Inactive</Badge>}
                </div>
              ),
            },
            {
              key: 'r',
              header: 'Latest rate',
              align: 'right',
              cell: (c) =>
                c.code === 'PKR' ? (
                  '—'
                ) : c.latestRate ? (
                  <span>
                    {c.latestRate}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDate(c.latestRateDate)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                ),
            },
            {
              key: 'a',
              header: '',
              align: 'right',
              cell: (c) =>
                c.code !== 'PKR' &&
                can('ledger:coa') && (
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="secondary" onClick={() => setRateFor(c.code)}>
                      New rate
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setEditing(c)}>
                      Edit
                    </Button>
                  </div>
                ),
            },
          ]}
        />
      )}
      {selected && (
        <div className="border-t border-border/70">
          <p className="px-5 pt-4 text-[13px] font-semibold">{selected} rate history</p>
          <DataTable
            dense
            rows={rates.data}
            loading={rates.isLoading}
            rowKey={(r) => r.id}
            columns={[
              { key: 'd', header: 'Date', cell: (r) => formatDate(r.date) },
              { key: 'r', header: 'Rate', align: 'right', cell: (r) => r.rate },
              {
                key: 'n',
                header: 'Note',
                hideBelow: 'md',
                cell: (r) => <span className="text-muted-foreground">{r.note}</span>,
              },
              {
                key: 'b',
                header: 'Entered by',
                hideBelow: 'lg',
                cell: (r) => <span className="text-muted-foreground">{r.createdBy}</span>,
              },
            ]}
          />
        </div>
      )}
      <RateDialog currency={rateFor} onClose={() => setRateFor(null)} />
      <CurrencyDialog currency={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}

function RateDialog({ currency, onClose }: { currency: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(todayPk());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.accounting.addRate({ currency: currency!, rate: Number(rate), date, note });
      void qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success(`${currency} rate saved`);
      setRate('');
      setNote('');
      onClose();
    } catch (e) {
      setErrors(
        e instanceof ApiError ? { ...e.fieldErrors, _: e.message } : { _: (e as Error).message },
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={!!currency}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title={`New ${currency} rate`}
      description="Used as the default in new vouchers. Each voucher line can still override it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save rate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errors._ && !errors.rate && <Alert tone="danger">{errors._}</Alert>}
        <Field label={`PKR per 1 ${currency}`} required error={errors.rate}>
          <Input
            type="number"
            step="0.000001"
            min={0}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Effective date" required error={errors.date}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Open market, HBL"
          />
        </Field>
      </div>
    </Dialog>
  );
}

function CurrencyDialog({
  currency,
  onClose,
}: {
  currency: CurrencyDto | 'new' | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const editing = currency && currency !== 'new' ? currency : null;
  const [form, setForm] = useState({ code: '', name: '', symbol: '', isActive: true });
  const [seen, setSeen] = useState<unknown>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (currency !== seen) {
    setSeen(currency);
    setError(undefined);
    setForm(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            symbol: editing.symbol ?? '',
            isActive: editing.isActive,
          }
        : { code: '', name: '', symbol: '', isActive: true },
    );
  }
  const save = async () => {
    setBusy(true);
    try {
      await api.accounting.saveCurrency(form);
      void qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Currency saved');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={!!currency}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title={editing ? `Edit ${editing.code}` : 'Add currency'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {error && (
          <Alert tone="danger" className="sm:col-span-2">
            {error}
          </Alert>
        )}
        <Field label="Code" required>
          <Input
            value={form.code}
            disabled={!!editing}
            maxLength={3}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="SAR"
          />
        </Field>
        <Field label="Symbol">
          <Input
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          />
        </Field>
        <Field label="Name" required className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Saudi riyal"
          />
        </Field>
        <Checkbox
          className="sm:col-span-2"
          label="Active"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
      </div>
    </Dialog>
  );
}

function Periods() {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['accounting', 'periods'], queryFn: api.accounting.periods });
  const [target, setTarget] = useState<{ month: string; close: boolean } | null>(null);
  const label = (m: string) =>
    new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
      new Date(`${m}-01T00:00:00Z`),
    );
  return (
    <Card>
      <CardHeader
        title="Accounting periods"
        description="Close a month once it is reconciled. Nothing can be posted into a closed month."
        icon={<CalendarCheck2 className="size-4" />}
      />
      {q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          rows={q.data}
          loading={q.isLoading}
          rowKey={(p) => p.month}
          columns={[
            {
              key: 'm',
              header: 'Month',
              cell: (p) => <span className="font-medium">{label(p.month)}</span>,
            },
            {
              key: 'v',
              header: 'Vouchers',
              align: 'right',
              hideBelow: 'sm',
              cell: (p) => p.vouchers,
            },
            {
              key: 's',
              header: 'Status',
              cell: (p) =>
                p.closed ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <Lock className="size-3.5 text-muted-foreground" /> Closed
                    <span className="hidden text-xs text-muted-foreground md:inline">
                      {p.closedBy} · {formatDateTime(p.closedAt)}
                    </span>
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">Open</span>
                ),
            },
            {
              key: 'a',
              header: '',
              align: 'right',
              cell: (p) =>
                can('ledger:periods') && (
                  <Button
                    size="xs"
                    variant={p.closed ? 'ghost' : 'secondary'}
                    onClick={() => setTarget({ month: p.month, close: !p.closed })}
                  >
                    {p.closed ? (
                      <>
                        <LockOpen /> Reopen
                      </>
                    ) : (
                      <>
                        <Lock /> Close
                      </>
                    )}
                  </Button>
                ),
            },
          ]}
        />
      )}
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target ? `${target.close ? 'Close' : 'Reopen'} ${label(target.month)}?` : ''}
        description={
          target?.close
            ? 'Postings dated in this month will be refused until it is reopened.'
            : 'Vouchers can be posted into this month again. This is recorded in the audit log.'
        }
        confirmLabel={target?.close ? 'Close month' : 'Reopen month'}
        tone={target?.close ? 'primary' : 'danger'}
        onConfirm={async () => {
          if (!target) return;
          await (target.close
            ? api.accounting.closePeriod(target.month)
            : api.accounting.reopenPeriod(target.month));
          void qc.invalidateQueries({ queryKey: ['accounting', 'periods'] });
          toast.success(target.close ? 'Month closed' : 'Month reopened');
        }}
      />
    </Card>
  );
}
