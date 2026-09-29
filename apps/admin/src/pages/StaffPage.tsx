import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  KeyRound,
  Lock,
  MailPlus,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { ApiError } from '@gnk/api-client';
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  type Permission,
  type RoleDto,
  type StaffUserDto,
} from '@gnk/types';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
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
  StatusBadge,
  Textarea,
  cn,
  formatRelative,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

export function StaffPage() {
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  return (
    <RequirePerm perm="staff:manage">
      <PageHeader
        title="Users and roles"
        description="Add GNK staff by invite or with a temporary password. Roles decide what each person can see and do."
      />
      <SegmentedControl
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'users', label: 'Users' },
          { value: 'roles', label: 'Roles' },
        ]}
      />
      {tab === 'users' ? <Users /> : <Roles />}
    </RequirePerm>
  );
}

const roleName = (roles: RoleDto[] | undefined, key: string) =>
  roles?.find((r) => r.key === key)?.name ?? key;

function Users() {
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.get('add') === '1');
  const [editing, setEditing] = useState<StaffUserDto | null>(null);
  const [resetting, setResetting] = useState<StaffUserDto | null>(null);
  const [disabling, setDisabling] = useState<StaffUserDto | null>(null);
  const q = useQuery({ queryKey: ['staff'], queryFn: api.staff.list });
  const roles = useQuery({ queryKey: ['roles'], queryFn: api.staff.roles });
  useEffect(() => {
    if (!adding && params.get('add')) setParams({}, { replace: true });
  }, [adding, params, setParams]);
  const update = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { status?: 'ACTIVE' | 'DISABLED' } }) =>
      api.staff.update(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('User updated');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resend = useMutation({
    mutationFn: api.staff.resendInvite,
    onSuccess: () => toast.success('Invite sent again'),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border/70 p-4">
        <p className="text-[13px] text-muted-foreground">
          {q.data ? `${q.data.length} user${q.data.length === 1 ? '' : 's'}` : ' '}
        </p>
        <Button onClick={() => setAdding(true)}>
          <UserPlus /> Add user
        </Button>
      </div>
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
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
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {u.fullName} {u.isYou && <Badge tone="primary">You</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'r',
              header: 'Roles',
              cell: (u) => (
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <Badge key={r} tone={r === 'SUPER_ADMIN' ? 'gold' : 'neutral'}>
                      {roleName(roles.data, r)}
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              key: 's',
              header: 'Status',
              hideBelow: 'sm',
              cell: (u) => (
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={u.status} />
                  {u.mustChangePassword && (
                    <span className="text-[11px] text-muted-foreground">Temporary password</span>
                  )}
                </div>
              ),
            },
            {
              key: 'l',
              header: 'Last sign-in',
              hideBelow: 'lg',
              cell: (u) => (
                <span className="text-muted-foreground">{formatRelative(u.lastLoginAt)}</span>
              ),
            },
            {
              key: 'a',
              header: '',
              align: 'right',
              cell: (u) =>
                !u.isYou && (
                  <DropdownMenu>
                    <DropdownTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${u.fullName}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownItem onSelect={() => setEditing(u)}>
                        <ShieldCheck /> Change roles
                      </DropdownItem>
                      {u.status === 'INVITED' ? (
                        <DropdownItem onSelect={() => resend.mutate(u.id)}>
                          <MailPlus /> Resend invite
                        </DropdownItem>
                      ) : null}
                      <DropdownItem onSelect={() => setResetting(u)}>
                        <KeyRound /> Reset password
                      </DropdownItem>
                      {u.status !== 'INVITED' && (
                        <>
                          <DropdownSeparator />
                          {u.status === 'DISABLED' ? (
                            <DropdownItem
                              onSelect={() =>
                                update.mutate({ id: u.id, dto: { status: 'ACTIVE' } })
                              }
                            >
                              Enable
                            </DropdownItem>
                          ) : (
                            <DropdownItem danger onSelect={() => setDisabling(u)}>
                              Disable
                            </DropdownItem>
                          )}
                        </>
                      )}
                    </DropdownContent>
                  </DropdownMenu>
                ),
            },
          ]}
        />
      )}
      <AddUserDialog open={adding} onOpenChange={setAdding} roles={roles.data ?? []} />
      <RolesDialog user={editing} roles={roles.data ?? []} onClose={() => setEditing(null)} />
      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
        reset={(id, dto) => api.staff.resetPassword(id, dto)}
      />
      <ConfirmDialog
        open={!!disabling}
        onOpenChange={(o) => !o && setDisabling(null)}
        title={`Disable ${disabling?.fullName}?`}
        description="They are signed out everywhere and can't sign in until enabled again."
        confirmLabel="Disable"
        tone="danger"
        onConfirm={async () => {
          await update.mutateAsync({ id: disabling!.id, dto: { status: 'DISABLED' } });
        }}
      />
    </Card>
  );
}

