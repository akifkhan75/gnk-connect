import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CornerUpLeft, FileText, Pencil, Printer, Send, Trash2, Undo2 } from 'lucide-react';
import type { VoucherDto } from '@gnk/types';
import { todayPk } from '@gnk/validation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataTable,
  Dialog,
  Drawer,
  ErrorState,
  Field,
  Input,
  KeyValue,
  Spinner,
  StatusBadge,
  Textarea,
  Timeline,
  VoucherDocument,
  formatDate,
  formatDateTime,
  formatMoney,
  useToast,
  type TimelineItem,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { openBlob } from '@/lib/useFileUrl';
import { voucherModulePath, VOUCHER_TYPE_LABEL } from './voucher-home';

export function VoucherDetailDrawer({
  id,
  onClose,
  onEdit,
  onView,
}: {
  id: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { session } = useAuth();
  const q = useQuery({
    queryKey: ['accounting', 'voucher', id],
    queryFn: () => api.accounting.voucher(id),
    enabled: !!id,
  });
  const [dialog, setDialog] = useState<null | 'approve' | 'reject' | 'reverse' | 'delete' | 'post'>(
    null,
  );

  const done = (v: VoucherDto | void, message: string) => {
    void qc.invalidateQueries({ queryKey: ['accounting'] });
    void qc.invalidateQueries({ queryKey: ['queues'] });
    toast.success(message);
    if (!v) onClose();
    else if (v.id !== id) onView(v.id);
  };

  const v = q.data;
  const act = (a: VoucherDto['allowedActions'][number]) => !!v?.allowedActions.includes(a);
  const fc = !!v?.lines.some((l) => l.currency !== 'PKR');
  const self = v?.createdBy?.id === session!.user.id;
  const numbered = !!v && !v.reference.startsWith('DRAFT-');

  const timeline: TimelineItem[] = v
    ? [
        {
          title: `Prepared by ${v.createdBy?.name ?? 'System'}`,
          time: formatDateTime(v.submittedAt ?? v.postedAt),
          tone: 'neutral',
        },
        ...(v.submittedAt
          ? [
              {
                title: 'Submitted for approval',
                time: formatDateTime(v.submittedAt),
                tone: 'info' as const,
              },
            ]
          : []),
        ...(v.status === 'REJECTED'
          ? [
              {
                title: `Returned by ${v.approvedBy?.name ?? 'approver'}`,
                body: v.rejectionReason,
                tone: 'warning' as const,
              },
            ]
          : []),
        ...(v.approvedAt &&
        v.status === 'POSTED' &&
        v.approvedBy &&
        v.approvedBy.id !== v.createdBy?.id
          ? [
              {
                title: `Approved by ${v.approvedBy.name}`,
                time: formatDateTime(v.approvedAt),
                tone: 'success' as const,
              },
            ]
          : []),
        ...(v.postedAt
          ? [
              {
                title: `Posted as ${v.reference}`,
                time: formatDateTime(v.postedAt),
                tone: 'success' as const,
              },
            ]
          : []),
        ...(v.reversedBy
          ? [{ title: `Reversed by ${v.reversedBy.reference}`, tone: 'danger' as const }]
          : []),
      ]
    : [];

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      width="max-w-4xl"
      title={
        v ? (
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">
              {numbered ? v.reference : `${VOUCHER_TYPE_LABEL[v.type]} voucher (draft)`}
            </span>
            <Badge>{VOUCHER_TYPE_LABEL[v.type]}</Badge>
            {v.reversedBy ? (
              <Badge dot>Reversed</Badge>
            ) : (
              <StatusBadge
                status={v.status}
                label={
                  v.status === 'SUBMITTED'
                    ? 'Awaiting approval'
                    : v.status === 'REJECTED'
                      ? 'Returned'
                      : undefined
                }
              />
            )}
          </span>
        ) : (
          'Voucher'
        )
      }
      description={v?.description}
      footer={
        v && (
          <>
            <Button
              variant="secondary"
              onClick={() =>
                window.open(`/accounting/vouchers/${v.id}/print`, '_blank', 'noopener')
              }
            >
              <Printer /> Print
            </Button>
            {act('delete') && (
              <Button variant="ghost" onClick={() => setDialog('delete')}>
                <Trash2 /> Delete
              </Button>
            )}
            {act('edit') && (
              <Button variant="secondary" onClick={() => onEdit(v.id)}>
                <Pencil /> Edit
              </Button>
            )}
            {act('submit') && (
              <Button
                onClick={async () =>
                  done(await api.accounting.submitVoucher(v.id), 'Sent for approval')
                }
              >
                <Send /> Submit for approval
              </Button>
            )}
            {act('post') && (
              <Button onClick={() => setDialog('post')}>
                <Check /> Post
              </Button>
            )}
            {act('reject') && (
              <Button variant="danger-outline" onClick={() => setDialog('reject')}>
                <CornerUpLeft /> Return
              </Button>
            )}
            {act('approve') && (
              <Button onClick={() => setDialog('approve')}>
                <Check /> Approve and post
              </Button>
            )}
            {act('reverse') && (
              <Button variant="danger-outline" onClick={() => setDialog('reverse')}>
                <Undo2 /> Reverse
              </Button>
            )}
          </>
        )
      }
    >
      {q.isLoading && <Spinner className="py-16" />}
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {v && v.status === 'SUBMITTED' && (
        <Alert tone="info" title="Waiting for approval" className="mb-5">
          {self
            ? 'Someone else with approval rights must approve this voucher before it posts.'
            : `${v.createdBy?.name ?? 'The preparer'} submitted this voucher. Check the entries and attachments, then approve or return it.`}
        </Alert>
      )}
      {v && v.status === 'REJECTED' && v.rejectionReason && (
        <Alert tone="warning" title="Returned" className="mb-5">
          {v.rejectionReason}
        </Alert>
      )}

      {v && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5">
            <Card>
              <CardBody>
                <KeyValue
                  columns={2}
                  items={[
                    { label: 'Date', value: formatDate(v.date) },
                    { label: 'Amount', value: formatMoney(v.totalDebit, { decimals: true }) },
                    { label: 'Party', value: v.partnerName },
                    ...(v.bookingReference
                      ? [
                          {
                            label: 'Booking',
                            value: (
                              <Link className="text-link" to={`/bookings/${v.bookingId}`}>
                                {v.bookingReference}
                              </Link>
                            ),
                          },
                        ]
                      : []),
                    ...(v.paymentReference
                      ? [
                          {
                            label: 'Payment',
                            value: (
                              <Link className="text-link" to={`/payments?id=${v.paymentId}`}>
                                {v.paymentReference}
                              </Link>
                            ),
                          },
                        ]
                      : []),
                    ...(v.reversalOf
                      ? [
                          {
                            label: 'Reverses',
                            value: (
                              <button
                                type="button"
                                className="text-link hover:underline"
                                onClick={() => onView(v.reversalOf!.id)}
                              >
                                {v.reversalOf.reference}
                              </button>
                            ),
                          },
                        ]
                      : []),
                    ...(v.reversedBy
                      ? [
                          {
                            label: 'Reversed by',
                            value: (
                              <button
                                type="button"
                                className="text-link hover:underline"
                                onClick={() => onView(v.reversedBy!.id)}
                              >
                                {v.reversedBy.reference}
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Entries" />
              <DataTable
                rows={v.lines}
                rowKey={(l) => `${l.accountId}${l.debit}${l.credit}${l.narration}`}
                columns={[
                  {
                    key: 'a',
                    header: 'Account',
                    cell: (l) => (
                      <div>
                        <p className="font-medium">
                          <span className="tabular text-muted-foreground">{l.accountCode}</span>{' '}
                          {l.accountName}
                        </p>
                        {l.narration && (
                          <p className="text-xs text-muted-foreground">{l.narration}</p>
                        )}
                      </div>
                    ),
                  },
                  ...(fc
                    ? [
                        {
                          key: 'f',
                          header: 'Foreign',
                          align: 'right' as const,
                          cell: (l: VoucherDto['lines'][number]) =>
                            l.fcAmount != null ? (
                              <span className="tabular text-muted-foreground">
                                {l.currency}{' '}
                                {l.fcAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })} @{' '}
                                {l.rate}
                              </span>
                            ) : (
                              ''
                            ),
                        },
                      ]
                    : []),
                  {
                    key: 'd',
                    header: 'Debit',
                    align: 'right',
                    cell: (l) =>
                      l.debit ? formatMoney(l.debit, { decimals: true, currency: false }) : '',
                  },
                  {
                    key: 'c',
                    header: 'Credit',
                    align: 'right',
                    cell: (l) =>
                      l.credit ? formatMoney(l.credit, { decimals: true, currency: false }) : '',
                  },
                ]}
              />
              <div className="flex justify-end gap-8 border-t border-border/70 px-4 py-3 text-sm font-semibold tabular">
                <span>Dr {formatMoney(v.totalDebit, { decimals: true })}</span>
                <span>Cr {formatMoney(v.totalCredit, { decimals: true })}</span>
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            <Card>
              <CardHeader title="History" />
              <CardBody>
                <Timeline items={timeline} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Attachments" />
              <CardBody className="space-y-2">
                {!v.attachments.length && <p className="text-sm text-muted-foreground">None</p>}
                {v.attachments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openBlob(() => api.files.blob(a.id))}
                    className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="truncate">{a.originalName}</span>
                  </button>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <ApproveDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => setDialog(o ? 'approve' : null)}
        self={self}
        onApprove={async (reason) =>
          done(await api.accounting.approveVoucher(v!.id, reason), 'Approved and posted')
        }
      />
      <ConfirmDialog
        open={dialog === 'post'}
        onOpenChange={(o) => setDialog(o ? 'post' : null)}
        title="Post this voucher?"
        description="Posting writes it to the ledger and gives it a number. Posted vouchers can only be corrected by a reversal."
        confirmLabel="Post"
        onConfirm={async () => done(await api.accounting.postVoucher(v!.id), 'Posted')}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => setDialog(o ? 'reject' : null)}
        title="Return to preparer"
        reasonLabel="What needs to change?"
        confirmLabel="Return"
        tone="danger"
        onConfirm={async (reason) =>
          done(await api.accounting.rejectVoucher(v!.id, reason), 'Returned to preparer')
        }
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => setDialog(o ? 'delete' : null)}
        title="Delete this draft?"
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          await api.accounting.deleteVoucher(v!.id);
          done(undefined, 'Draft deleted');
        }}
      />
      <ReverseDialog
        open={dialog === 'reverse'}
        onOpenChange={(o) => setDialog(o ? 'reverse' : null)}
        onReverse={async (date, reason) =>
          done(await api.accounting.reverseVoucher(v!.id, { date, reason }), 'Reversal posted')
        }
      />
    </Drawer>
  );
}

