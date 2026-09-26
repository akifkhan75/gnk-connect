import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@gnk/validation';
import { Alert, Button, Field, Input } from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { AdminAuthLayout } from '@/components/AdminAuthLayout';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <AdminAuthLayout
      title="Reset your password"
      footer={
        <Link to="/login" className="font-medium text-link hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success" title="Check your email">
          If a staff account exists for that address, a reset link is on its way.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Work email" htmlFor="email" error={formState.errors.email?.message}>
            <Input id="email" type="email" autoFocus {...register('email')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AdminAuthLayout>
  );
}
