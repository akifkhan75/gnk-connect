import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import type { SettingsDto } from '@gnk/types';
import { settingsSchema, type SettingsInput } from '@gnk/validation';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { RequirePerm } from '@/components/guards';

export function SettingsPage() {
  const q = useQuery({ queryKey: ['settings'], queryFn: api.settings.get });
  return (
    <RequirePerm perm="settings:manage">
      <PageHeader
        title="Settings"
        description="Company details on invoices, bank accounts shown to partners, and booking rules."
      />
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Spinner className="py-20" />
      ) : (
        <SettingsForm initial={q.data} />
      )}
    </RequirePerm>
  );
}

function SettingsForm({ initial }: { initial: SettingsDto }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    formState,
    reset,
    setError: setFieldError,
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      ...initial,
      company: { ...initial.company, ntn: initial.company.ntn ?? '' },
    } as SettingsInput,
  });
  const banks = useFieldArray({ control, name: 'bankAccounts' });
  const e = formState.errors;
  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try {
      const saved = await api.settings.update(v);
      qc.setQueryData(['settings'], saved);
      reset(saved as SettingsInput);
      toast.success('Settings saved');
    } catch (err) {
      setError(applyServerErrors(err, setFieldError));
    }
  });
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-6" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      <Card>
        <CardHeader title="Company" description="Printed on invoices and vouchers." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" required error={e.company?.name?.message}>
            <Input {...register('company.name')} />
          </Field>
          <Field label="NTN" error={e.company?.ntn?.message}>
            <Input {...register('company.ntn')} />
          </Field>
          <Field
            label="Address"
            required
            className="sm:col-span-2"
            error={e.company?.address?.message}
          >
            <Input {...register('company.address')} />
          </Field>
          <Field label="Phone" required error={e.company?.phone?.message}>
            <Input {...register('company.phone')} />
          </Field>
          <Field label="Email" required error={e.company?.email?.message}>
            <Input type="email" {...register('company.email')} />
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Bank accounts"
          description="Shown to partners on the Payments page."
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                banks.append({ bank: '', title: '', accountNo: '', iban: '', branch: '' })
              }
            >
              <Plus /> Add account
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {banks.fields.length === 0 && (
            <Alert tone="warning">
              No bank accounts configured. Partners won't know where to pay.
            </Alert>
          )}
          {banks.fields.map((f, i) => {
            const be = e.bankAccounts?.[i];
            return (
              <div key={f.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <Field label="Bank" required error={be?.bank?.message}>
                  <Input {...register(`bankAccounts.${i}.bank`)} />
                </Field>
                <Field label="Account title" required error={be?.title?.message}>
                  <Input {...register(`bankAccounts.${i}.title`)} />
                </Field>
                <Field label="Account number" required error={be?.accountNo?.message}>
                  <Input {...register(`bankAccounts.${i}.accountNo`)} />
                </Field>
                <Field label="IBAN" required error={be?.iban?.message}>
                  <Input className="uppercase" {...register(`bankAccounts.${i}.iban`)} />
                </Field>
                <Field label="Branch" error={be?.branch?.message}>
                  <Input {...register(`bankAccounts.${i}.branch`)} />
                </Field>
                <div className="flex items-end justify-end">
                  <Button variant="ghost" size="sm" onClick={() => banks.remove(i)}>
                    <Trash2 /> Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Bookings" />
        <CardBody className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
          <Field
            label="Price quote valid for (minutes)"
            required
            error={e.booking?.quoteTtlMinutes?.message}
          >
            <Input type="number" min={5} max={240} {...register('booking.quoteTtlMinutes')} />
          </Field>
          <Field
            label="Payment terms shown to partners"
            error={e.booking?.paymentTermsNote?.message}
          >
            <Textarea rows={3} {...register('booking.paymentTermsNote')} />
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Accounting controls"
          description="Maker-checker: the person who prepares a journal voucher cannot also post it."
        />
        <CardBody>
          <Checkbox
            label={
              <span>
                <span className="font-medium">Journal vouchers need approval</span>
                <span className="block text-[13px] text-muted-foreground">
                  Recommended. When off, preparers can post journals directly. Super admins can
                  always self-approve with a recorded reason.
                </span>
              </span>
            }
            {...register('accounting.requireJvApproval')}
          />
        </CardBody>
        <CardFooter>
          <Button type="submit" loading={formState.isSubmitting} disabled={!formState.isDirty}>
            Save settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
