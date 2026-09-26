import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MailPlus, UserPlus } from 'lucide-react';
import {
  PERMISSIONS,
  STAFF_ROLES,
  type Permission,
  type StaffRoleKey,
  type StaffUserDto,
} from '@gnk/types';
import { staffInviteSchema, type StaffInviteInput } from '@gnk/validation';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  Input,
  PageHeader,
  StatusBadge,
  Tabs,
  formatRelative,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors, errorMessage } from '@/lib/forms';
import { RequirePerm } from '@/components/guards';

const ROLE_KEYS = Object.keys(STAFF_ROLES) as StaffRoleKey[];

export function StaffPage() {
  const [tab, setTab] = useState('staff');
  return (
    <RequirePerm perm="staff:manage">
      <PageHeader
        title="Staff & roles"
        description="Staff accounts are invite-only. Roles decide what each person can see and do."
      />
      <Card>
        <div className="px-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'staff', label: 'Staff' },
              { value: 'roles', label: 'Roles & permissions' },
            ]}
          />
        </div>
        {tab === 'staff' ? <Staff /> : <Roles />}
      </Card>
    </RequirePerm>
  );
}

function Staff() {
  const qc = useQueryClient();
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUserDto | null>(null);
  const q = useQuery({ queryKey: ['staff'], queryFn: api.staff.list });
  const update = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: { roles?: string[]; status?: 'ACTIVE' | 'DISABLED' };
    }) => api.staff.update(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member updated');
      setEditing(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resend = useMutation({
    mutationFn: api.staff.resendInvite,
    onSuccess: () => toast.success('Invite re-sent'),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <div className="flex justify-end border-b p-4">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus /> Invite staff
        </Button>
      </div>
      <DataTable
        rows={q.data}
        loading={q.isLoading}
        rowKey={(u) => u.id}
        columns={[
          {
            key: 'n',
            header: 'Name',
            cell: (u) => (
              <div className="flex items-center gap-3">
                <Avatar name={u.fullName} />
                <div>
                  <p className="font-medium">
                    {u.fullName} {u.isYou && <Badge tone="primary">You</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'r',
            header: 'Roles',
            cell: (u) => (
              <span className="flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <Badge key={r} tone={r === 'SUPER_ADMIN' ? 'gold' : 'primary'}>
                    {STAFF_ROLES[r as StaffRoleKey]?.name ?? r}
                  </Badge>
                ))}
              </span>
            ),
          },
          {
            key: 's',
            header: 'Status',
            hideBelow: 'sm',
            cell: (u) => <StatusBadge status={u.status} />,
          },
          {
            key: 'l',
            header: 'Last sign-in',
            hideBelow: 'md',
            cell: (u) => (u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Never'),
          },
          {
            key: 'a',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            cell: (u) =>
              !u.isYou && (
                <span className="flex justify-end gap-1">
                  {u.status === 'INVITED' && (
                    <Button variant="ghost" size="sm" onClick={() => resend.mutate(u.id)}>
                      <MailPlus /> Resend
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                    Edit roles
                  </Button>
                  {u.status !== 'INVITED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        update.mutate({
                          id: u.id,
                          dto: { status: u.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED' },
                        })
                      }
                    >
                      {u.status === 'DISABLED' ? 'Enable' : 'Disable'}
                    </Button>
                  )}
                </span>
              ),
          },
        ]}
      />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      {editing && (
        <RolesDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSave={(roles) => update.mutate({ id: editing.id, dto: { roles } })}
          saving={update.isPending}
        />
      )}
    </>
  );
}

function RoleChecklist({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid gap-2">
      {ROLE_KEYS.map((k) => (
        <Checkbox
          key={k}
          checked={value.includes(k)}
          onChange={(e) =>
            onChange(e.target.checked ? [...value, k] : value.filter((r) => r !== k))
          }
          label={
            <span>
              <span className="font-medium">{STAFF_ROLES[k].name}</span>{' '}
              <span className="text-muted-foreground">
                · {STAFF_ROLES[k].permissions.length} permissions
              </span>
            </span>
          }
        />
      ))}
    </div>
  );
}

function RolesDialog({
  user,
  onClose,
  onSave,
  saving,
}: {
  user: StaffUserDto;
  onClose: () => void;
  onSave: (roles: string[]) => void;
  saving: boolean;
}) {
  const [roles, setRoles] = useState(user.roles);
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Roles for ${user.fullName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(roles)} disabled={!roles.length} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <RoleChecklist value={roles} onChange={setRoles} />
    </Dialog>
  );
}

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState,
    setValue,
    watch,
    reset,
    setError: setFieldError,
  } = useForm<StaffInviteInput>({
    resolver: zodResolver(staffInviteSchema),
    defaultValues: { email: '', fullName: '', roles: [] },
  });
  const roles = watch('roles');
  const invite = useMutation({
    mutationFn: api.staff.invite,
    onSuccess: (u) => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Invite sent', `${u.email} will receive a link to set a password.`);
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
      title="Invite a staff member"
      size="lg"
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
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error && (
          <Alert tone="danger" className="sm:col-span-2">
            {error}
          </Alert>
        )}
        <Field label="Full name" required error={formState.errors.fullName?.message}>
          <Input {...register('fullName')} />
        </Field>
        <Field label="Work email" required error={formState.errors.email?.message}>
          <Input type="email" {...register('email')} />
        </Field>
        <Field
          label="Roles"
          required
          className="sm:col-span-2"
          error={formState.errors.roles?.message}
        >
          <RoleChecklist
            value={roles}
            onChange={(v) => setValue('roles', v, { shouldValidate: true })}
          />
        </Field>
      </form>
    </Dialog>
  );
}

function Roles() {
  const perms = Object.keys(PERMISSIONS) as Permission[];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b bg-surface-sunken/70 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="sticky left-0 bg-surface-sunken px-4 py-2.5">Permission</th>
            {ROLE_KEYS.map((k) => (
              <th key={k} className="px-3 py-2.5 text-center">
                {STAFF_ROLES[k].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {perms.map((p) => (
            <tr key={p} className="border-b last:border-0">
              <td className="sticky left-0 bg-surface px-4 py-2">
                <p className="font-medium">{PERMISSIONS[p]}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{p}</p>
              </td>
              {ROLE_KEYS.map((k) => (
                <td key={k} className="px-3 py-2 text-center">
                  {(STAFF_ROLES[k].permissions as readonly string[]).includes(p) ? (
                    <Check className="mx-auto size-4 text-success" aria-label="Allowed" />
                  ) : (
                    <span className="text-muted-foreground/40">–</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        System roles are defined in code (packages/types/src/permissions.ts) and re-seeded on
        deploy.
      </p>
    </div>
  );
}
