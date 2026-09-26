import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, MoreHorizontal, UserPlus } from 'lucide-react';
import { ApiError } from '@gnk/api-client';
import { PARTNER_ROLES, type AdminPartnerUserDto } from '@gnk/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  Dialog,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
  ErrorState,
  Field,
  Input,
  PasswordInput,
  SegmentedControl,
  Select,
  StatusBadge,
  formatRelative,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { ResetPasswordDialog, generatePassword } from '@/pages/StaffPage';

/** A partner's users and pending invites, managed by GNK staff. */
export function PartnerUsers({
  accountId,
  individual,
}: {
  accountId: string;
  individual: boolean;
}) {
  const can = useCan();
  const manage = can('partner_users:manage');
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ['partner-users', accountId],
    queryFn: () => api.partners.users(accountId),
  });
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<AdminPartnerUserDto | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['partner-users', accountId] });
    void qc.invalidateQueries({ queryKey: ['partner', accountId] });
  };
  const update = useMutation({
    mutationFn: (v: { userId: string; role?: string; status?: 'ACTIVE' | 'DISABLED' }) =>
      api.partners.updateUser(accountId, v.userId, { role: v.role, status: v.status }),
    onSuccess: () => {
      refresh();
      toast.success('User updated');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: (inviteId: string) => api.partners.revokeInvite(accountId, inviteId),
    onSuccess: () => {
      refresh();
      toast.success('Invite revoked');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader
        title={`Users (${q.data?.users.length ?? '…'})`}
        description="People who can sign in to this partner's portal."
        actions={
          manage &&
          !(individual && (q.data?.users.length ?? 0) > 0) && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <UserPlus /> Add user
            </Button>
          )
        }
      />
      {q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable
          dense
          rows={q.data?.users}
          loading={q.isLoading}
          rowKey={(u) => u.userId}
          columns={[
            {
              key: 'n',
              header: 'Name',
              cell: (u) => (
                <div>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              ),
            },
            {
              key: 'r',
              header: 'Role',
              cell: (u) => (
                <Badge tone={u.role === 'OWNER' ? 'gold' : 'neutral'}>{titleCase(u.role)}</Badge>
              ),
            },
            {
              key: 's',
              header: 'Status',
              hideBelow: 'sm',
              cell: (u) => (
                <div className="flex flex-col items-start gap-0.5">
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
              hideBelow: 'md',
              cell: (u) => (
                <span className="text-muted-foreground">
                  {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Never'}
                </span>
              ),
            },
            {
              key: 'a',
              header: '',
              align: 'right',
              cell: (u) =>
                manage && (
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
                      <DropdownLabel>Role</DropdownLabel>
                      {PARTNER_ROLES.filter((r) => r !== u.role).map((r) => (
                        <DropdownItem
                          key={r}
                          onSelect={() => update.mutate({ userId: u.userId, role: r })}
                        >
                          Make {titleCase(r).toLowerCase()}
                        </DropdownItem>
                      ))}
                      <DropdownSeparator />
                      <DropdownItem onSelect={() => setResetting(u)}>
                        <KeyRound /> Reset password
                      </DropdownItem>
                      {u.status === 'ACTIVE' && (
                        <DropdownItem
                          danger
                          onSelect={() => update.mutate({ userId: u.userId, status: 'DISABLED' })}
                        >
                          Disable
                        </DropdownItem>
                      )}
                      {u.status === 'DISABLED' && (
                        <DropdownItem
                          onSelect={() => update.mutate({ userId: u.userId, status: 'ACTIVE' })}
                        >
                          Enable
                        </DropdownItem>
                      )}
                    </DropdownContent>
                  </DropdownMenu>
                ),
            },
          ]}
        />
      )}
      {!!q.data?.invites.length && (
        <div className="border-t border-border/70 px-4 py-3">
          <p className="mb-2 text-[12px] font-medium text-muted-foreground">Pending invites</p>
          <ul className="space-y-1.5">
            {q.data.invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{i.email}</span>
                <Badge>{titleCase(i.role)}</Badge>
                {manage && (
                  <Button size="xs" variant="ghost" onClick={() => revoke.mutate(i.id)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <AddPartnerUserDialog
        accountId={accountId}
        open={adding}
        onOpenChange={setAdding}
        onDone={refresh}
      />
      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
        reset={(userId, dto) => api.partners.resetUserPassword(accountId, userId, dto)}
      />
    </Card>
  );
}

function AddPartnerUserDialog({
  accountId,
  open,
  onOpenChange,
  onDone,
}: {
  accountId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
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
      await api.partners.createUser(accountId, { ...form, mode, role: form.role as 'STAFF' });
      onDone();
      toast.success(mode === 'invite' ? 'Invite sent' : 'User created');
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
      title="Add a partner user"
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
            { value: 'password', label: 'Temporary password' },
          ]}
        />
        {error && !Object.keys(errors).length && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.fullName}>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Mobile" required error={errors.phone}>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+92 300 1234567"
            />
          </Field>
          <Field label="Role" required error={errors.role}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {PARTNER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {titleCase(r)}
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
      </div>
    </Dialog>
  );
}
