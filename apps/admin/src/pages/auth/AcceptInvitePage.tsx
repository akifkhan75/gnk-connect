import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInviteSchema, type AcceptInviteInput } from '@gnk/validation';
import { Alert, Button, Field, Input, PasswordInput, Spinner } from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { AdminAuthLayout } from '@/components/AdminAuthLayout';

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
    <AdminAuthLayout
      title="Activate your staff account"
      subtitle={invite.data && `Set a password for ${invite.data.email}.`}
    >
      {!token ? (
        <Alert tone="danger">This invite link is incomplete.</Alert>
      ) : invite.isLoading ? (
        <Spinner className="py-8" />
      ) : invite.error ? (
        <Alert tone="danger">{(invite.error as Error).message}</Alert>
      ) : (
        <ActivateForm token={token} fullName={invite.data!.fullName} />
      )}
    </AdminAuthLayout>
  );
}

function ActivateForm({ token, fullName }: { token: string; fullName: string }) {
  const { acceptAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    setError: setFieldError,
  } = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { token, fullName, password: '', confirmPassword: '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      acceptAuth(await api.auth.acceptInvite(v));
      navigate('/', { replace: true });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="Full name" error={formState.errors.fullName?.message}>
        <Input autoComplete="name" {...register('fullName')} />
      </Field>
      <Field
        label="Password"
        hint="At least 10 characters"
        error={formState.errors.password?.message}
      >
        <PasswordInput autoComplete="new-password" autoFocus {...register('password')} />
      </Field>
      <Field label="Confirm password" error={formState.errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        Activate account
      </Button>
    </form>
  );
}
