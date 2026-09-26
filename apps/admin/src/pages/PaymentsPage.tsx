import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, Plus, TriangleAlert, X } from 'lucide-react';
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
  EmptyState,
  ErrorState,
  Field,
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
  formatDate,
  formatDateTime,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors, errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { useFileUrl } from '@/lib/useFileUrl';
import { RequirePerm } from '@/components/guards';

const TABS = [
  { value: 'SUBMITTED', label: 'To verify' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export function PaymentsPage() {
  return (
    <RequirePerm perm="payments:read">
      <Payments />
    </RequirePerm>
  );
}

function Payments() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get('id'));
  const [recordOpen, setRecordOpen] = useState(false);
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
    refetchInterval: 30_000,
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
      <PageHeader
        title="Payments"
        description="Verify partner deposits against the bank statement. Verified payments are credited to the partner's ledger."
        actions={
          can('payments:verify') && (
            <Button onClick={() => setRecordOpen(true)}>
              <Plus /> Record payment
            </Button>
          )
        }
      />
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
      <PaymentDrawer payment={current} onClose={() => setSelected(null)} />
      <RecordPaymentDialog open={recordOpen} onOpenChange={setRecordOpen} />
    </>
  );
}

function PaymentDrawer({
  payment: p,
  onClose,
}: {
  payment: AdminPaymentListItem | null;
  onClose: () => void;
}) {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['payments'] });
    void qc.invalidateQueries({ queryKey: ['payment-counts'] });
    void qc.invalidateQueries({ queryKey: ['queues'] });
  };
  const verify = useMutation({
    mutationFn: () => api.payments.verify(p!.id),
    onSuccess: (x) => {
      refresh();
      toast.success(
        `${x.reference} verified`,
        `PKR ${x.amount.toLocaleString('en-PK')} credited to ${x.accountName}.`,
      );
      onClose();
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
            <Button variant="success" onClick={() => verify.mutate()} loading={verify.isPending}>
              <Check /> Verify & credit <Money value={p.amount} />
            </Button>
          </>
        )
      }
    >
      {p && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-64 rounded-lg border bg-surface-sunken">
            {p.proofFileId ? (
              <Proof id={p.proofFileId} />
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                No slip attached (recorded by staff).
              </p>
            )}
          </div>
          <div className="space-y-4">
            {p.duplicateOf && (
              <Alert tone="warning" title="Possible duplicate">
                The same bank reference was used on {p.duplicateOf}.
              </Alert>
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
                { label: 'For booking', value: p.bookingReference ?? 'Account deposit' },
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
  const {
    register,
    handleSubmit,
    formState,
    reset,
    setError: setFieldError,
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: { method: 'CASH', transactionRef: '', paidAt: todayPk(), accountId: '' },
  });
  const record = useMutation({
    mutationFn: api.payments.record,
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success(`${p.reference} recorded`, `Credited to ${p.accountName}.`);
      reset();
      onOpenChange(false);
    },
    onError: (e) => setError(applyServerErrors(e, setFieldError)),
  });
  const onSubmit = handleSubmit((v) => record.mutate(v));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a payment"
      description="For cash or deposits received directly. It is verified and credited immediately."
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
      </form>
    </Dialog>
  );
}
