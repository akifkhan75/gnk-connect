import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError } from '@gnk/api-client';
import { Eye, FileText, Landmark, Plus, ReceiptText, Wallet, X } from 'lucide-react';
import { todayPk } from '@gnk/validation';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CopyButton,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  FileDrop,
  Input,
  Money,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  formatDate,
  formatMoney,
  statusLabel,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { openBlob } from '@/lib/useFileUrl';
import { ApprovedGate, RoleGate, rolesWith } from '@/components/guards';

export function PaymentsPage() {
  return (
    <ApprovedGate>
      <RoleGate roles={rolesWith('payments:view')}>
        <Payments />
      </RoleGate>
    </ApprovedGate>
  );
}

function Payments() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('new') === '1');
  const payments = useQuery({ queryKey: keys.payments, queryFn: api.payments.list });
  const instructions = useQuery({
    queryKey: keys.instructions,
    queryFn: api.payments.instructions,
  });
  const balance = useQuery({ queryKey: keys.balance, queryFn: api.ledger.balance });

  useEffect(() => {
    if (params.get('new')) setParams({}, { replace: true });
  }, [params, setParams]);

  const pending =
    payments.data?.filter((p) => p.status === 'SUBMITTED').reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Payments and receipts"
        description="Deposit by bank transfer or cash, then submit the payment here with the slip. Once GNK approves it, your balance is credited and a receipt is issued."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Submit a payment
          </Button>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Account balance"
          value={<Money value={balance.data?.balance} signed />}
          icon={<Wallet />}
          tone="primary"
        />
        <StatCard
          label="Available to book"
          value={<Money value={balance.data?.availableFunds} />}
          hint={
            balance.data && `Includes credit of ${balance.data.creditLimit.toLocaleString('en-PK')}`
          }
          icon={<Wallet />}
          tone="gold"
        />
        <StatCard label="Awaiting approval" value={<Money value={pending} />} icon={<Landmark />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Payment history" />
          {payments.error ? (
            <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
          ) : (
            <DataTable
              rows={payments.data}
              loading={payments.isLoading}
              rowKey={(p) => p.id}
              empty={
                <EmptyState
                  icon={<Landmark />}
                  title="No payments recorded"
                  description="Record a deposit so GNK can credit your account."
                />
              }
              columns={[
                {
                  key: 'ref',
                  header: 'Payment',
                  cell: (p) => (
                    <div>
                      <p className="font-semibold tabular">{p.reference}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                    </div>
                  ),
                },
                {
                  key: 'via',
                  header: 'Method',
                  hideBelow: 'md',
                  cell: (p) => (
                    <div>
                      <p>{p.bankName ?? titleCase(p.method)}</p>
                      <p className="text-xs text-muted-foreground tabular">
                        Ref {p.transactionRef}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'bk',
                  header: 'Applied to',
                  hideBelow: 'lg',
                  cell: (p) =>
                    p.allocations.length ? (
                      <span className="tabular text-[13px]">
                        {p.allocations.map((a) => a.bookingReference).join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Account balance</span>
                    ),
                },
                {
                  key: 'amt',
                  header: 'Amount',
                  align: 'right',
                  cell: (p) => <Money value={p.amount} className="font-medium" />,
                },
                {
                  key: 'st',
                  header: 'Status',
                  align: 'right',
                  cell: (p) => (
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge
                        status={p.status}
                        label={
                          p.status === 'VERIFIED'
                            ? 'Approved'
                            : p.status === 'SUBMITTED'
                              ? 'Awaiting approval'
                              : undefined
                        }
                      />
                      {p.rejectionReason && (
                        <span className="max-w-48 text-right text-xs text-danger">
                          {p.rejectionReason}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'proof',
                  header: <span className="sr-only">Proof</span>,
                  align: 'right',
                  cell: (p) => (
                    <div className="flex justify-end gap-1">
                      {p.receipt && (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/payments/${p.id}/receipt`}>
                            <ReceiptText /> {p.receipt.number}
                          </Link>
                        </Button>
                      )}
                      {(p.attachments[0]?.id ?? p.proofFileId) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            openBlob(() => api.files.blob((p.attachments[0]?.id ?? p.proofFileId)!))
                          }
                          aria-label="View payment slip"
                        >
                          <Eye />
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Pay GNK Connect"
            description="Transfer to any of these accounts"
            icon={<Landmark className="size-4" />}
          />
          <CardBody className="space-y-4">
            {instructions.data?.bankAccounts.length ? (
              instructions.data.bankAccounts.map((b) => (
                <div key={b.iban} className="rounded-lg border bg-surface-sunken p-3.5 text-sm">
                  <p className="font-semibold">{b.bank}</p>
                  <p className="text-muted-foreground">{b.title}</p>
                  <div className="mt-2 space-y-1">
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Account</span>
                      <span className="flex items-center gap-1 font-mono text-[13px]">
                        {b.accountNo}
                        <CopyButton value={b.accountNo} label="" />
                      </span>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">IBAN</span>
                      <span className="flex items-center gap-1 font-mono text-[13px]">
                        {b.iban}
                        <CopyButton value={b.iban} label="" />
                      </span>
                    </p>
                    {b.branch && <p className="text-xs text-muted-foreground">{b.branch}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Contact GNK Connect for bank details.</p>
            )}
            {instructions.data?.note && (
              <p className="text-xs text-muted-foreground">{instructions.data.note}</p>
            )}
          </CardBody>
        </Card>
      </div>
      <RecordPaymentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    method: 'BANK_TRANSFER',
    amount: '',
    bankName: '',
    transactionRef: '',
    paidAt: todayPk(),
    notes: '',
  });
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const bookings = useQuery({
    queryKey: ['bookings', { tab: 'payable' }],
    queryFn: async () => {
      const [pending, approved] = await Promise.all([
        api.bookings.list({ tab: 'PENDING_APPROVAL', pageSize: 50 }),
        api.bookings.list({ tab: 'APPROVED', pageSize: 50 }),
      ]);
      return [...approved.items, ...pending.items];
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setFiles([]);
      setForm({
        method: 'BANK_TRANSFER',
        amount: '',
        bankName: '',
        transactionRef: '',
        paidAt: todayPk(),
        notes: '',
      });
      setAlloc({});
      setErrors({});
      setError(undefined);
    }
  }, [open]);

  const allocated = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const amount = Number(form.amount) || 0;
  const over = Math.round(allocated * 100) > Math.round(amount * 100);

  const toggleBooking = (id: string, total: number, on: boolean) =>
    setAlloc((a) => {
      const next = { ...a };
      if (on) {
        next[id] = String(total);
        const sum = Object.values(next).reduce((s, v) => s + (Number(v) || 0), 0);
        if (!form.amount || Number(form.amount) < sum)
          setForm((f) => ({ ...f, amount: String(sum) }));
      } else delete next[id];
      return next;
    });

  const submit = async () => {
    setErrors({});
    setError(undefined);
    if (!files.length)
      return setErrors({ attachmentIds: 'Attach the deposit slip or transfer screenshot' });
    if (over) return setErrors({ allocations: 'Applied amounts are more than the payment' });
    setBusy(true);
    try {
      const attachmentIds: string[] = [];
      for (const f of files) attachmentIds.push((await api.files.upload(f, 'PAYMENT_PROOF')).id);
      const p = await api.payments.submit({
        method: form.method,
        amount: form.amount,
        bankName: form.bankName,
        transactionRef: form.transactionRef,
        paidAt: form.paidAt,
        notes: form.notes,
        attachmentIds,
        allocations: Object.entries(alloc)
          .filter(([, v]) => Number(v) > 0)
          .map(([bookingId, v]) => ({ bookingId, amount: Number(v) })),
      });
      void qc.invalidateQueries({ queryKey: keys.payments });
      toast.success(
        `Payment ${p.reference} submitted`,
        'GNK will check it and you will get a receipt here.',
      );
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Submit a payment"
      description="Enter the deposit exactly as it appears on your bank slip."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Submit for approval
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
        <Field label="Method" error={errors.method}>
          <Select value={form.method} onChange={set('method')}>
            <option value="BANK_TRANSFER">Bank transfer / deposit</option>
            <option value="CASH">Cash at GNK office</option>
          </Select>
        </Field>
        <Field label="Amount (PKR)" required error={errors.amount}>
          <Input
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            value={form.amount}
            onChange={set('amount')}
            className="tabular"
          />
        </Field>
        <Field label="Bank or branch" required error={errors.bankName}>
          <Input
            placeholder="e.g. Meezan Bank, Blue Area"
            value={form.bankName}
            onChange={set('bankName')}
          />
        </Field>
        <Field label="Transaction / slip number" required error={errors.transactionRef}>
          <Input value={form.transactionRef} onChange={set('transactionRef')} />
        </Field>
        <Field label="Payment date" required error={errors.paidAt}>
          <Input type="date" max={todayPk()} value={form.paidAt} onChange={set('paidAt')} />
        </Field>
        <Field label="Note to GNK" error={errors.notes}>
          <Input value={form.notes} onChange={set('notes')} placeholder="Optional" />
        </Field>

        <Field
          label="Apply to bookings"
          className="sm:col-span-2"
          hint={
            bookings.data?.length
              ? `Anything not applied stays on your account balance. Applied ${formatMoney(allocated)} of ${formatMoney(amount)}.`
              : 'No bookings are waiting for payment; this will be an account deposit.'
          }
          error={errors.allocations}
        >
          {!!bookings.data?.length && (
            <div className="max-h-56 divide-y divide-border/60 overflow-y-auto rounded-xl border">
              {bookings.data.map((b) => {
                const on = b.id in alloc;
                return (
                  <label
                    key={b.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-[hsl(var(--primary))]"
                      checked={on}
                      onChange={(e) => toggleBooking(b.id, b.totalPrice, e.target.checked)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="tabular font-medium">{b.reference}</span>
                      <span className="ml-2 text-muted-foreground">{b.sector ?? b.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {statusLabel(b.status)} · total {formatMoney(b.totalPrice)}
                      </span>
                    </span>
                    {on && (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8 w-32 text-right tabular"
                        value={alloc[b.id]}
                        onClick={(e) => e.preventDefault()}
                        onChange={(e) => setAlloc({ ...alloc, [b.id]: e.target.value })}
                        aria-label={`Amount for ${b.reference}`}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </Field>

        <Field
          label="Deposit slip or screenshots"
          required
          className="sm:col-span-2"
          error={errors.attachmentIds}
          hint="Up to 5 files"
        >
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                <FileText className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {files.length < 5 && (
              <FileDrop value={null} onChange={(f) => f && setFiles([...files, f])} />
            )}
          </div>
        </Field>
      </div>
    </Dialog>
  );
}