function RoleChecklist({
  roles,
  value,
  onChange,
}: {
  roles: RoleDto[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="grid gap-1.5">
      {roles.map((r) => (
        <label
          key={r.key}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
            value.includes(r.key) ? 'border-primary/40 bg-accent-soft/60' : 'hover:bg-muted/60',
          )}
        >
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[hsl(var(--primary))]"
            checked={value.includes(r.key)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, r.key] : value.filter((k) => k !== r.key))
            }
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-medium">
              {r.name}
              {!r.isSystem && <Badge>Custom</Badge>}
            </span>
            <span className="block text-xs text-muted-foreground">
              {r.description ?? `${r.permissions.length} permissions`}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roles: RoleDto[];
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [mode, setMode] = useState<'invite' | 'password'>('invite');
  const [form, setForm] = useState({ email: '', fullName: '', password: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ email: '', fullName: '', password: '' });
      setSelected([]);
      setErrors({});
      setError(undefined);
    }
  }, [open]);
  const save = async () => {
    setBusy(true);
    setErrors({});
    setError(undefined);
    try {
      await api.staff.invite({ ...form, roles: selected, mode });
      void qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success(
        mode === 'invite' ? `Invite sent to ${form.email}` : 'User created',
        mode === 'password'
          ? 'Share the temporary password with them securely. They must change it at first sign-in.'
          : undefined,
      );
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Add a staff user"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {mode === 'invite' ? 'Send invite' : 'Create user'}
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
            { value: 'password', label: 'Set a temporary password' },
          ]}
        />
        <p className="text-[13px] text-muted-foreground">
          {mode === 'invite'
            ? 'They get a link to set their own password. The link expires in 72 hours.'
            : 'The account is active immediately. They must choose their own password the first time they sign in.'}
        </p>
        {error && !Object.keys(errors).length && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.fullName}>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Work email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
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
                <Button
                  variant="secondary"
                  onClick={() => {
                    const p = generatePassword();
                    setForm({ ...form, password: p });
                    void navigator.clipboard?.writeText(p);
                    toast.info('Password generated and copied');
                  }}
                >
                  <Copy /> Generate
                </Button>
              </div>
            </Field>
          )}
        </div>
        <Field label="Roles" required error={errors.roles}>
          <RoleChecklist roles={roles} value={selected} onChange={setSelected} />
        </Field>
      </div>
    </Dialog>
  );
}

/** 16 characters from an unambiguous alphabet, via the browser's CSPRNG. */
export function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12)}`;
}

function RolesDialog({
  user,
  roles,
  onClose,
}: {
  user: StaffUserDto | null;
  roles: RoleDto[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) {
      setSelected(user.roles);
      setError(undefined);
    }
  }, [user]);
  const save = async () => {
    setBusy(true);
    try {
      await api.staff.update(user!.id, { roles: selected });
      void qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Roles updated');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => !o && onClose()}
      title={`Roles for ${user?.fullName}`}
      description="Permissions from all selected roles are combined."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!selected.length}>
            Save
          </Button>
        </>
      }
    >
      {error && (
        <Alert tone="danger" className="mb-3">
          {error}
        </Alert>
      )}
      <RoleChecklist roles={roles} value={selected} onChange={setSelected} />
    </Dialog>
  );
}

/** Shared by staff and partner users. */
export function ResetPasswordDialog({
  user,
  onClose,
  reset,
}: {
  user: { id?: string; userId?: string; fullName: string; email: string } | null;
  onClose: () => void;
  reset: (
    id: string,
    dto: { mode: 'link' | 'password'; password?: string },
  ) => Promise<{ message: string }>;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<'link' | 'password'>('link');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) {
      setMode('link');
      setPassword('');
      setError(undefined);
    }
  }, [user]);
  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const r = await reset((user!.id ?? user!.userId)!, {
        mode,
        password: mode === 'password' ? password : undefined,
      });
      toast.success(r.message);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => !o && onClose()}
      title={`Reset password for ${user?.fullName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {mode === 'link' ? 'Email reset link' : 'Set temporary password'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SegmentedControl
          value={mode}
          onChange={setMode}
          items={[
            { value: 'link', label: 'Email a link' },
            { value: 'password', label: 'Set temporary password' },
          ]}
        />
        <p className="text-[13px] text-muted-foreground">
          {mode === 'link'
            ? `A reset link valid for 30 minutes goes to ${user?.email}.`
            : 'They are signed out everywhere and must choose a new password at next sign-in.'}
        </p>
        {mode === 'password' && (
          <Field label="Temporary password" hint="At least 10 characters">
            <div className="flex gap-2">
              <div className="flex-1">
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  const p = generatePassword();
                  setPassword(p);
                  void navigator.clipboard?.writeText(p);
                  toast.info('Password generated and copied');
                }}
              >
                <Copy /> Generate
              </Button>
            </div>
          </Field>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
      </div>
    </Dialog>
  );
}

