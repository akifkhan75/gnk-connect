import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Plus,
  Printer,
  ReceiptText,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';
import type { AdminPaymentListItem } from '@gnk/types';
import { recordPaymentSchema, todayPk, type RecordPaymentInput } from '@gnk/validation';
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Dialog,
  Drawer,
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  EmptyState,
  ErrorState,
  Field,
  FileDrop,
  Input,
  KeyValue,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatusBadge,
  Tabs,
  amountInWords,
  formatDate,
  formatDateTime,
  formatMoney,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors, errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { useFileUrl } from '@/lib/useFileUrl';
import { AccountPicker } from '@/components/AccountPicker';
import { RequirePerm } from '@/components/guards';
import { VoucherRegister } from '@/pages/accounting/VoucherRegister';
import { useVoucherOverlays } from '@/pages/accounting/voucher-overlay-context';
import { isPaymentPayee, PAYEE_LABEL, type PaymentPayee } from '@/pages/accounting/voucher-home';

const TABS = [
  { value: 'SUBMITTED', label: 'To verify' },
  { value: 'VERIFIED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export function PaymentsPage() {
  return (
    <RequirePerm anyOf={['payments:read', 'ledger:read']}>
      <Payments />
    </RequirePerm>
  );
}

function Payments() {
  const can = useCan();
  const overlays = useVoucherOverlays();
  const [params, setParams] = useSearchParams();
  const canIncoming = can('payments:read');
  const canOutgoing = can('ledger:read');
  const requested = params.get('tab');
  const tab =
    requested === 'outgoing' && canOutgoing
      ? 'outgoing'
      : requested === 'incoming' && canIncoming
        ? 'incoming'
        : canIncoming
          ? 'incoming'
          : 'outgoing';
  const [recordOpen, setRecordOpen] = useState(params.get('record') === '1');

  useEffect(() => {
    const pay = params.get('pay');
    if (!isPaymentPayee(pay)) return;
    overlays.openNew('PAYMENT', { payee: pay });
    const next = new URLSearchParams(params);
    next.delete('pay');
    next.set('tab', 'outgoing');
    setParams(next, { replace: true });
    // Open once from a deep link; overlay state is owned by the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTab = (next: 'incoming' | 'outgoing') => {
    const url = new URLSearchParams(params);
    url.set('tab', next);
    url.delete('pay');
    url.delete('page');
    setParams(url, { replace: true });
  };

  const addOutgoing = (payee: PaymentPayee) => {
    if (tab !== 'outgoing') setTab('outgoing');
    overlays.openNew('PAYMENT', { payee });
  };

  const canRecord = can('payments:verify');
  const canPay = can('ledger:post');

  return (
    <>
      <PageHeader
        title="Payments"
        description={
          tab === 'outgoing'
            ? 'Money paid from cash or bank to a supplier, an expense, or staff.'
            : "Check partner deposits against the bank statement. Approving credits the partner's balance and issues a receipt."
        }
        actions={
          (canRecord || canPay) && (
            <DropdownMenu>
              <DropdownTrigger asChild>
                <Button>
                  <Plus /> Add payment <ChevronDown className="opacity-70" />
                </Button>
              </DropdownTrigger>
              <DropdownContent className="w-56">
                {canRecord && (
                  <DropdownItem
                    onSelect={() => {
                      if (tab !== 'incoming') setTab('incoming');
                      setRecordOpen(true);
                    }}
                  >
                    <CreditCard /> Partner deposit
                  </DropdownItem>
                )}
                {canPay && (
                  <>
                    <DropdownItem onSelect={() => addOutgoing('SUPPLIER')}>
                      <Building2 /> {PAYEE_LABEL.SUPPLIER}
                    </DropdownItem>
                    <DropdownItem onSelect={() => addOutgoing('EXPENSE')}>
                      <Briefcase /> {PAYEE_LABEL.EXPENSE}
                    </DropdownItem>
                    <DropdownItem onSelect={() => addOutgoing('STAFF')}>
                      <UserRound /> {PAYEE_LABEL.STAFF}
                    </DropdownItem>
                  </>
                )}
              </DropdownContent>
            </DropdownMenu>
          )
        }
      />
      {canIncoming && canOutgoing && (
        <div className="mb-4">
          <Tabs
            value={tab}
            onChange={(v) => setTab(v as 'incoming' | 'outgoing')}
            items={[
              { value: 'incoming', label: 'Incoming' },
              { value: 'outgoing', label: 'Outgoing' },
            ]}
          />
        </div>
      )}
      {tab === 'outgoing' && canOutgoing ? (
        <VoucherRegister
          type="PAYMENT"
          title="Payments"
          description=""
          hideHeader
          emptyTitle="No outgoing payments match"
        />
      ) : (
        <IncomingPayments recordOpen={recordOpen} onRecordOpenChange={setRecordOpen} />
      )}
    </>
  );
}

function IncomingPayments({
  recordOpen,
  onRecordOpenChange,
}: {
  recordOpen: boolean;
  onRecordOpenChange: (open: boolean) => void;
}) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get('id'));
  const [receiptId, setReceiptId] = useState<string | null>(
    params.get('receipt') === '1' ? params.get('id') : null,
  );
  const q = {
    status: params.get('status') ?? 'SUBMITTED',
    q: params.get('q') || undefined,
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };
  const counts = useQuery({ queryKey: ['payment-counts'], queryFn: api.payments.counts });
  const list = useQuery({
    queryKey: ['payments', q],
    queryFn: () => api.payments.list(q),
    placeholderData: keepPreviousData,
  });
  const set = (k: string, v?: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const current = list.data?.items.find((p) => p.id === selected) ?? null;

  return (
    <>
      <Card>
        <div className="px-4">
          <Tabs
            value={q.status}
            onChange={(v) => set('status', v)}
            items={TABS.map((t) => ({ ...t, count: counts.data?.[t.value] ?? 0 }))}
          />
        </div>
        <div className="border-b p-4">
          <SearchInput
            className="max-w-md"
            placeholder="Payment ref, bank ref or partner"
            defaultValue={q.q}
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              set('q', (e.target as HTMLInputElement).value.trim() || undefined)
            }
          />
        </div>
        {list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataTable
              rows={list.data?.items}
              loading={list.isLoading}
              rowKey={(p) => p.id}
              selectedKey={selected}
              onRowClick={(p) => setSelected(p.id)}
              empty={
                <EmptyState
                  icon={<CreditCard />}
                  title={q.status === 'SUBMITTED' ? 'No payments waiting' : 'No payments'}
                />
              }
              columns={[
                {
                  key: 'r',
                  header: 'Payment',
                  cell: (p) => (
                    <div>
                      <p className="font-semibold tabular">{p.reference}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                    </div>
                  ),
                },
                {
                  key: 'p',
                  header: 'Partner',
                  cell: (p) => (
                    <div>
                      <p className="font-medium">{p.accountName}</p>
                      <p className="text-xs text-muted-foreground">{p.accountCode}</p>
                    </div>
                  ),
                },
                {
                  key: 'b',
                  header: 'Bank / ref',
                  hideBelow: 'md',
                  cell: (p) => (
                    <div>
                      <p>{p.bankName ?? titleCase(p.method)}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground tabular">
                        {p.transactionRef}
                        {p.duplicateOf && (
                          <TriangleAlert
                            className="size-3.5 text-warning"
                            aria-label="Possible duplicate"
                          />
                        )}
                      </p>
                    </div>
                  ),
                },
                { key: 'd', header: 'Paid on', hideBelow: 'lg', cell: (p) => formatDate(p.paidAt) },
                {
                  key: 'a',
                  header: 'Amount',
                  align: 'right',
                  cell: (p) => <Money value={p.amount} className="font-semibold" />,
                },
                {
                  key: 's',
                  header: 'Status',
                  align: 'right',
                  cell: (p) => <StatusBadge status={p.status} />,
                },
              ]}
            />
            {list.data && (
              <Pagination
                page={q.page}
                pageSize={q.pageSize}
                total={list.data.total}
                onChange={(p) => set('page', String(p))}
              />
            )}
          </>
        )}
      </Card>
      <PaymentDrawer
        payment={receiptId ? null : current}
        onClose={() => setSelected(null)}
        onOpenReceipt={() => current && setReceiptId(current.id)}
      />
      <ReceiptDrawer paymentId={receiptId} onClose={() => setReceiptId(null)} />
      <RecordPaymentDialog open={recordOpen} onOpenChange={onRecordOpenChange} />
    </>
  );
}

