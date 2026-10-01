import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changePasswordSchema, type ChangePasswordInput } from '@gnk/validation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  NotificationPreferences,
  PageHeader,
  PasswordInput,
  ThemeToggle,
  formatRelative,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';

export function ProfilePage() {
  const { session } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: api.auth.sessions });
  const prefs = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: api.notifications.preferences,
  });
  const setPrefs = useMutation({
    mutationFn: api.notifications.setPreferences,
    onSuccess: (p) => qc.setQueryData(['notification-prefs'], p),
  });
  const revoke = useMutation({
    mutationFn: api.auth.revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
  const {
    register,
    handleSubmit,
    formState,
    reset,
    setError: setFieldError,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try {
      toast.success((await api.auth.changePassword(v)).message);
      reset();
      void qc.invalidateQueries({ queryKey: ['sessions'] });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={session!.user.fullName}
        description={session!.user.email}
        meta={session!.roles.map((r) => (
          <Badge key={r} tone="primary">
            {titleCase(r)}
          </Badge>
        ))}
      />
      <Card>
        <CardHeader
          title="Change password"
          description="Other sessions are signed out when you change it."
        />
        <form onSubmit={onSubmit} noValidate>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            {error && (
              <Alert tone="danger" className="sm:col-span-3">
                {error}
              </Alert>
            )}
            <Field label="Current password" error={formState.errors.currentPassword?.message}>
              <PasswordInput autoComplete="current-password" {...register('currentPassword')} />
            </Field>
            <Field label="New password" error={formState.errors.password?.message}>
              <PasswordInput autoComplete="new-password" {...register('password')} />
            </Field>
            <Field label="Confirm" error={formState.errors.confirmPassword?.message}>
              <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
            </Field>
          </CardBody>
          <CardFooter>
            <Button type="submit" loading={formState.isSubmitting}>
              Change password
            </Button>
          </CardFooter>
        </form>
      </Card>
      <Card>
        <CardHeader title="Active sessions" />
        <ul className="divide-y">
          {sessions.data?.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{s.userAgent ?? 'Unknown device'}</p>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress} · {formatRelative(s.lastUsedAt)}
                </p>
              </div>
              {s.current ? (
                <Badge tone="success">This device</Badge>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => revoke.mutate(s.id)}>
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader
          title="Email notifications"
          description="Choose which updates also arrive by email."
        />
        <CardBody className="py-1">
          <NotificationPreferences
            value={prefs.data}
            categories={['bookings', 'payments', 'accounting', 'team']}
            onChange={(c, patch) => setPrefs.mutate({ [c]: patch })}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Appearance" />
        <CardBody>
          <ThemeToggle showLabels />
        </CardBody>
      </Card>
    </div>
  );
}
