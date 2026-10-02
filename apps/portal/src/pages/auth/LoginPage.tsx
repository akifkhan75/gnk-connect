import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@gnk/validation';
import { ApiError } from '@gnk/api-client';
import { Alert, Button, Field, Input, PasswordInput } from '@gnk/ui';
import { useAuth } from '@/lib/api';
import { safeInternalPath } from '@/lib/redirect';
import { PortalAuthLayout } from '@/components/PortalAuthLayout';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState<string>();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: params.get('email') ?? '', password: '' },
  });
  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(undefined);
    try {
      await login(values.email, values.password);
      const from =
        safeInternalPath(params.get('next')) ??
        safeInternalPath((location.state as { from?: string } | null)?.from);
      navigate(from ?? '/', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in. Please try again.');
    }
  });

  return (
    <PortalAuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to your partner account."
      footer={
        <>
          New to GNK Connect?{' '}
          <Link
            to={
              safeInternalPath(params.get('next'))
                ? `/register?next=${encodeURIComponent(params.get('next')!)}`
                : '/register'
            }
            className="font-medium text-link hover:underline"
          >
            Become a partner
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {params.get('reset') && (
          <Alert tone="success">Your password was updated. Sign in with the new password.</Alert>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={!!formState.errors.email}
            {...register('email')}
          />
        </Field>
        <Field
          label={
            <span className="flex w-full items-center justify-between">
              Password
              <Link to="/forgot-password" className="text-xs font-medium text-link hover:underline">
                Forgot password?
              </Link>
            </span>
          }
          htmlFor="password"
          error={formState.errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!formState.errors.password}
            {...register('password')}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Sign in
        </Button>
      </form>
    </PortalAuthLayout>
  );
}
