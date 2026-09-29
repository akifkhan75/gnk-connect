import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordSchema, type ResetPasswordInput } from '@gnk/validation';
import { Alert, Button, Field, PasswordInput } from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { AdminAuthLayout } from '@/components/AdminAuthLayout';

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
  const onSubmit = handleSubmit(async (v) => {
    try {
      await api.auth.resetPassword(v);
      navigate('/login?reset=1', { replace: true });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });
  return (
    <AdminAuthLayout
      title="Choose a new password"
      footer={
        <Link to="/login" className="font-medium text-link hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!token ? (
        <Alert tone="danger">This reset link is incomplete.</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field
            label="New password"
            error={formState.errors.password?.message}
            hint="At least 10 characters"
          >
            <PasswordInput autoComplete="new-password" autoFocus {...register('password')} />
          </Field>
          <Field label="Confirm password" error={formState.errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
            Update password
          </Button>
        </form>
      )}
    </AdminAuthLayout>
  );
}
