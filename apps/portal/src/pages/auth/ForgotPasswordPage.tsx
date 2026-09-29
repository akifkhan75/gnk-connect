import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@gnk/validation';
import { Alert, Button, Field, Input } from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { PortalAuthLayout } from '@/components/PortalAuthLayout';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const onSubmit = handleSubmit(async ({ email }) => {
    setError(undefined);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <PortalAuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <Link to="/login" className="font-medium text-link hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success" title="Check your email">
          If an account exists for that address, a reset link is on its way. The link expires in 30
          minutes.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" autoFocus {...register('email')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </PortalAuthLayout>
  );
}
