import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, LogOut } from 'lucide-react';
import {
  changePasswordSchema,
  formatPhonePk,
  updateMyProfileSchema,
  type ChangePasswordInput,
  type UpdateMyProfileInput,
} from '@gnk/validation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  Input,
  MaskedInput,
  NotificationPreferences,
  PageHeader,
  PasswordInput,
  ThemeToggle,
  formatRelative,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { applyServerErrors, errorMessage } from '@/lib/forms';
import { ROLE_LABEL } from '@/lib/labels';

export function ProfilePage() {
  const { session } = useAuth();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My profile"
        description={`${session!.user.email} · ${ROLE_LABEL[session!.account.role]} at ${session!.account.accountName}`}
      />
      <div className="space-y-6">
        <ProfileCard />
        <PasswordCard />
        <SessionsCard />
        <EmailPrefsCard />
        <Card>
          <CardHeader title="Appearance" description="Choose light, dark, or follow your device." />
          <CardBody>
            <ThemeToggle showLabels />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function EmailPrefsCard() {
  const qc = useQueryClient();
  const prefs = useQuery({
    queryKey: keys.notificationPrefs,
    queryFn: api.notifications.preferences,
  });
  const save = useMutation({
    mutationFn: api.notifications.setPreferences,
    onSuccess: (p) => qc.setQueryData(keys.notificationPrefs, p),
  });
  return (
    <Card>
      <CardHeader
        title="Email notifications"
        description="Choose which updates also arrive by email."
      />
      <CardBody className="py-1">
        <NotificationPreferences
          value={prefs.data}
          categories={['bookings', 'payments', 'team', 'account']}
          onChange={(c, email) => save.mutate({ [c]: { email } })}
        />
      </CardBody>
    </Card>
  );
}

function ProfileCard() {
  const { session, setSession } = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    setError: setFieldError,
  } = useForm<UpdateMyProfileInput>({
    resolver: zodResolver(updateMyProfileSchema),
    defaultValues: {
      fullName: session!.user.fullName,
      phone: session!.user.phone ? formatPhonePk(session!.user.phone) : '',
    },
  });
  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try {
      setSession(await api.auth.updateMe(v));
      toast.success('Profile saved');
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });
  return (
    <Card>
      <CardHeader title="Personal details" />
      <form onSubmit={onSubmit} noValidate>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {error && (
            <Alert tone="danger" className="sm:col-span-2">
              {error}
            </Alert>
          )}
          <Field label="Full name" required error={formState.errors.fullName?.message}>
            <Input autoComplete="name" {...register('fullName')} />
          </Field>
          <Field label="Mobile" required error={formState.errors.phone?.message}>
            <MaskedInput mask={formatPhonePk} inputMode="tel" {...register('phone')} />
          </Field>
          <Field
            label="Email"
            hint="Contact GNK Connect to change your sign-in email."
            className="sm:col-span-2"
          >
            <Input value={session!.user.email} disabled />
          </Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" loading={formState.isSubmitting}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
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
      const r = await api.auth.changePassword(v);
      toast.success(r.message);
      reset();
      void qc.invalidateQueries({ queryKey: keys.sessions });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  });
  return (
    <Card>
      <CardHeader title="Password" description="Changing it signs you out on your other devices." />
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
          <Field label="Confirm new password" error={formState.errors.confirmPassword?.message}>
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
  );
}

function SessionsCard() {
  const qc = useQueryClient();
  const toast = useToast();
  const sessions = useQuery({ queryKey: keys.sessions, queryFn: api.auth.sessions });
  const revoke = useMutation({
    mutationFn: api.auth.revokeSession,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.sessions });
      toast.success('Device signed out');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card>
      <CardHeader title="Where you're signed in" />
      <ul className="divide-y">
        {sessions.data?.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-5 py-3">
            <Laptop className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{describeAgent(s.userAgent)}</p>
              <p className="text-xs text-muted-foreground">
                {s.ipAddress ?? 'Unknown IP'} · last active {formatRelative(s.lastUsedAt)}
              </p>
            </div>
            {s.current ? (
              <Badge tone="success">This device</Badge>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => revoke.mutate(s.id)}>
                <LogOut /> Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return `${browser}${os ? ` on ${os}` : ''}`;
}
