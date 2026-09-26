import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Check,
  CircleDot,
  Eye,
  FileQuestion,
  Pencil,
  PlayCircle,
  RotateCcw,
  X,
} from 'lucide-react';
import type { AdminPartnerDetailDto, KycDocType, KycDocumentDto } from '@gnk/types';
import type { PartnerReviewAction } from '@gnk/validation';
import { PartnerUsers } from '@/components/PartnerUsers';
import {
  Alert,
  Badge,
  Breadcrumbs,
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
  Money,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
  formatDate,
  formatRelative,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { useFileUrl } from '@/lib/useFileUrl';
import { RequirePerm } from '@/components/guards';

const DOC_LABEL: Record<KycDocType, string> = {
  DTS_LICENSE: 'DTS licence',
  NTN_CERTIFICATE: 'NTN certificate',
  CNIC_FRONT: 'CNIC (front)',
  CNIC_BACK: 'CNIC (back)',
  IATA_CERTIFICATE: 'IATA certificate',
  BANK_LETTER: 'Bank letter',
  OTHER: 'Other',
};

const ACTIONS: Record<
  PartnerReviewAction,
  { label: string; confirm: string; reason?: string; tone?: 'danger'; icon: typeof Check }
> = {
  start_review: {
    label: 'Start review',
    confirm: 'Mark this application as under review by you?',
    icon: PlayCircle,
  },
  approve: {
    label: 'Approve',
    confirm: 'Approve this partner? They will see partner fares and can book immediately.',
    icon: Check,
  },
  request_info: {
    label: 'Request more info',
    confirm: 'Send the application back for changes?',
    reason: 'What do they need to fix? (sent to the partner)',
    icon: FileQuestion,
  },
  reject: {
    label: 'Reject',
    confirm: 'Reject this application?',
    reason: 'Reason (sent to the partner)',
    tone: 'danger',
    icon: X,
  },
  suspend: {
    label: 'Suspend',
    confirm: 'Suspend this partner? Their users are locked out within seconds.',
    reason: 'Reason (sent to the partner)',
    tone: 'danger',
    icon: Ban,
  },
  reactivate: { label: 'Reactivate', confirm: 'Reactivate this partner?', icon: RotateCcw },
};

const AVAILABLE: Record<string, PartnerReviewAction[]> = {
  SUBMITTED: ['start_review', 'approve', 'request_info', 'reject'],
  UNDER_REVIEW: ['approve', 'request_info', 'reject'],
  MORE_INFO_REQUIRED: ['reject'],
  APPROVED: ['suspend'],
  SUSPENDED: ['reactivate'],
};

export function PartnerDetailPage() {
  return (
    <RequirePerm perm="partners:read">
      <PartnerDetail />
    </RequirePerm>
  );
}

function PartnerDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [action, setAction] = useState<PartnerReviewAction | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);
  const [viewing, setViewing] = useState<KycDocumentDto | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<KycDocumentDto | null>(null);
  const q = useQuery({ queryKey: ['partner', id], queryFn: () => api.partners.get(id) });

  const refresh = (p: AdminPartnerDetailDto) => {
    qc.setQueryData(['partner', id], p);
    void qc.invalidateQueries({ queryKey: ['partners'] });
    void qc.invalidateQueries({ queryKey: ['partner-counts'] });
    void qc.invalidateQueries({ queryKey: ['queues'] });
  };
  const docReview = useMutation({
    mutationFn: ({
      docId,
      status,
      note,
    }: {
      docId: string;
      status: 'VERIFIED' | 'REJECTED';
      note?: string;
    }) => api.partners.reviewDocument(docId, status, note),
    onSuccess: (p) => {
      refresh(p);
      setViewing(null);
      toast.success('Document updated');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const p = q.data;
  const actions = (AVAILABLE[p.status] ?? []).filter((a) =>
    can(a === 'suspend' || a === 'reactivate' ? 'partners:suspend' : 'partners:review'),
  );

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: 'Partners', onClick: () => navigate('/partners') }, { label: p.code }]}
          />
        }
        title={p.tradeName || p.legalName}
        meta={
          <>
            <StatusBadge status={p.status} />
            <Badge tone={p.type === 'AGENCY' ? 'primary' : 'neutral'}>
              {p.type === 'AGENCY' ? 'Agency' : 'Individual'}
            </Badge>
          </>
        }
        description={`${p.code} · ${p.city} · applied ${formatDate(p.createdAt)}${p.reviewedBy ? ` · reviewed by ${p.reviewedBy} ${formatRelative(p.reviewedAt)}` : ''}`}
        actions={actions.map((a) => {
          const A = ACTIONS[a];
          return (
            <Button
              key={a}
              variant={
                a === 'approve' ? 'primary' : A.tone === 'danger' ? 'danger-outline' : 'secondary'
              }
              onClick={() => setAction(a)}
            >
              <A.icon /> {A.label}
            </Button>
          );
        })}
      />

      <div className="mb-5 space-y-3">
        {!p.ownerEmailVerified && (
          <Alert tone="warning">The owner has not verified their email address yet.</Alert>
        )}
        {p.status === 'MORE_INFO_REQUIRED' && p.reviewNote && (
          <Alert tone="warning" title="Waiting for the partner">
            Requested: {p.reviewNote}
          </Alert>
        )}
        {p.status === 'REJECTED' && (
          <Alert tone="danger" title="Rejected">
            {p.rejectionReason}
          </Alert>
        )}
        {p.status === 'SUSPENDED' && (
          <Alert tone="danger" title="Suspended">
            {p.suspendedReason}
          </Alert>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Balance"
          value={<Money value={p.balance.balance} signed />}
          hint={p.balance.balance < 0 ? 'Owes GNK' : 'Funds held'}
        />
        <StatCard
          label="Credit limit"
          value={<Money value={p.balance.creditLimit} />}
          hint={p.pricingTier ? `Tier: ${p.pricingTier.name}` : 'No pricing tier'}
        />
        <StatCard
          label="Bookings"
          value={p.stats.bookings}
          hint={`${p.stats.confirmed} confirmed`}
        />
        <StatCard label="Confirmed GMV" value={<Money value={p.stats.gmv} />} tone="gold" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Business details" />
            <CardBody>
              <KeyValue
                columns={3}
                items={[
                  { label: 'Registered name', value: p.legalName },
                  { label: 'Trading name', value: p.tradeName },
                  ...(p.type === 'AGENCY'
                    ? [
                        { label: 'DTS licence', value: p.dtsLicenseNo },
                        { label: 'NTN', value: p.ntn },
                        { label: 'IATA', value: p.iataCode },
                      ]
                    : [{ label: 'CNIC', value: <span className="tabular">{p.cnicMasked}</span> }]),
                  { label: 'Email', value: p.email },
                  { label: 'Phone', value: p.phone },
                  { label: 'City', value: p.city },
                  { label: 'Address', value: p.address, wide: true },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent bookings"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/bookings?tab=all&accountId=${p.id}`}>All bookings</Link>
                </Button>
              }
            />
            <DataTable
              dense
              rows={p.recentBookings}
              rowKey={(b) => b.id}
              onRowClick={(b) => navigate(`/bookings/${b.id}?tab=all`)}
              empty={<p className="text-center text-sm text-muted-foreground">No bookings yet.</p>}
              columns={[
                {
                  key: 'r',
                  header: 'Booking',
                  cell: (b) => <span className="font-medium tabular">{b.reference}</span>,
                },
                {
                  key: 's',
                  header: 'Sector',
                  cell: (b) => `${b.sector ?? b.title} · ${formatDate(b.departureDate)}`,
                },
                {
                  key: 't',
                  header: 'Total',
                  align: 'right',
                  cell: (b) => <Money value={b.totalPrice} />,
                },
                {
                  key: 'st',
                  header: 'Status',
                  align: 'right',
                  cell: (b) => <StatusBadge status={b.status} />,
                },
              ]}
            />
          </Card>

          <PartnerUsers accountId={p.id} individual={p.type === 'INDIVIDUAL'} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="KYC documents"
              description={`Required: ${p.requiredDocuments.map((d) => DOC_LABEL[d]).join(', ')}`}
            />
            <ul className="divide-y">
              {p.documents.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">
                  No documents uploaded yet.
                </li>
              )}
              {p.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <CircleDot
                    className={`size-4 ${d.status === 'VERIFIED' ? 'text-success' : d.status === 'REJECTED' ? 'text-danger' : 'text-warning'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{DOC_LABEL[d.type]}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.fileName} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={d.status}
                    label={d.status === 'SUBMITTED' ? 'To check' : undefined}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setViewing(d)}
                    aria-label="Open document"
                  >
                    <Eye />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Credit & pricing"
              actions={
                can('partners:credit_limit') && (
                  <Button variant="ghost" size="sm" onClick={() => setCreditOpen(true)}>
                    <Pencil /> Edit
                  </Button>
                )
              }
            />
            <CardBody>
              <KeyValue
                columns={1}
                items={[
                  { label: 'Credit limit', value: <Money value={p.creditLimit} /> },
                  { label: 'Available to book', value: <Money value={p.balance.availableFunds} /> },
                  { label: 'Pricing tier', value: p.pricingTier?.name ?? 'None (default rules)' },
                ]}
              />
              {can('ledger:read') && (
                <Button asChild variant="link" className="mt-3">
                  <Link to={`/ledger/${p.id}`}>View statement →</Link>
                </Button>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {action && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setAction(null)}
          title={`${ACTIONS[action].label}: ${p.tradeName || p.legalName}`}
          description={ACTIONS[action].confirm}
          confirmLabel={ACTIONS[action].label}
          tone={ACTIONS[action].tone}
          reasonLabel={ACTIONS[action].reason}
          onConfirm={async (note) => {
            try {
              refresh(await api.partners.review(id, { action, note: note || undefined }));
              toast.success(`${ACTIONS[action].label}: done`);
            } catch (e) {
              throw new Error(errorMessage(e), { cause: e });
            }
          }}
        />
      )}
      <ConfirmDialog
        open={!!rejectingDoc}
        onOpenChange={(o) => !o && setRejectingDoc(null)}
        title={`Reject ${rejectingDoc ? DOC_LABEL[rejectingDoc.type] : 'document'}?`}
        description="The partner will be asked to upload it again."
        confirmLabel="Reject document"
        tone="danger"
        reasonLabel="Reason (shown to the partner)"
        onConfirm={(note) =>
          docReview.mutateAsync({ docId: rejectingDoc!.id, status: 'REJECTED', note })
        }
      />
      <CreditDialog partner={p} open={creditOpen} onOpenChange={setCreditOpen} onSaved={refresh} />
      <Drawer
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing ? DOC_LABEL[viewing.type] : ''}
        description={viewing?.fileName}
        width="max-w-4xl"
        footer={
          viewing &&
          can('partners:review') && (
            <>
              <Button variant="danger-outline" onClick={() => setRejectingDoc(viewing)}>
                <X /> Reject document
              </Button>
              <Button
                onClick={() => docReview.mutate({ docId: viewing.id, status: 'VERIFIED' })}
                loading={docReview.isPending}
              >
                <Check /> Mark verified
              </Button>
            </>
          )
        }
      >
        {viewing && <DocumentPreview doc={viewing} />}
      </Drawer>
    </>
  );
}

function DocumentPreview({ doc }: { doc: KycDocumentDto }) {
  const [loader] = useState(() => () => api.files.blob(doc.fileId));
  const { url, error } = useFileUrl(loader);
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!url) return <Spinner className="py-20" />;
  return doc.mimeType === 'application/pdf' ? (
    <iframe src={url} title={doc.fileName} className="h-[75vh] w-full rounded-md border bg-white" />
  ) : (
    <img
      src={url}
      alt={doc.fileName}
      className="mx-auto max-h-[75vh] rounded-md border object-contain"
    />
  );
}

function CreditDialog({
  partner,
  open,
  onOpenChange,
  onSaved,
}: {
  partner: AdminPartnerDetailDto;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: (p: AdminPartnerDetailDto) => void;
}) {
  const toast = useToast();
  const tiers = useQuery({ queryKey: ['tiers'], queryFn: api.pricing.tiers, enabled: open });
  const [limit, setLimit] = useState(String(partner.creditLimit));
  const [tier, setTier] = useState(partner.pricingTier?.id ?? '');
  const save = useMutation({
    mutationFn: () =>
      api.partners.setCredit(partner.id, {
        creditLimit: Number(limit),
        pricingTierId: tier || null,
      }),
    onSuccess: (p) => {
      onSaved(p);
      toast.success('Credit updated');
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Credit & pricing tier"
      description="Credit lets the partner book beyond their deposited balance."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Credit limit (PKR)" hint="Set 0 for prepaid-only partners">
          <Input
            type="number"
            min={0}
            step={1000}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </Field>
        <Field label="Pricing tier">
          <Select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">None</option>
            {tiers.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}
