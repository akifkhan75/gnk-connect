import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MailPlus, MoreHorizontal, UserPlus } from 'lucide-react';
import { INVITABLE_ROLES } from '@gnk/validation';
import { ApiError } from '@gnk/api-client';
import type { PartnerRole, TeamMemberDto } from '@gnk/types';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  Dialog,
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
  ErrorState,
  Field,
  Input,
  PageHeader,
  PasswordInput,
  SegmentedControl,
  Select,
  StatusBadge,
  formatDate,
  formatRelative,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { errorMessage } from '@/lib/forms';
import { ROLE_HINT, ROLE_LABEL } from '@/lib/labels';
import { RoleGate, rolesWith } from '@/components/guards';

export function TeamPage() {
  return (
    <RoleGate roles={rolesWith('team:manage')}>
      <Team />
    </RoleGate>
  );
}

function Team() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(params.get('add') === '1');
  useEffect(() => {
    if (!inviteOpen && params.get('add')) setParams({}, { replace: true });
  }, [inviteOpen, params, setParams]);
  const [removing, setRemoving] = useState<TeamMemberDto | null>(null);
  const team = useQuery({ queryKey: keys.team, queryFn: api.team.get });
  const myRole = session!.account.role;
  const assignable = (INVITABLE_ROLES as PartnerRole[]).filter(
    (r) => myRole === 'OWNER' || r !== 'MANAGER',
  );
  const canManage = (m: TeamMemberDto) =>
    !m.isYou && m.role !== 'OWNER' && (myRole === 'OWNER' || m.role !== 'MANAGER');

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.team.updateRole(userId, role),
    onSuccess: (t) => {
      qc.setQueryData(keys.team, t);
      toast.success('Role updated');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const setStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'DISABLED' }) =>
      api.team.setStatus(userId, status),
    onSuccess: (t, v) => {
      qc.setQueryData(keys.team, t);
      toast.success(v.status === 'DISABLED' ? 'Member disabled' : 'Member enabled');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: api.team.revokeInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.team }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (session!.account.accountType !== 'AGENCY') {
    return (
      <Alert tone="info">
        Individual agent accounts have a single user. Contact GNK Connect to upgrade to an agency
        account.
      </Alert>
    );
  }
  if (team.error) return <ErrorState error={team.error} onRetry={() => team.refetch()} />;

  return (
    <>
      <PageHeader
        title="Team"
        description="Give your staff their own logins. Each role sees only what it needs."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus /> Add member
          </Button>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardHeader title={`Members (${team.data?.members.length ?? 0})`} />
          <DataTable
            rows={team.data?.members}
            loading={team.isLoading}
            rowKey={(m) => m.userId}
            columns={[
              {
                key: 'n',
                header: 'Member',
                cell: (m) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {m.fullName} {m.isYou && <Badge tone="primary">You</Badge>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'r',
                header: 'Role',
                cell: (m) =>
                  canManage(m) ? (
                    <Select
                      aria-label={`Role for ${m.fullName}`}
                      value={m.role}
                      className="h-8 w-40"
                      onChange={(e) =>
                        changeRole.mutate({ userId: m.userId, role: e.target.value })
                      }
                    >
                      {[...new Set([m.role, ...assignable])].map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="font-medium">{ROLE_LABEL[m.role]}</span>
                  ),
              },
              {
                key: 's',
                header: 'Status',
                hideBelow: 'sm',
                cell: (m) => <StatusBadge status={m.status} />,
              },
              {
                key: 'l',
                header: 'Last sign-in',
                hideBelow: 'md',
                cell: (m) => (m.lastLoginAt ? formatRelative(m.lastLoginAt) : 'Never'),
              },
              {
                key: 'a',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                cell: (m) =>
                  canManage(m) && (
                    <DropdownMenu>
                      <DropdownTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${m.fullName}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownTrigger>
                      <DropdownContent>
                        {m.status === 'ACTIVE' && (
                          <DropdownItem
                            onSelect={() =>
                              setStatus.mutate({ userId: m.userId, status: 'DISABLED' })
                            }
                          >
                            Disable sign-in
                          </DropdownItem>
                        )}
                        {m.status === 'DISABLED' && (
                          <DropdownItem
                            onSelect={() =>
                              setStatus.mutate({ userId: m.userId, status: 'ACTIVE' })
                            }
                          >
                            Enable sign-in
                          </DropdownItem>
                        )}
                        <DropdownSeparator />
                        <DropdownItem danger onSelect={() => setRemoving(m)}>
                          Remove from team
                        </DropdownItem>
                      </DropdownContent>
                    </DropdownMenu>
                  ),
              },
            ]}
          />
        </Card>

        {!!team.data?.invites.length && (
          <Card>
            <CardHeader title="Pending invites" icon={<MailPlus className="size-4" />} />
            <DataTable
              rows={team.data.invites}
              rowKey={(i) => i.id}
              columns={[
                { key: 'e', header: 'Email', cell: (i) => i.email },
                { key: 'r', header: 'Role', cell: (i) => ROLE_LABEL[i.role] },
                {
                  key: 'x',
                  header: 'Expires',
                  hideBelow: 'sm',
                  cell: (i) => formatDate(i.expiresAt),
                },
                {
                  key: 'a',
                  header: <span className="sr-only">Actions</span>,
                  align: 'right',
                  cell: (i) => (
                    <Button variant="ghost" size="sm" onClick={() => revoke.mutate(i.id)}>
                      Revoke
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        )}

        <Card>
          <CardHeader title="What each role can do" />
          <dl className="grid gap-px bg-border sm:grid-cols-2">
            {(Object.keys(ROLE_LABEL) as PartnerRole[]).map((r) => (
              <div key={r} className="bg-surface px-5 py-3">
                <dt className="text-sm font-medium">{ROLE_LABEL[r]}</dt>
                <dd className="text-[13px] text-muted-foreground">{ROLE_HINT[r]}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={assignable} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.fullName}?`}
        description="They will lose access to this agency immediately."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={async () => {
          const t = await api.team.remove(removing!.userId).catch((e) => {
            throw new Error(errorMessage(e), { cause: e });
          });
          qc.setQueryData(keys.team, t);
          toast.success('Member removed');
        }}
      />
    </>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roles: PartnerRole[];
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [mode, setMode] = useState<'invite' | 'password'>('invite');
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    role: 'STAFF',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ email: '', fullName: '', phone: '', role: 'STAFF', password: '' });
      setErrors({});
      setError(undefined);
    }
  }, [open]);
  const save = async () => {
    setBusy(true);
    setErrors({});
    setError(undefined);
    try {
      if (mode === 'invite') {
        const i = await api.team.invite({ email: form.email, role: form.role });
        toast.success('Invite sent', `${i.email} will receive a link to join.`);
      } else {
        await api.team.addMember(form);
        toast.success(
          `${form.fullName} added`,
          'Share the temporary password with them. They choose their own at first sign-in.',
        );
      }
      void qc.invalidateQueries({ queryKey: keys.team });
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const generate = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const p = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    const pretty = `${p.slice(0, 4)}-${p.slice(4, 8)}-${p.slice(8)}`;
    setForm((f) => ({ ...f, password: pretty }));
    void navigator.clipboard?.writeText(pretty);
    toast.info('Password generated and copied');
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a team member"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {mode === 'invite' ? 'Send invite' : 'Add member'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          items={[
            { value: 'invite', label: 'Email an invite' },
            { value: 'password', label: 'Add with a password' },
          ]}
        />
        <p className="text-[13px] text-muted-foreground">
          {mode === 'invite'
            ? "They'll get an email link to set up their own login."
            : 'Their login works right away with the password you set. They must change it the first time they sign in.'}
        </p>
        {error && !Object.keys(errors).length && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === 'password' && (
            <Field label="Full name" required error={errors.fullName}>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
          )}
          <Field
            label="Email"
            required
            error={errors.email}
            className={mode === 'invite' ? 'sm:col-span-2' : undefined}
          >
            <Input
              type="email"
              autoFocus
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          {mode === 'password' && (
            <Field label="Mobile" required error={errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+92 300 1234567"
              />
            </Field>
          )}
          <Field
            label="Role"
            error={errors.role}
            className={mode === 'invite' ? 'sm:col-span-2' : undefined}
          >
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}: {ROLE_HINT[r]}
                </option>
              ))}
            </Select>
          </Field>
          {mode === 'password' && (
            <Field
              label="Temporary password"
              required
              error={errors.password}
              className="sm:col-span-2"
              hint="At least 10 characters"
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <PasswordInput
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete="new-password"
                  />
                </div>
                <Button variant="secondary" onClick={generate}>
                  <Copy /> Generate
                </Button>
              </div>
            </Field>
          )}
        </div>
      </div>
    </Dialog>
  );
}