function ApproveDialog({
  open,
  onOpenChange,
  self,
  onApprove,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  self: boolean;
  onApprove: (reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async () => {
    if (self && reason.trim().length < 3)
      return setError('Explain why you are approving your own voucher');
    setBusy(true);
    try {
      await onApprove(self ? reason.trim() : undefined);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Approve and post"
      description="The voucher is numbered and written to the ledger. This cannot be undone except by a reversal."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Approve and post
          </Button>
        </>
      }
    >
      {self ? (
        <Field
          label="Self-approval reason"
          required
          error={error}
          hint="You prepared this voucher. Super admins may approve their own with a recorded reason."
        >
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
      ) : (
        error && <p className="text-sm text-danger">{error}</p>
      )}
    </Dialog>
  );
}

function ReverseDialog({
  open,
  onOpenChange,
  onReverse,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReverse: (date: string, reason: string) => Promise<void>;
}) {
  const [date, setDate] = useState(todayPk());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async () => {
    if (reason.trim().length < 3) return setError('Give a reason');
    setBusy(true);
    try {
      await onReverse(date, reason.trim());
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Reverse voucher"
      description="Posts a mirror-image voucher that cancels this one. Both stay in the books."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={busy}>
            Post reversal
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Reversal date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Reason" required error={error}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

export function VoucherPrintPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['accounting', 'voucher', id],
    queryFn: () => api.accounting.voucher(id),
  });
  if (q.isLoading) return <Spinner className="py-24" />;
  if (!q.data) return <ErrorState error={q.error} />;
  return (
    <VoucherDocument
      voucher={q.data}
      companyName="GNK Connect"
      onBack={() => (window.opener ? window.close() : navigate(voucherModulePath(q.data.type)))}
    />
  );
}
