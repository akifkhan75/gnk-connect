import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Check, FileText, Paperclip, Plus, Scale, Trash2, X } from 'lucide-react';
import { ApiError } from '@gnk/api-client';
import type { AccountOption, VoucherDto } from '@gnk/types';
import { todayPk, toBaseAmount, type VoucherInput } from '@gnk/validation';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  Field,
  FileDrop,
  Input,
  SegmentedControl,
  Spinner,
  cn,
  formatBytes,
  formatMoney,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { AccountPicker } from '@/components/AccountPicker';
import { PAYEE_LABEL, type PaymentPayee } from './voucher-home';

type Kind = 'JOURNAL' | 'PAYMENT' | 'RECEIPT';
type Side = 'DEBIT' | 'CREDIT';

interface Line {
  key: string;
  accountId: string | null;
  side: Side;
  amount: string; // PKR
  fcAmount: string;
  rate: string;
  narration: string;
}

const TITLES: Record<Kind, string> = {
  JOURNAL: 'Journal voucher',
  PAYMENT: 'Payment',
  RECEIPT: 'Receipt',
};
const HELP: Record<Kind, string> = {
  JOURNAL: 'Transfers between accounts. Needs approval by someone other than you before it posts.',
  PAYMENT: 'Money going out of cash or bank to a supplier, an expense, or staff.',
  RECEIPT: 'Money coming into a bank or cash account that is not recorded as a partner deposit.',
};
const PAYEE_PLACEHOLDER: Record<PaymentPayee, string> = {
  SUPPLIER: 'e.g. Paid Al Haram Hotels for October block',
  EXPENSE: 'e.g. Office rent for October',
  STAFF: 'e.g. September salaries',
};

