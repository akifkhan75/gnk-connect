import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plane, Ticket, Wallet, XCircle } from 'lucide-react';
import type { TimelineItem } from '@gnk/ui';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  CopyButton,
  DataTable,
  ErrorState,
  KeyValue,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
  Timeline,
  formatDate,
  formatDateTime,
  statusLabel,
  statusTone,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { errorMessage } from '@/lib/forms';
import { FlightLeg } from '@/components/GroupsTable';
import { can } from '@/components/guards';

export function BookingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { session } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const q = useQuery({ queryKey: keys.booking(id), queryFn: () => api.bookings.get(id) });
  const balance = useQuery({
    queryKey: keys.balance,
    queryFn: api.ledger.balance,
    enabled: q.data?.status === 'APPROVED',
  });

  const cancel = useMutation({
    mutationFn: (reason: string) => api.bookings.cancel(id, reason),
    onSuccess: (b) => {
      qc.setQueryData(keys.booking(id), b);
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      void qc.invalidateQueries({ queryKey: keys.bookingCounts });
      toast.success(`Booking ${b.reference} cancelled`);
    },
  });

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const b = q.data;
  const confirmed = b.status === 'CONFIRMED' || b.status === 'COMPLETED';
  const shortfall =
    b.status === 'APPROVED' && balance.data ? b.totalPrice - balance.data.availableFunds : 0;

  const timeline: TimelineItem[] = b.timeline.map((e) => {
    const tone = statusTone(e.status);
    return {
      title: statusLabel(e.status),
      time: formatDateTime(e.at),
      body: e.note,
      tone: tone === 'primary' || tone === 'gold' ? 'info' : tone,
    };
  });

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'My bookings', onClick: () => navigate('/bookings') },
              { label: b.reference },
            ]}
          />
        }
        title={
          <span className="flex items-center gap-2">
            Booking <span className="tabular">{b.reference}</span>
            <CopyButton value={b.reference} label="Copy" />
          </span>
        }
        meta={<StatusBadge status={b.status} />}
        description={`Requested ${formatDateTime(b.createdAt)} by ${b.createdByName}`}
        actions={
          <>
            {confirmed && (
              <Button asChild variant="secondary">
                <Link to={`/bookings/${b.id}/voucher`}>
                  <Ticket /> Voucher
                </Link>
              </Button>
            )}
            {b.invoice && (
              <Button asChild variant="secondary">
                <Link to={`/invoices/${b.invoice.id}`}>
                  <FileText /> Invoice {b.invoice.number}
                </Link>
              </Button>
            )}
            {b.canCancel && (
              <Button variant="danger-outline" onClick={() => setCancelOpen(true)}>
                <XCircle /> Cancel request
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 space-y-3">
        {b.status === 'PENDING_APPROVAL' && (
          <Alert tone="info">
            GNK Connect is reviewing this request and checking seats with the airline.
          </Alert>
        )}
        {b.status === 'APPROVED' &&
          (shortfall > 0 ? (
            <Alert
              tone="warning"
              title="Deposit needed before we can issue"
              action={
                can.money(session!.account.role) && (
                  <Button asChild size="sm">
                    <Link to="/payments?new=1">
                      <Wallet /> Record a payment
                    </Link>
                  </Button>
                )
              }
            >
              Approved. Your available balance and credit are <Money value={shortfall} /> short of
              the total. Deposit funds and upload the slip so GNK can issue the booking.
            </Alert>
          ) : (
            <Alert tone="success">
              Approved. Your balance covers this booking; GNK will issue it with the airline
              shortly.
            </Alert>
          ))}
        {b.status === 'SUBMITTED_TO_SUPPLIER' && (
          <Alert tone="info">We're confirming this booking with the airline.</Alert>
        )}
        {b.status === 'REJECTED' && (
          <Alert tone="danger" title="Not approved">
            {b.rejectionReason}
          </Alert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Trip" icon={<Plane className="size-4" />} />
            <CardBody className="space-y-4">
              <KeyValue
                columns={3}
                items={[
                  { label: 'Group', value: b.title, wide: true },
                  { label: 'Sector', value: b.sector },
                  { label: 'Airline', value: b.airline },
                  {
                    label: 'PNR',
                    value: b.pnr ? (
                      <span className="flex items-center gap-1 font-mono">
                        {b.pnr}
                        <CopyButton value={b.pnr} label="" />
                      </span>
                    ) : confirmed ? (
                      '—'
                    ) : (
                      'Issued on confirmation'
                    ),
                  },
                  { label: 'Departure', value: formatDate(b.departureDate, 'weekday') },
                  { label: 'Return', value: formatDate(b.returnDate, 'weekday') },
                  { label: 'Baggage', value: b.baggage },
                ]}
              />
              {(b.outbound || b.inbound) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3">
                  <FlightLeg leg={b.outbound} dir="out" />
                  <FlightLeg leg={b.inbound} dir="in" />
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Passengers (${b.passengers.length})`} />
            <DataTable
              rowKey={(p) => p.id}
              rows={b.passengers}
              columns={[
                {
                  key: 'n',
                  header: 'Name',
                  cell: (p) => (
                    <span className="font-medium">{`${titleCase(p.title)} ${p.firstName} ${p.lastName}`}</span>
                  ),
                },
                { key: 't', header: 'Type', hideBelow: 'sm', cell: (p) => titleCase(p.type) },
                {
                  key: 'dob',
                  header: 'Date of birth',
                  hideBelow: 'md',
                  cell: (p) => formatDate(p.dateOfBirth),
                },
                {
                  key: 'pp',
                  header: 'Passport',
                  cell: (p) => <span className="tabular">{p.passportMasked}</span>,
                },
                {
                  key: 'exp',
                  header: 'Expiry',
                  hideBelow: 'md',
                  cell: (p) => formatDate(p.passportExpiry),
                },
              ]}
            />
          </Card>

          {b.agentNotes && (
            <Card>
              <CardHeader title="Your notes" />
              <CardBody className="whitespace-pre-line text-sm">{b.agentNotes}</CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Price" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  <Money value={b.unitPrice} /> × {b.seats} seat{b.seats > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <Money value={b.totalPrice} className="text-lg font-semibold" />
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Payment</span>
                <StatusBadge status={b.paymentState} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Status history" />
            <CardBody>
              <Timeline items={timeline} />
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${b.reference}?`}
        description="The held seats will be released. This can't be undone."
        confirmLabel="Cancel booking"
        tone="danger"
        reasonLabel="Reason"
        onConfirm={async (reason) => {
          try {
            await cancel.mutateAsync(reason);
          } catch (e) {
            throw new Error(errorMessage(e), { cause: e });
          }
        }}
      />
    </>
  );
}
