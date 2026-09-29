import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { forcedPasswordChangeSchema, type ForcedPasswordChangeInput } from '@gnk/validation';
import { Alert, Button, Field, PasswordInput } from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { PortalAuthLayout } from '@/components/PortalAuthLayout';

/** Shown after signing in with a password someone else set. Nothing else is reachable until done. */
export function SetPasswordPage() {
  const { session, setSession, logout } = useAuth();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    setError: setFieldError,
  } = useForm<ForcedPasswordChangeInput>({
    resolver: zodResolver(forcedPasswordChangeSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try {
      await api.auth.setPassword(v);
      setSession({ ...session!, user: { ...session!.user, mustChangePassword: false } });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });
  return (
    <PortalAuthLayout
      title="Choose your password"
      subtitle={`Welcome, ${session!.user.fullName.split(' ')[0]}. Replace the temporary password you were given.`}
      footer={
        <button type="button" onClick={() => void logout()} className="hover:text-foreground">
          Sign out
        </button>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field
          label="New password"
          error={formState.errors.password?.message}
          hint="At least 10 characters. Avoid your name or email."
        >
          <PasswordInput autoComplete="new-password" autoFocus {...register('password')} />
        </Field>
        <Field label="Confirm password" error={formState.errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          <KeyRound /> Set password and continue
        </Button>
      </form>
    </PortalAuthLayout>
  );
}
