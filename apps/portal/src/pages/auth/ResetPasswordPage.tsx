import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordInput } from '@gnk/validation';
import { Alert, Button, Field, PasswordInput } from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { PortalAuthLayout } from '@/components/PortalAuthLayout';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    setError: setFieldError,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });
  const onSubmit = handleSubmit(async (values) => {
    setError(undefined);
    try {
      await api.auth.resetPassword(values);
      navigate('/login?reset=1', { replace: true });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });

  return (
    <PortalAuthLayout
      title="Choose a new password"
      subtitle="Use at least 10 characters. Avoid your name or email."
      footer={
        <Link to="/login" className="font-medium text-link hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!token ? (
        <Alert tone="danger">
          This reset link is incomplete. Request a new one from the sign-in page.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="New password" htmlFor="password" error={formState.errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              autoFocus
              {...register('password')}
            />
          </Field>
          <Field
            label="Confirm password"
            htmlFor="confirmPassword"
            error={formState.errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
            Update password
          </Button>
        </form>
      )}
    </PortalAuthLayout>
  );
}
