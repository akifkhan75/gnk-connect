import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailPlus, Trash2, UserPlus } from 'lucide-react';
import { INVITABLE_ROLES, inviteMemberSchema, type InviteMemberInput } from '@gnk/validation';
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
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  formatDate,
  formatRelative,
  useToast,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { applyServerErrors, errorMessage } from '@/lib/forms';
import { ROLE_HINT, ROLE_LABEL } from '@/lib/labels';
import { RoleGate } from '@/components/guards';

export function TeamPage() {
  return (
    <RoleGate roles={['OWNER', 'MANAGER']}>
      <Team />
    </RoleGate>
  );
}

function Team() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
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
            <UserPlus /> Invite member
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRemoving(m)}
                      aria-label={`Remove ${m.fullName}`}
                    >
                      <Trash2 />
                    </Button>
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
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    reset,
    setError: setFieldError,
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'STAFF' },
  });
  const invite = useMutation({
    mutationFn: api.team.invite,
    onSuccess: (i) => {
      void qc.invalidateQueries({ queryKey: keys.team });
      toast.success('Invite sent', `${i.email} will receive a link to join.`);
      reset();
      onOpenChange(false);
    },
    onError: (e) => setError(applyServerErrors(e, setFieldError)),
  });
  const onSubmit = handleSubmit((v) => invite.mutate(v));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite a team member"
      description="They'll get an email link to set their own password."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={invite.isPending}>
            Send invite
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Email" required error={formState.errors.email?.message}>
          <Input type="email" autoFocus {...register('email')} />
        </Field>
        <Field label="Role" error={formState.errors.role?.message}>
          <Select {...register('role')}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}: {ROLE_HINT[r]}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Dialog>
  );
}
