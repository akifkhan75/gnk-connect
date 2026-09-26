import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, FileCheck2, MailWarning, Send, Trash2 } from 'lucide-react';
import type { KycDocType, KycDocumentDto } from '@gnk/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FileDrop,
  PageHeader,
  Spinner,
  StatusBadge,
  formatDate,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { errorMessage } from '@/lib/forms';
import { DOC_LABEL } from '@/lib/labels';
import { openBlob } from '@/lib/useFileUrl';
import { ApplicationTracker } from '@/components/ApplicationTracker';

const OPTIONAL: Record<string, KycDocType[]> = { AGENCY: ['IATA_CERTIFICATE'], INDIVIDUAL: [] };

export function OnboardingPage() {
  const { session, setSession } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const account = useQuery({ queryKey: keys.account, queryFn: api.account.get });

  const refreshSession = async () => {
    const acc = await qc.fetchQuery({ queryKey: keys.account, queryFn: api.account.get });
    if (session)
      setSession({ ...session, account: { ...session.account, accountStatus: acc.status } });
  };

  const resend = useMutation({
    mutationFn: api.auth.resendVerification,
    onSuccess: (r) => toast.success(r.message),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submit = useMutation({
    mutationFn: api.account.submit,
    onSuccess: async () => {
      toast.success(
        'Application submitted',
        'GNK Connect will review it shortly. We will notify you by email.',
      );
      await refreshSession();
    },
    onError: (e) => toast.error('Could not submit', errorMessage(e)),
  });

  if (account.error) return <ErrorState error={account.error} onRetry={() => account.refetch()} />;
  if (!account.data) return <Spinner className="py-20" />;
  const a = account.data;
  const editable = a.status === 'DRAFT' || a.status === 'MORE_INFO_REQUIRED';
  const isOwner = session?.account.role === 'OWNER';
  const docs = [...a.requiredDocuments, ...(OPTIONAL[a.type] ?? [])];
  const missing = a.requiredDocuments.filter(
    (t) => !a.documents.some((d) => d.type === t && d.status !== 'REJECTED'),
  );
  const emailVerified = session?.user.emailVerified || a.ownerEmailVerified;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Partner application"
        description={`${a.legalName} · ${a.code}`}
        meta={<StatusBadge status={a.status} />}
      />

      <Card className="mb-6">
        <CardBody>
          <ApplicationTracker status={a.status} />
        </CardBody>
      </Card>

      {a.status === 'MORE_INFO_REQUIRED' && a.reviewNote && (
        <Alert tone="warning" title="GNK Connect needs more information" className="mb-6">
          {a.reviewNote}
        </Alert>
      )}
      {a.status === 'REJECTED' && (
        <Alert tone="danger" title="Your application was not approved" className="mb-6">
          {a.rejectionReason ?? 'Contact GNK Connect for details.'}
        </Alert>
      )}
      {(a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW') && (
        <Alert tone="info" title="Your application is with our team" className="mb-6">
          We review applications within one working day. You'll get an email when a decision is
          made.
        </Alert>
      )}
      {a.status === 'APPROVED' && (
        <Alert tone="success" title="Your account is approved" className="mb-6">
          Partner fares and booking are unlocked.
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="1. Verify your email"
            icon={
              emailVerified ? (
                <CheckCircle2 className="size-5 text-success" />
              ) : (
                <MailWarning className="size-5 text-warning" />
              )
            }
          />
          <CardBody className="flex flex-wrap items-center justify-between gap-3 text-sm">
            {emailVerified ? (
              <p>Email verified.</p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Open the link we emailed to {session?.user.email}. You can't submit until your
                  email is verified.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => resend.mutate()}
                  loading={resend.isPending}
                >
                  Resend verification email
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="2. Upload documents"
            description="Clear scans or photos, PDF/JPG/PNG up to 15 MB."
            icon={<FileCheck2 className="size-5" />}
          />
          <ul className="divide-y">
            {docs.map((type) => (
              <DocumentRow
                key={type}
                type={type}
                required={a.requiredDocuments.includes(type)}
                doc={a.documents.find((d) => d.type === type)}
                editable={editable && isOwner}
                onChanged={() => qc.invalidateQueries({ queryKey: keys.account })}
              />
            ))}
          </ul>
        </Card>

        {editable && (
          <Card>
            <CardHeader title="3. Submit for review" icon={<Send className="size-5" />} />
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {!isOwner
                  ? 'Only the account owner can submit the application.'
                  : !emailVerified
                    ? 'Verify your email first.'
                    : missing.length
                      ? `Still needed: ${missing.map((t) => DOC_LABEL[t]).join(', ')}.`
                      : 'Everything is ready. Submit your application to GNK Connect.'}
              </p>
              <Button
                onClick={() => submit.mutate()}
                loading={submit.isPending}
                disabled={!isOwner || !emailVerified || missing.length > 0}
              >
                {a.status === 'MORE_INFO_REQUIRED' ? 'Resubmit application' : 'Submit application'}
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function DocumentRow({
  type,
  required,
  doc,
  editable,
  onChanged,
}: {
  type: KycDocType;
  required: boolean;
  doc?: KycDocumentDto;
  editable: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: async (f: File) => {
      const uploaded = await api.files.upload(f, 'KYC');
      return api.account.addDocument(type, uploaded.id);
    },
    onSuccess: () => {
      setFile(null);
      toast.success(`${DOC_LABEL[type]} uploaded`);
      onChanged();
    },
    onError: (e) => toast.error('Upload failed', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.account.removeDocument(doc!.id),
    onSuccess: onChanged,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const replaceable = editable && (!doc || doc.status !== 'VERIFIED');

  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div>
        <p className="text-sm font-medium">{DOC_LABEL[type]}</p>
        <p className="text-xs text-muted-foreground">{required ? 'Required' : 'Optional'}</p>
      </div>
      <div>
        {doc && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-surface-sunken px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{doc.fileName}</span>
            <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
            {doc.status === 'SUBMITTED' ? (
              <Badge tone="neutral">Awaiting review</Badge>
            ) : (
              <StatusBadge status={doc.status} />
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openBlob(() => api.files.blob(doc.fileId))}
              aria-label="View document"
            >
              <Eye />
            </Button>
            {replaceable && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove.mutate()}
                aria-label="Remove document"
                loading={remove.isPending}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        )}
        {doc?.status === 'REJECTED' && doc.reviewNote && (
          <p className="mb-2 text-xs text-danger">Rejected: {doc.reviewNote}</p>
        )}
        {replaceable && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex-1">
              <FileDrop
                value={file}
                onChange={setFile}
                label={doc ? 'Replace with a new file' : 'Drop the file here or click to browse'}
              />
            </div>
            {file && (
              <Button onClick={() => upload.mutate(file)} loading={upload.isPending}>
                Upload
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
