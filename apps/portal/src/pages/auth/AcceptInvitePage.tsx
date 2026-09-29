import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { acceptInviteSchema, formatPhonePk, type AcceptInviteInput } from '@gnk/validation';
import type { PartnerRole } from '@gnk/types';
import { Alert, Button, Field, Input, MaskedInput, PasswordInput, Spinner } from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { ROLE_LABEL } from '@/lib/labels';
import { PortalAuthLayout } from '@/components/PortalAuthLayout';

const existingSchema = z.object({
  token: z.string(),
  password: z.string().min(1, 'Enter your password'),
});

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const invite = useQuery({
    queryKey: ['invite', token],
    queryFn: () => api.auth.lookupInvite(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <PortalAuthLayout
      title={invite.data ? `Join ${invite.data.accountName}` : 'Accept invitation'}
      subtitle={
        invite.data &&
        `You've been invited as ${ROLE_LABEL[invite.data.role as PartnerRole] ?? invite.data.role} for ${invite.data.email}.`
      }
    >
      {!token ? (
        <Alert tone="danger">This invite link is incomplete.</Alert>
      ) : invite.isLoading ? (
        <Spinner className="py-8" />
      ) : invite.error ? (
        <Alert tone="danger">{(invite.error as Error).message}</Alert>
      ) : invite.data?.existingUser ? (
        <ExistingUserForm token={token} />
      ) : (
        <NewUserForm token={token} />
      )}
    </PortalAuthLayout>
  );
}

function useFinish() {
  const { acceptAuth } = useAuth();
  const navigate = useNavigate();
  return (auth: Awaited<ReturnType<typeof api.auth.acceptInvite>>) => {
    acceptAuth(auth);
    navigate('/', { replace: true });
  };
}

function NewUserForm({ token }: { token: string }) {
  const finish = useFinish();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    setError: setFieldError,
  } = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { token, fullName: '', password: '', confirmPassword: '' },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      finish(await api.auth.acceptInvite(values));
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field
        label="Full name"
        htmlFor="fullName"
        required
        error={formState.errors.fullName?.message}
      >
        <Input id="fullName" autoComplete="name" autoFocus {...register('fullName')} />
      </Field>
      <Field
        label="Mobile number"
        htmlFor="phone"
        hint="Optional"
        error={formState.errors.phone?.message}
      >
        <MaskedInput
          id="phone"
          mask={formatPhonePk}
          inputMode="tel"
          placeholder="+92 300 1234567"
          {...register('phone', { setValueAs: (v) => v || undefined })}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        required
        hint="At least 10 characters"
        error={formState.errors.password?.message}
      >
        <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
      </Field>
      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        required
        error={formState.errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        Accept and continue
      </Button>
    </form>
  );
}

function ExistingUserForm({ token }: { token: string }) {
  const finish = useFinish();
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<z.infer<typeof existingSchema>>({
    resolver: zodResolver(existingSchema),
    defaultValues: { token, password: '' },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      finish(await api.auth.acceptInvite(values));
    } catch (e) {
      setError((e as Error).message);
    }
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Alert tone="info">
        You already have a GNK Connect login. Confirm your password to add this account to it.
      </Alert>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="Your password" htmlFor="password" error={formState.errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          autoFocus
          {...register('password')}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        Join account
      </Button>
    </form>
  );
}
