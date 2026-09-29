import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@gnk/validation';
import { ApiError } from '@gnk/api-client';
import { Alert, Button, Field, Input, PasswordInput } from '@gnk/ui';
import { useAuth } from '@/lib/api';
import { AdminAuthLayout } from '@/components/AdminAuthLayout';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try {
      await login(v.email, v.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in.');
    }
  });

  return (
    <AdminAuthLayout
      title="Staff sign in"
      subtitle="Use your GNK Connect staff account."
      footer="Need access? Ask a GNK administrator to invite you."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {params.get('reset') && (
          <Alert tone="success">Password updated. Sign in with your new password.</Alert>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Work email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="username" autoFocus {...register('email')} />
        </Field>
        <div className="relative">
          <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              {...register('password')}
            />
          </Field>
          <Link
            to="/forgot-password"
            className="absolute right-0 top-0 text-xs font-medium text-link hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Sign in
        </Button>
      </form>
    </AdminAuthLayout>
  );
}