let seq = 0;
const blank = (side: Side = 'DEBIT'): Line => ({
  key: `l${++seq}`,
  accountId: null,
  side,
  amount: '',
  fcAmount: '',
  rate: '',
  narration: '',
});
const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
const opt = (s: string) => (Number.isFinite(num(s)) ? num(s) : undefined);
export function VoucherFormDialog({
  open,
  type = 'JOURNAL',
  payee,
  id,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  type?: Kind;
  payee?: PaymentPayee;
  id?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (id: string) => void;
}) {
  const title = id
    ? 'Edit voucher'
    : type === 'PAYMENT'
      ? 'New payment'
      : `New ${TITLES[type].toLowerCase()}`;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={id ? 'Update this draft and save, submit, or post.' : HELP[type]}
      size="full"
    >
      {open ? (
        <Editor
          key={`${id ?? type}-${payee ?? ''}`}
          id={id}
          initialType={type}
          initialPayee={payee}
          onClose={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function Editor({
  id,
  initialType,
  initialPayee,
  onClose,
  onSaved,
}: {
  id?: string;
  initialType: Kind;
  initialPayee?: PaymentPayee;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const can = useCan();
  const existing = useQuery({
    queryKey: ['accounting', 'voucher', id],
    queryFn: () => api.accounting.voucher(id!),
    enabled: !!id,
  });
  const options = useQuery({
    queryKey: ['accounting', 'options'],
    queryFn: api.accounting.options,
  });
  const currencies = useQuery({
    queryKey: ['accounting', 'currencies'],
    queryFn: api.accounting.currencies,
  });

  const [kind, setKind] = useState<Kind>(initialType);
  const [payee, setPayee] = useState<PaymentPayee>(initialPayee ?? 'SUPPLIER');
  const [mode, setMode] = useState<'simple' | 'lines'>(kind === 'JOURNAL' ? 'lines' : 'simple');
  const [date, setDate] = useState(todayPk());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>(() =>
    kind === 'JOURNAL' ? [blank('DEBIT'), blank('CREDIT')] : simpleLines(kind),
  );
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load an existing draft into the editor once.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const v = existing.data;
    if (!v || loaded) return;
    setLoaded(true);
    setKind(v.type as Kind);
    setDate(v.date);
    setDescription(v.description);
    setLines(v.lines.map(fromDto));
    setMode(v.type !== 'JOURNAL' && v.lines.length === 2 ? 'simple' : 'lines');
    setAttachments(
      v.attachments.map((a) => ({ id: a.id, name: a.originalName, size: a.sizeBytes })),
    );
  }, [existing.data, loaded]);

  const byId = useMemo(() => new Map((options.data ?? []).map((o) => [o.id, o])), [options.data]);
  useEffect(() => {
    if (kind !== 'PAYMENT') return;
    const other = lines[1];
    const acc = other?.accountId ? byId.get(other.accountId) : undefined;
    if (!acc) return;
    const next: PaymentPayee = matchesPayee(acc, 'SUPPLIER')
      ? 'SUPPLIER'
      : matchesPayee(acc, 'STAFF')
        ? 'STAFF'
        : matchesPayee(acc, 'EXPENSE')
          ? 'EXPENSE'
          : payee;
    if (next !== payee) setPayee(next);
  }, [byId, kind, lines, payee]);
  const rateFor = (currency: string) =>
    currencies.data?.find((c) => c.code === currency)?.latestRate ?? null;

  /** PKR value of a line: typed for PKR accounts, fcAmount × rate for foreign ones. */
  const pkrOf = (l: Line) => {
    const acc = l.accountId ? byId.get(l.accountId) : undefined;
    if (acc && acc.currency !== 'PKR') {
      const fc = num(l.fcAmount);
      const rate = num(l.rate);
      return Number.isFinite(fc) && Number.isFinite(rate) && fc > 0 && rate > 0
        ? toBaseAmount(fc, rate)
        : 0;
    }
    const n = num(l.amount);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const cents = (n: number) => Math.round(n * 100);
  const debit =
    lines.filter((l) => l.side === 'DEBIT').reduce((s, l) => s + cents(pkrOf(l)), 0) / 100;
  const credit =
    lines.filter((l) => l.side === 'CREDIT').reduce((s, l) => s + cents(pkrOf(l)), 0) / 100;
  const diff = Math.round((debit - credit) * 100) / 100;
  const hasFc = lines.some(
    (l) => (l.accountId ? byId.get(l.accountId)?.currency : 'PKR') !== 'PKR',
  );
  const fxAccount = options.data?.find((o) => o.systemKey === 'FX');

  const update = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const setAccount = (key: string, a: AccountOption) => {
    const line = lines.find((l) => l.key === key)!;
    const foreign = a.currency !== 'PKR';
    update(key, {
      accountId: a.id,
      ...(foreign && !line.rate ? { rate: String(rateFor(a.currency) ?? '') } : {}),
    });
  };

  // Simple (two-line) receipts and payments keep the bank line equal to the counter line.
  const counter = lines[1];
  const counterPkr = counter ? pkrOf(counter) : 0;
  useEffect(() => {
    if (mode !== 'simple' || lines.length !== 2) return;
    const want = counterPkr ? String(counterPkr) : '';
    if (lines[0].amount !== want) update(lines[0].key, { amount: want });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, counterPkr]);

  const addFxDifference = () => {
    if (!fxAccount || !diff) return;
    setLines((ls) => [
      ...ls,
      {
        ...blank(diff > 0 ? 'CREDIT' : 'DEBIT'),
        accountId: fxAccount.id,
        amount: String(Math.abs(diff)),
        narration: 'Exchange difference',
      },
    ]);
  };

  const upload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const f = await api.files.upload(file, 'VOUCHER');
      setAttachments((a) => [...a, { id: f.id, name: f.originalName, size: f.sizeBytes }]);
    } catch (e) {
      toast.error('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const payload = (): VoucherInput => ({
    type: kind,
    date,
    description,
    attachmentIds: attachments.map((a) => a.id),
    lines: lines
      .filter((l) => l.accountId)
      .map((l) => {
        const acc = byId.get(l.accountId!);
        const foreign = acc && acc.currency !== 'PKR';
        return {
          accountId: l.accountId!,
          side: l.side,
          ...(foreign
            ? { fcAmount: opt(l.fcAmount), rate: opt(l.rate) }
            : { amount: opt(l.amount) }),
          narration: l.narration || undefined,
        };
      }),
  });

  const save = async (action: 'draft' | 'submit' | 'post') => {
    setError(undefined);
    setFieldErrors({});
    if (!description.trim()) return setError('Enter a narration for the voucher.');
    if (action !== 'draft' && diff !== 0)
      return setError('Debits and credits must be equal before you can submit or post.');
    setBusy(action);
    try {
      let v: VoucherDto;
      if (id) {
        v = await api.accounting.updateVoucher(id, payload());
        if (action === 'submit') v = await api.accounting.submitVoucher(id);
        if (action === 'post') v = await api.accounting.postVoucher(id);
      } else v = await api.accounting.createVoucher(payload(), action);
      void qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success(
        action === 'draft'
          ? 'Draft saved'
          : action === 'submit'
            ? 'Sent for approval'
            : `${v.reference} posted`,
      );
      onSaved(v.id);
    } catch (e) {
      if (e instanceof ApiError) {
        setFieldErrors(e.fieldErrors);
        setError(e.message);
      } else setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (id && existing.isLoading) return <Spinner className="py-16" />;
  if (existing.data && !existing.data.allowedActions.includes('edit'))
    return (
      <Alert tone="warning" title="This voucher can't be edited">
        Only drafts and returned vouchers can be changed. Posted vouchers are corrected with a
        reversal.
      </Alert>
    );

  const canPost = kind === 'JOURNAL' ? false : can('ledger:post');
  const lineError = (i: number) =>
    Object.entries(fieldErrors).find(([k]) => k.startsWith(`lines.${i}.`))?.[1];

  return (
    <div>
      {existing.data?.status === 'REJECTED' && existing.data.rejectionReason && (
        <Alert tone="warning" title="Returned by the approver" className="mb-5">
          {existing.data.rejectionReason}
        </Alert>
      )}

      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field label="Date" required error={fieldErrors.date}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Narration" required error={fieldErrors.description}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                kind === 'PAYMENT'
                  ? PAYEE_PLACEHOLDER[payee]
                  : kind === 'RECEIPT'
                    ? 'e.g. Refund received from airline'
                    : 'e.g. Recharge hotel block to Al Noor Travels'
              }
              maxLength={300}
            />
          </Field>
          {kind === 'PAYMENT' && (
            <Field label="Pay" className="sm:col-span-2">
              <SegmentedControl
                value={payee}
                onChange={(next) => {
                  setPayee(next);
                  const other = lines[1];
                  if (!other?.accountId) return;
                  const acc = byId.get(other.accountId);
                  if (acc && !matchesPayee(acc, next)) update(other.key, { accountId: null });
                }}
                items={(Object.keys(PAYEE_LABEL) as PaymentPayee[]).map((value) => ({
                  value,
                  label: PAYEE_LABEL[value],
                }))}
              />
            </Field>
          )}
        </CardBody>
      </Card>

      <Card className="mb-5">
        <CardHeader
          title="Entries"
          description={
            hasFc
              ? 'Foreign-currency lines: enter the amount and rate; PKR is calculated.'
              : 'Every voucher must balance: total debits equal total credits.'
          }
          actions={
            kind !== 'JOURNAL' && (
              <SegmentedControl
                size="sm"
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  if (m === 'simple' && lines.length !== 2) setLines(simpleLines(kind));
                }}
                items={[
                  { value: 'simple', label: 'Simple' },
                  { value: 'lines', label: 'Split lines' },
                ]}
              />
            )
          }
        />
        <CardBody className="p-0">
          {mode === 'simple' && lines.length === 2 ? (
            <SimpleEntry
              kind={kind}
              payee={kind === 'PAYMENT' ? payee : undefined}
              lines={lines}
              byId={byId}
              options={options.data}
              pkrOf={pkrOf}
              onAccount={setAccount}
              onChange={update}
              error={lineError(0) ?? lineError(1)}
            />
          ) : (
            <div className="divide-y divide-border/60">
              <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px_140px_36px] gap-3 px-5 py-2 text-[12px] font-medium text-muted-foreground md:grid">
                <span>Account</span>
                <span>Line narration</span>
                <span className="text-right">Debit (PKR)</span>
                <span className="text-right">Credit (PKR)</span>
                <span />
              </div>
              {lines.map((l, i) => {
                const acc = l.accountId ? byId.get(l.accountId) : undefined;
                const foreign = !!acc && acc.currency !== 'PKR';
                const pkr = pkrOf(l);
                return (
                  <div key={l.key} className="px-5 py-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px_140px_36px] md:items-start">
                      <AccountPicker
                        options={options.data}
                        value={l.accountId}
                        onChange={(a) => setAccount(l.key, a)}
                        invalid={!!lineError(i)}
                      />
                      <Input
                        value={l.narration}
                        onChange={(e) => update(l.key, { narration: e.target.value })}
                        placeholder="Optional"
                        maxLength={200}
                      />
                      {(['DEBIT', 'CREDIT'] as const).map((side) =>
                        foreign ? (
                          <div
                            key={side}
                            className={cn(
                              'flex h-9 items-center justify-end rounded-lg px-3 text-sm tabular',
                              l.side === side ? 'bg-muted font-medium' : 'text-muted-foreground/40',
                            )}
                          >
                            {l.side === side
                              ? pkr
                                ? formatMoney(pkr, { decimals: true, currency: false })
                                : '—'
                              : ''}
                          </div>
                        ) : (
                          <Input
                            key={side}
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="text-right tabular"
                            aria-label={side === 'DEBIT' ? 'Debit' : 'Credit'}
                            value={l.side === side ? l.amount : ''}
                            placeholder="0.00"
                            onChange={(e) => update(l.key, { side, amount: e.target.value })}
                          />
                        ),
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove line"
                        disabled={lines.length <= 2}
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {foreign && (
                      <FcRow
                        line={l}
                        currency={acc!.currency}
                        pkr={pkr}
                        onChange={(p) => update(l.key, p)}
                      />
                    )}
                    {lineError(i) && (
                      <p className="mt-1.5 text-xs font-medium text-danger">{lineError(i)}</p>
                    )}
                  </div>
                );
              })}
              <div className="px-5 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLines((ls) => [...ls, blank(diff > 0 ? 'CREDIT' : 'DEBIT')])}
                >
                  <Plus /> Add line
                </Button>
              </div>
            </div>
          )}
        </CardBody>
        <Totals debit={debit} credit={credit} diff={diff}>
          {diff !== 0 && hasFc && fxAccount && (
            <Button variant="secondary" size="sm" onClick={addFxDifference}>
              <ArrowLeftRight /> Post difference to exchange gain/loss
            </Button>
          )}
        </Totals>
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Attachments"
          description="Bills, bank advice or approvals supporting this voucher."
          icon={<Paperclip className="size-4" />}
        />
        <CardBody className="space-y-3">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{a.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
              <button
                type="button"
                aria-label="Remove attachment"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setAttachments((xs) => xs.filter((x) => x.id !== a.id))}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {attachments.length < 10 && (
            <FileDrop
              value={null}
              onChange={upload}
              disabled={uploading}
              label={uploading ? 'Uploading…' : 'Drop a file or click to attach'}
            />
          )}
        </CardBody>
      </Card>

      {error && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-surface px-6 py-3">
        <span className="mr-auto pl-0 text-[13px] text-muted-foreground">
          {diff === 0 && debit > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <Check className="size-4" /> Balanced · {formatMoney(debit, { decimals: true })}
            </span>
          ) : (
            'Not balanced yet'
          )}
        </span>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => save('draft')} loading={busy === 'draft'}>
          Save draft
        </Button>
        {kind === 'JOURNAL' ? (
          <Button
            onClick={() => save('submit')}
            loading={busy === 'submit'}
            disabled={diff !== 0 || !debit}
          >
            Submit for approval
          </Button>
        ) : (
          canPost && (
            <Button
              onClick={() => save('post')}
              loading={busy === 'post'}
              disabled={diff !== 0 || !debit}
            >
              Post voucher
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function simpleLines(kind: Kind): Line[] {
  // Line 0 is the bank/cash account; line 1 the other side.
  return kind === 'PAYMENT' ? [blank('CREDIT'), blank('DEBIT')] : [blank('DEBIT'), blank('CREDIT')];
}

function fromDto(l: VoucherDto['lines'][number]): Line {
  return {
    key: `l${++seq}`,
    accountId: l.accountId,
    side: l.debit > 0 ? 'DEBIT' : 'CREDIT',
    amount: String(l.debit || l.credit || ''),
    fcAmount: l.fcAmount != null ? String(l.fcAmount) : '',
    rate: l.rate != null ? String(l.rate) : '',
    narration: l.narration ?? '',
  };
}

function FcRow({
  line,
  currency,
  pkr,
  onChange,
}: {
  line: Line;
  currency: string;
  pkr: number;
  onChange: (p: Partial<Line>) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-highlight-soft/60 px-3 py-2 text-[13px]">
      <SegmentedControl
        size="sm"
        value={line.side}
        onChange={(side) => onChange({ side })}
        items={[
          { value: 'DEBIT', label: 'Debit' },
          { value: 'CREDIT', label: 'Credit' },
        ]}
      />
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-highlight-strong">{currency}</span>
        <Input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          className="h-8 w-32 text-right tabular"
          placeholder="Amount"
          aria-label={`${currency} amount`}
          value={line.fcAmount}
          onChange={(e) => onChange({ fcAmount: e.target.value })}
        />
      </div>
      <span className="text-muted-foreground">×</span>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Rate</span>
        <Input
          type="number"
          min={0}
          step="0.000001"
          inputMode="decimal"
          className="h-8 w-28 text-right tabular"
          aria-label="Conversion rate (PKR per unit)"
          value={line.rate}
          onChange={(e) => onChange({ rate: e.target.value })}
        />
      </div>
      <span className="text-muted-foreground">=</span>
      <span className="tabular font-semibold">{formatMoney(pkr, { decimals: true })}</span>
      <span className="text-[12px] text-muted-foreground">calculated</span>
    </div>
  );
}

function matchesPayee(a: AccountOption, payee: PaymentPayee) {
  const hay = `${a.path} ${a.name} ${a.systemKey ?? ''}`.toLowerCase();
  if (payee === 'SUPPLIER') return a.systemKey === 'SUPPLIER_PAYABLE' || hay.includes('supplier');
  if (payee === 'STAFF')
    return a.class === 'EXPENSE' && /salary|salaries|wage|staff|payroll/.test(hay);
  return a.class === 'EXPENSE';
}

function payeeFilter(
  payee: PaymentPayee | undefined,
  bankId: string | null,
  options?: AccountOption[],
  selectedId?: string | null,
) {
  return (a: AccountOption) => {
    if (a.id === bankId) return false;
    if (selectedId && a.id === selectedId) return true;
    if (!payee) return true;
    const match = matchesPayee(a, payee);
    if (match) return true;
    const any = (options ?? []).some((o) => o.id !== bankId && matchesPayee(o, payee));
    return !any;
  };
}

function SimpleEntry({
  kind,
  payee,
  lines,
  byId,
  options,
  pkrOf,
  onAccount,
  onChange,
  error,
}: {
  kind: Kind;
  payee?: PaymentPayee;
  lines: Line[];
  byId: Map<string, AccountOption>;
  options: AccountOption[] | undefined;
  pkrOf: (l: Line) => number;
  onAccount: (key: string, a: AccountOption) => void;
  onChange: (key: string, p: Partial<Line>) => void;
  error?: string;
}) {
  const [bank, other] = lines;
  const acc = other.accountId ? byId.get(other.accountId) : undefined;
  const foreign = !!acc && acc.currency !== 'PKR';
  const paidTo =
    payee === 'SUPPLIER'
      ? 'Paid to (supplier)'
      : payee === 'STAFF'
        ? 'Paid to (salary or staff)'
        : payee === 'EXPENSE'
          ? 'Paid to (expense)'
          : 'Paid to';
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2">
      <Field
        label={kind === 'PAYMENT' ? 'Paid from (bank or cash)' : 'Received into (bank or cash)'}
        required
      >
        <AccountPicker
          options={options}
          value={bank.accountId}
          onChange={(a) => onAccount(bank.key, a)}
          preset="cash-bank"
          placeholder="Choose bank or cash"
        />
      </Field>
      <Field label={kind === 'PAYMENT' ? paidTo : 'Received from (income or other)'} required>
        <AccountPicker
          options={options}
          value={other.accountId}
          onChange={(a) => onAccount(other.key, a)}
          filter={payeeFilter(payee, bank.accountId, options, other.accountId)}
          placeholder={
            payee === 'SUPPLIER'
              ? 'Search supplier payable'
              : payee === 'STAFF'
                ? 'Search salary or staff account'
                : payee === 'EXPENSE'
                  ? 'Search expense account'
                  : 'Search account'
          }
        />
      </Field>
      {foreign ? (
        <div className="sm:col-span-2">
          <FcRow
            line={other}
            currency={acc!.currency}
            pkr={pkrOf(other)}
            onChange={(p) => onChange(other.key, { ...p, side: other.side })}
          />
        </div>
      ) : (
        <Field label="Amount (PKR)" required>
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="tabular"
            value={other.amount}
            onChange={(e) => onChange(other.key, { amount: e.target.value })}
            placeholder="0.00"
          />
        </Field>
      )}
      {error && <p className="text-xs font-medium text-danger sm:col-span-2">{error}</p>}
    </div>
  );
}

function Totals({
  debit,
  credit,
  diff,
  children,
}: {
  debit: number;
  credit: number;
  diff: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 border-t border-border/70 bg-surface-sunken/50 px-5 py-3 text-sm">
      {children && <div className="mr-auto">{children}</div>}
      <span className="text-muted-foreground">
        Debits{' '}
        <span className="tabular ml-1 font-semibold text-foreground">
          {formatMoney(debit, { decimals: true })}
        </span>
      </span>
      <span className="text-muted-foreground">
        Credits{' '}
        <span className="tabular ml-1 font-semibold text-foreground">
          {formatMoney(credit, { decimals: true })}
        </span>
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
          !debit && !credit
            ? 'bg-muted text-muted-foreground'
            : diff === 0
              ? 'bg-success-soft text-success'
              : 'bg-danger-soft text-danger',
        )}
      >
        <Scale className="size-3.5" />
        {!debit && !credit
          ? 'Enter amounts'
          : diff === 0
            ? 'Balanced'
            : `Difference ${formatMoney(Math.abs(diff), { decimals: true })}`}
      </span>
    </div>
  );
}
