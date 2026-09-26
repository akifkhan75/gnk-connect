import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Landmark, Plus, Wallet } from 'lucide-react';
import { submitPaymentSchema, todayPk, type SubmitPaymentInput } from '@gnk/validation';
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
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';
import { applyServerErrors } from '@/lib/forms';
import { openBlob } from '@/lib/useFileUrl';
import { ApprovedGate, RoleGate } from '@/components/guards';

export function PaymentsPage() {
  return (
    <ApprovedGate>
      <RoleGate roles={['OWNER', 'MANAGER', 'ACCOUNTANT']}>
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
        title="Payments"
        description="Deposit funds by bank transfer or cash, then record the payment here with the slip. GNK verifies it and credits your account."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Record a payment
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
        <StatCard
          label="Awaiting verification"
          value={<Money value={pending} />}
          icon={<Landmark />}
        />
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
                  header: 'For booking',
                  hideBelow: 'lg',
                  cell: (p) =>
                    p.bookingReference ? (
                      <span className="tabular">{p.bookingReference}</span>
                    ) : (
                      <span className="text-muted-foreground">Account deposit</span>
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
                      <StatusBadge status={p.status} />
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
                  cell: (p) =>
                    p.proofFileId && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openBlob(() => api.files.blob(p.proofFileId!))}
                        aria-label="View payment slip"
                      >
                        <Eye />
                      </Button>
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

const paymentFormSchema = submitPaymentSchema.omit({ proofFileId: true });
type PaymentForm = Omit<SubmitPaymentInput, 'proofFileId'>;

function RecordPaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [error, setError] = useState<string>();
  const approved = useQuery({
    queryKey: ['bookings', { tab: 'APPROVED' }],
    queryFn: () => api.bookings.list({ tab: 'APPROVED', pageSize: 100 }),
    enabled: open,
  });
  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      method: 'BANK_TRANSFER',
      bankName: '',
      transactionRef: '',
      paidAt: todayPk(),
      bookingId: '',
    },
  });
  const { register, handleSubmit, formState, reset, setError: setFieldError, setValue } = form;

  useEffect(() => {
    if (open) {
      reset();
      setFile(null);
      setError(undefined);
      setFileError(undefined);
    }
  }, [open, reset]);

  const submit = useMutation({
    mutationFn: async (values: PaymentForm) => {
      const uploaded = await api.files.upload(file!, 'PAYMENT_PROOF');
      return api.payments.submit({ ...values, proofFileId: uploaded.id });
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: keys.payments });
      toast.success(
        `Payment ${p.reference} submitted`,
        'GNK will verify it and credit your account.',
      );
      onOpenChange(false);
    },
    onError: (e) => setError(applyServerErrors(e, setFieldError)),
  });

  const onSubmit = handleSubmit((values) => {
    if (!file) return setFileError('Attach the deposit slip or transfer receipt');
    submit.mutate(values as PaymentForm);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a payment"
      description="Enter the deposit exactly as it appears on your bank slip."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={submit.isPending}>
            Submit for verification
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
        <Field label="Method" error={formState.errors.method?.message}>
          <Select {...register('method')}>
            <option value="BANK_TRANSFER">Bank transfer / deposit</option>
            <option value="CASH">Cash at GNK office</option>
          </Select>
        </Field>
        <Field label="Amount (PKR)" required error={formState.errors.amount?.message}>
          <Input type="number" inputMode="decimal" min={1} step="0.01" {...register('amount')} />
        </Field>
        <Field label="Bank or branch" required error={formState.errors.bankName?.message}>
          <Input placeholder="e.g. Meezan Bank, Blue Area" {...register('bankName')} />
        </Field>
        <Field
          label="Transaction / slip number"
          required
          error={formState.errors.transactionRef?.message}
        >
          <Input {...register('transactionRef')} />
        </Field>
        <Field label="Payment date" required error={formState.errors.paidAt?.message}>
          <Input type="date" max={todayPk()} {...register('paidAt')} />
        </Field>
        <Field
          label="For booking"
          hint="Optional: link it to an approved booking"
          error={formState.errors.bookingId?.message}
        >
          <Select
            {...register('bookingId')}
            onChange={(e) => {
              setValue('bookingId', e.target.value);
              const b = approved.data?.items.find((x) => x.id === e.target.value);
              if (b) setValue('amount', b.totalPrice as never);
            }}
          >
            <option value="">General account deposit</option>
            {approved.data?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.reference} · {b.sector} · PKR {b.totalPrice.toLocaleString('en-PK')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Deposit slip" required className="sm:col-span-2" error={fileError}>
          <FileDrop
            value={file}
            onChange={(f) => {
              setFile(f);
              setFileError(undefined);
            }}
          />
        </Field>
      </form>
    </Dialog>
  );
}