function PaymentDrawer({
  payment: p,
  onClose,
  onOpenReceipt,
}: {
  payment: AdminPaymentListItem | null;
  onClose: () => void;
  onOpenReceipt: () => void;
}) {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [deposit, setDeposit] = useState('');
  const [fileIndex, setFileIndex] = useState(0);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['payments'] });
    void qc.invalidateQueries({ queryKey: ['payment-counts'] });
    void qc.invalidateQueries({ queryKey: ['queues'] });
  };
  const verify = useMutation({
    mutationFn: () => api.payments.verify(p!.id, deposit || undefined),
    onSuccess: (x) => {
      refresh();
      toast.success(
        `${x.reference} approved — receipt ${x.receipt?.number ?? ''}`,
        `PKR ${x.amount.toLocaleString('en-PK')} credited to ${x.accountName}.`,
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Drawer
      open={!!p}
      onOpenChange={(o) => !o && onClose()}
      title={
        p ? (
          <span className="flex items-center gap-2">
            {p.reference} <StatusBadge status={p.status} />
          </span>
        ) : (
          ''
        )
      }
      width="max-w-4xl"
      footer={
        p?.status === 'SUBMITTED' &&
        can('payments:verify') && (
          <>
            <Button variant="danger-outline" onClick={() => setRejecting(true)}>
              <X /> Reject
            </Button>
            <Button onClick={() => verify.mutate()} loading={verify.isPending}>
              <Check /> Approve and credit <Money value={p.amount} />
            </Button>
          </>
        )
      }
    >
      {p && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {p.attachments.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {p.attachments.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setFileIndex(i)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${i === fileIndex ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
                  >
                    <FileText className="size-3" /> {a.originalName}
                  </button>
                ))}
              </div>
            )}
            <div className="min-h-64 overflow-hidden rounded-xl bg-surface-sunken">
              {(p.attachments[fileIndex] ?? p.proofFileId) ? (
                <Proof
                  key={(p.attachments[fileIndex]?.id ?? p.proofFileId)!}
                  id={(p.attachments[fileIndex]?.id ?? p.proofFileId)!}
                />
              ) : (
                <p className="p-6 text-sm text-muted-foreground">
                  No slip attached (recorded by staff).
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {p.duplicateOf && (
              <Alert tone="warning" title="Possible duplicate">
                The same bank reference was used on {p.duplicateOf}.
              </Alert>
            )}
            {p.status === 'SUBMITTED' && can('payments:verify') && (
              <Field label="Deposit into" hint="The bank or cash account that received the money">
                <AccountPicker
                  value={deposit || null}
                  onValueChange={setDeposit}
                  preset="cash-bank"
                  allowClear
                  enabled={!!p}
                  placeholder={
                    p.method === 'CASH' ? 'Cash in hand (default)' : 'Main bank account (default)'
                  }
                />
              </Field>
            )}
            <KeyValue
              columns={1}
              items={[
                {
                  label: 'Partner',
                  value: (
                    <Link to={`/partners/${p.accountId}`} className="text-link hover:underline">
                      {p.accountName} ({p.accountCode})
                    </Link>
                  ),
                },
                {
                  label: 'Amount',
                  value: <Money value={p.amount} className="text-lg font-semibold" />,
                },
                { label: 'Method', value: titleCase(p.method) },
                { label: 'Bank', value: p.bankName },
                {
                  label: 'Transaction ref',
                  value: <span className="tabular">{p.transactionRef}</span>,
                },
                { label: 'Paid on', value: formatDate(p.paidAt) },
                {
                  label: 'Applied to',
                  value: p.allocations.length
                    ? p.allocations
                        .map(
                          (a) => `${a.bookingReference} (PKR ${a.amount.toLocaleString('en-PK')})`,
                        )
                        .join(', ')
                    : 'Account balance',
                },
                ...(p.notes ? [{ label: 'Partner note', value: p.notes }] : []),
                ...(p.depositAccount
                  ? [
                      {
                        label: 'Deposited to',
                        value: `${p.depositAccount.code} ${p.depositAccount.name}`,
                      },
                    ]
                  : []),
                ...(p.receipt
                  ? [
                      {
                        label: 'Receipt',
                        value: (
                          <button
                            type="button"
                            onClick={onOpenReceipt}
                            className="inline-flex items-center gap-1 text-link hover:underline"
                          >
                            <ReceiptText className="size-3.5" /> {p.receipt.number}
                          </button>
                        ),
                      },
                    ]
                  : []),
                {
                  label: 'Submitted by',
                  value: `${p.submittedByName ?? '—'} · ${formatDateTime(p.createdAt)}`,
                },
                ...(p.verifiedAt
                  ? [
                      {
                        label: p.status === 'REJECTED' ? 'Rejected by' : 'Verified by',
                        value: `${p.verifiedByName ?? '—'} · ${formatDateTime(p.verifiedAt)}`,
                      },
                    ]
                  : []),
                ...(p.rejectionReason ? [{ label: 'Reason', value: p.rejectionReason }] : []),
              ]}
            />
          </div>
        </div>
      )}
      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject ${p?.reference}?`}
        confirmLabel="Reject payment"
        tone="danger"
        reasonLabel="Reason (sent to the partner)"
        onConfirm={async (reason) => {
          await api.payments.reject(p!.id, reason);
          refresh();
          toast.success('Payment rejected');
          onClose();
        }}
      />
    </Drawer>
  );
}

function ReceiptDrawer({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['payment', paymentId, 'receipt'],
    queryFn: () => api.payments.receipt(paymentId!),
    enabled: !!paymentId,
  });
  const r = q.data;
  const p = r?.payment;
  return (
    <Drawer
      open={!!paymentId}
      onOpenChange={(o) => !o && onClose()}
      title={r ? `Receipt ${r.number}` : 'Receipt'}
      width="max-w-xl"
      footer={
        paymentId && (
          <Button
            variant="secondary"
            onClick={() =>
              window.open(`/payments/${paymentId}/receipt?print=1`, '_blank', 'noopener')
            }
          >
            <Printer /> Print
          </Button>
        )
      }
    >
      {q.isLoading && <Spinner className="py-16" />}
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {r && p && (
        <div className="space-y-5">
          <div className="rounded-xl bg-surface-sunken p-5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Amount received
            </p>
            <p className="tabular mt-1 text-2xl font-semibold">
              {formatMoney(p.amount, { decimals: true })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{amountInWords(p.amount)}</p>
          </div>
          <KeyValue
            columns={1}
            items={[
              { label: 'Received from', value: `${r.receivedFrom.name} (${r.receivedFrom.code})` },
              { label: 'Dated', value: formatDate(r.date) },
              { label: 'Payment', value: p.reference },
              { label: 'Method', value: titleCase(p.method) },
              { label: 'Bank', value: p.bankName ?? '—' },
              { label: 'Transaction / slip no.', value: p.transactionRef ?? '—' },
              { label: 'Paid on', value: formatDate(p.paidAt) },
              { label: 'Deposited to', value: r.depositAccount ?? '—' },
              { label: 'Approved by', value: r.approvedBy ?? '—' },
              ...(p.notes ? [{ label: 'Note', value: p.notes }] : []),
            ]}
          />
          {p.allocations.length > 0 && (
            <div>
              <p className="mb-2 text-[12px] font-medium text-muted-foreground">Applied to</p>
              <ul className="space-y-1 text-sm">
                {p.allocations.map((a) => (
                  <li key={a.bookingId} className="flex justify-between gap-3">
                    <span>{a.bookingReference}</span>
                    <span className="tabular">{formatMoney(a.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Proof({ id }: { id: string }) {
  const [loader] = useState(() => () => api.files.blob(id));
  const { url, type, error } = useFileUrl(loader);
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!url) return <Spinner className="py-20" />;
  return type?.includes('pdf') ? (
    <iframe src={url} title="Payment slip" className="h-[70vh] w-full rounded-lg bg-white" />
  ) : (
    <img src={url} alt="Payment slip" className="mx-auto max-h-[70vh] object-contain" />
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
  const [error, setError] = useState<string>();
  const options = useQuery({ queryKey: ['options'], queryFn: api.catalog.options, enabled: open });
  const [file, setFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState,
    reset,
    setValue,
    watch,
    setError: setFieldError,
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      method: 'CASH',
      transactionRef: '',
      paidAt: todayPk(),
      accountId: '',
      depositAccountId: '',
    },
  });
  const depositAccountId = watch('depositAccountId');
  const record = useMutation({
    mutationFn: async (v: RecordPaymentInput) => {
      const attachmentIds = file
        ? [(await api.files.upload(file, 'PAYMENT_PROOF', v.accountId)).id]
        : [];
      return api.payments.record({ ...v, attachmentIds });
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success(
        `${p.reference} recorded — receipt ${p.receipt?.number ?? ''}`,
        `Credited to ${p.accountName}.`,
      );
      reset();
      setFile(null);
      onOpenChange(false);
    },
    onError: (e) => setError(applyServerErrors(e, setFieldError)),
  });
  const onSubmit = handleSubmit((v) => record.mutate(v));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record partner deposit"
      description="For cash or deposits received from a partner. It is verified and credited immediately."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={record.isPending}>
            Record & credit
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
        <Field
          label="Partner"
          required
          className="sm:col-span-2"
          error={formState.errors.accountId?.message}
        >
          <Select {...register('accountId')}>
            <option value="">Select a partner…</option>
            {options.data?.partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Method" error={formState.errors.method?.message}>
          <Select {...register('method')}>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
          </Select>
        </Field>
        <Field label="Amount (PKR)" required error={formState.errors.amount?.message}>
          <Input type="number" min={1} step="0.01" {...register('amount')} />
        </Field>
        <Field label="Bank" error={formState.errors.bankName?.message}>
          <Input {...register('bankName')} />
        </Field>
        <Field
          label="Receipt / transaction ref"
          required
          error={formState.errors.transactionRef?.message}
        >
          <Input {...register('transactionRef')} />
        </Field>
        <Field label="Received on" required error={formState.errors.paidAt?.message}>
          <Input type="date" max={todayPk()} {...register('paidAt')} />
        </Field>
        <Field label="Deposited into" required error={formState.errors.depositAccountId?.message}>
          <AccountPicker
            value={depositAccountId}
            onValueChange={(id) =>
              setValue('depositAccountId', id, { shouldValidate: true, shouldDirty: true })
            }
            preset="cash-bank"
            enabled={open}
            invalid={!!formState.errors.depositAccountId}
            placeholder="Choose bank or cash"
          />
        </Field>
        <Field label="Note" className="sm:col-span-2" error={formState.errors.notes?.message}>
          <Input {...register('notes')} placeholder="Optional" />
        </Field>
        <Field
          label="Attachment"
          className="sm:col-span-2"
          hint="Deposit slip or cash receipt (optional)"
        >
          <FileDrop value={file} onChange={setFile} />
        </Field>
      </form>
    </Dialog>
  );
}