// ---------- Roles ----------

function Roles() {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['roles'], queryFn: api.staff.roles });
  const [editing, setEditing] = useState<RoleDto | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RoleDto | null>(null);
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          System roles are maintained by GNK. Create custom roles for anything else.
        </p>
        {can('roles:manage') && (
          <Button onClick={() => setEditing('new')}>
            <Plus /> New role
          </Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {q.data?.map((r) => (
          <Card key={r.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.015em]">
                  {r.name}
                  {r.isSystem && (
                    <Lock className="size-3.5 text-muted-foreground" aria-label="System role" />
                  )}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {r.description ?? (r.isSystem ? 'Built-in role' : 'Custom role')}
                </p>
              </div>
              <Badge>
                {r.usersCount} user{r.usersCount === 1 ? '' : 's'}
              </Badge>
            </div>
            <p className="mt-4 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {r.permissions.length} permissions ·{' '}
              {[
                ...new Set(
                  r.permissions.map(
                    (p) => PERMISSION_GROUPS.find((g) => p.startsWith(g.prefix))?.label,
                  ),
                ),
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
            <div className="mt-4 flex gap-2">
              {can('roles:manage') && (
                <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
                  {r.isSystem ? 'View' : 'Edit'}
                </Button>
              )}
              {can('roles:manage') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditing({
                      ...r,
                      id: '',
                      key: '',
                      name: `${r.name} (copy)`,
                      isSystem: false,
                      usersCount: 0,
                    })
                  }
                >
                  Duplicate
                </Button>
              )}
              {can('roles:manage') && !r.isSystem && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-danger"
                  onClick={() => setDeleting(r)}
                >
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <RoleEditor role={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Only roles nobody holds can be deleted."
        confirmLabel="Delete role"
        tone="danger"
        onConfirm={async () => {
          await api.staff.deleteRole(deleting!.id);
          void qc.invalidateQueries({ queryKey: ['roles'] });
          toast.success('Role deleted');
        }}
      />
    </>
  );
}

function RoleEditor({ role, onClose }: { role: RoleDto | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const can = useCan();
  const existing = role && role !== 'new' ? role : null;
  const readOnly = !!existing?.isSystem;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPerms] = useState<Set<Permission>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!role) return;
    setName(existing?.name ?? '');
    setDescription(existing?.description ?? '');
    setPerms(new Set(existing?.permissions ?? []));
    setErrors({});
    setError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const groups = [...new Set(PERMISSION_GROUPS.map((g) => g.label))].map((label) => ({
    label,
    perms: (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
      PERMISSION_GROUPS.some((g) => g.label === label && p.startsWith(g.prefix)),
    ),
  }));
  const toggle = (p: Permission) =>
    setPerms((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const save = async () => {
    setBusy(true);
    setErrors({});
    setError(undefined);
    try {
      const dto = { name, description, permissions: [...perms] };
      if (existing?.id) await api.staff.updateRole(existing.id, dto);
      else await api.staff.createRole(dto);
      void qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role saved');
      onClose();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!role}
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      title={readOnly ? existing!.name : existing?.id ? `Edit ${existing.name}` : 'New role'}
      description={
        readOnly
          ? 'System role: its permissions are fixed. Duplicate it to make a variation.'
          : 'You can only grant permissions you hold yourself.'
      }
      footer={
        readOnly ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy} disabled={!perms.size}>
              Save role
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {error && !Object.keys(errors).length && <Alert tone="danger">{error}</Alert>}
        {!readOnly && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cashier"
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={1}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => {
            const all = g.perms.every((p) => perms.has(p));
            return (
              <div key={g.label} className="rounded-xl border border-border/80 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-semibold">{g.label}</p>
                  {!readOnly && (
                    <button
                      type="button"
                      className="text-xs text-link hover:underline"
                      onClick={() =>
                        setPerms((s) => {
                          const n = new Set(s);
                          for (const p of g.perms) {
                            if (all) n.delete(p);
                            else if (can(p)) n.add(p);
                          }
                          return n;
                        })
                      }
                    >
                      {all ? 'Clear' : 'Select all'}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {g.perms.map((p) => (
                    <Checkbox
                      key={p}
                      checked={perms.has(p)}
                      disabled={readOnly || (!can(p) && !perms.has(p))}
                      onChange={() => toggle(p)}
                      label={
                        <span className="text-[13px]">
                          {PERMISSIONS[p]}
                          <span className="ml-1.5 font-mono text-[10.5px] text-muted-foreground">
                            {p}
                          </span>
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {errors.permissions && (
          <p className="text-xs font-medium text-danger">{errors.permissions}</p>
        )}
      </div>
    </Dialog>
  );
}
