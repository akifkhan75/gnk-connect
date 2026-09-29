import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil } from 'lucide-react';
import {
  formatPhonePk,
  updateAccountProfileSchema,
  type UpdateAccountProfileInput,
} from '@gnk/validation';
import type { PartnerAccountDto } from '@gnk/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  ErrorState,
  Field,
  Input,
  KeyValue,
  MaskedInput,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
  formatDate,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { applyServerErrors } from '@/lib/forms';
import { DOC_LABEL } from '@/lib/labels';
import { openBlob } from '@/lib/useFileUrl';

export function AccountPage() {
  const { session } = useAuth();
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: keys.account, queryFn: api.account.get });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner className="py-20" />;
  const a = q.data;
  const isOwner = session!.account.role === 'OWNER';

  return (
    <>
      <PageHeader
        title={a.tradeName || a.legalName}
        description={`${a.type === 'AGENCY' ? 'Travel agency' : 'Individual agent'} · ${a.code} · Partner since ${formatDate(a.approvedAt ?? a.createdAt)}`}
        meta={<StatusBadge status={a.status} />}
        actions={
          isOwner && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil /> Edit contact details
            </Button>
          )
        }
      />
      {a.status === 'SUSPENDED' && (
        <Alert tone="danger" title="Account suspended" className="mb-6">
          {a.suspendedReason}
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Business details"
            description="Registered details can only be changed by GNK Connect after approval."
          />
          <CardBody>
            <KeyValue
              items={[
                { label: 'Registered name', value: a.legalName },
                { label: 'Trading name', value: a.tradeName },
                ...(a.type === 'AGENCY'
                  ? [
                      { label: 'DTS licence', value: a.dtsLicenseNo },
                      { label: 'NTN', value: a.ntn },
                      { label: 'IATA code', value: a.iataCode },
                    ]
                  : [{ label: 'CNIC', value: a.cnicMasked }]),
                { label: 'Email', value: a.email },
                { label: 'Phone', value: a.phone },
                { label: 'City', value: a.city },
                { label: 'Address', value: a.address, wide: true },
              ]}
            />
          </CardBody>
        </Card>
        <div className="space-y-6">
          {a.status === 'APPROVED' && (
            <Card>
              <CardHeader title="Credit" />
              <CardBody>
                <p className="text-xs text-muted-foreground">Credit limit</p>
                <Money value={a.creditLimit} className="text-xl font-semibold" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Set by GNK Connect. Contact your account manager to change it.
                </p>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader
              title="Documents"
              actions={
                a.status !== 'APPROVED' && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/onboarding">Manage</Link>
                  </Button>
                )
              }
            />
            <ul className="divide-y">
              {a.documents.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">No documents uploaded.</li>
              )}
              {a.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{DOC_LABEL[d.type]}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.fileName}</p>
                  </div>
                  {d.status === 'SUBMITTED' ? (
                    <Badge>In review</Badge>
                  ) : (
                    <StatusBadge status={d.status} />
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openBlob(() => api.files.blob(d.fileId))}
                    aria-label="View"
                  >
                    <Eye />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      {isOwner && <EditAccountDialog account={a} open={editing} onOpenChange={setEditing} />}
    </>
  );
}

function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: {
  account: PartnerAccountDto;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    setError: setFieldError,
  } = useForm<UpdateAccountProfileInput>({
    resolver: zodResolver(updateAccountProfileSchema),
    values: {
      tradeName: account.tradeName ?? '',
      iataCode: account.iataCode ?? '',
      city: account.city,
      address: account.address ?? '',
      phone: formatPhonePk(account.phone),
    },
  });
  const save = useMutation({
    mutationFn: api.account.update,
    onSuccess: (a) => {
      qc.setQueryData(keys.account, a);
      toast.success('Details updated');
      onOpenChange(false);
    },
    onError: (e) => setError(applyServerErrors(e, setFieldError)),
  });
  const onSubmit = handleSubmit((v) => save.mutate(v));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit contact details"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={save.isPending}>
            Save
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
          label="Trading name"
          className="sm:col-span-2"
          error={formState.errors.tradeName?.message}
        >
          <Input {...register('tradeName')} />
        </Field>
        {account.type === 'AGENCY' && (
          <Field label="IATA code" error={formState.errors.iataCode?.message}>
            <Input {...register('iataCode')} />
          </Field>
        )}
        <Field label="Phone" required error={formState.errors.phone?.message}>
          <MaskedInput mask={formatPhonePk} inputMode="tel" {...register('phone')} />
        </Field>
        <Field label="City" required error={formState.errors.city?.message}>
          <Input {...register('city')} />
        </Field>
        <Field
          label="Address"
          required
          className="sm:col-span-2"
          error={formState.errors.address?.message}
        >
          <Input {...register('address')} />
        </Field>
      </form>
    </Dialog>
  );
}
