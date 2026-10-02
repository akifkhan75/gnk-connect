import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@gnk/api-client';
import type { AccountClass, ChartAccountDto } from '@gnk/types';
import { nextAccountCode } from '@gnk/validation';
import { Alert, Button, Checkbox, Dialog, Field, Input, Select, useToast } from '@gnk/ui';
import { api } from '@/lib/api';
import { AccountPicker } from '@/components/AccountPicker';

const ACCOUNT_TYPES: { value: AccountClass; label: string }[] = [
  { value: 'ASSET', label: 'ASSET' },
  { value: 'LIABILITY', label: 'LIABILITY' },
  { value: 'EQUITY', label: 'EQUITY' },
  { value: 'INCOME', label: 'INCOME' },
  { value: 'EXPENSE', label: 'EXPENSE' },
];

function accountPath(accounts: ChartAccountDto[], a: ChartAccountDto) {
  const byId = new Map(accounts.map((x) => [x.id, x]));
  const names: string[] = [];
  for (
    let p = a.parentId ? byId.get(a.parentId) : undefined;
    p;
    p = p.parentId ? byId.get(p.parentId) : undefined
  )
    names.unshift(p.name);
  return names.join(' › ');
}

export function AccountFormDialog({
  account,
  accounts,
  onClose,
}: {
  account: ChartAccountDto | 'new' | null;
  accounts: ChartAccountDto[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const editing = account && account !== 'new' ? account : null;
  const currencies = useQuery({
    queryKey: ['accounting', 'currencies'],
    queryFn: api.accounting.currencies,
  });
  const [form, setForm] = useState({
    class: 'ASSET' as AccountClass,
    parentId: '',
    name: '',
    currency: 'PKR',
    postable: true,
    description: '',
    openingBalance: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<unknown>(null);
  if (account !== openedFor) {
    setOpenedFor(account);
    setErrors({});
    setError(undefined);
    setForm(
      editing
        ? {
            class: editing.class,
            parentId: editing.parentId ?? '',
            name: editing.name,
            currency: editing.currency,
            postable: !editing.isGroup,
            description: editing.description ?? '',
            openingBalance: '',
            isActive: editing.isActive,
          }
        : {
            class: 'ASSET',
            parentId: '',
            name: '',
            currency: 'PKR',
            postable: true,
            description: '',
            openingBalance: '',
            isActive: true,
          },
    );
  }
  const parent = accounts.find((a) => a.id === form.parentId);
  const managed = !!editing && (!!editing.systemKey || !!editing.partnerAccountId);
  const parentOptions = accounts
    .filter((a) => a.isGroup && a.isActive && a.class === form.class && a.id !== editing?.id)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      class: a.class,
      currency: a.currency,
      systemKey: a.systemKey,
      path: accountPath(accounts, a),
    }));
  const generatedCode =
    parent &&
    nextAccountCode(
      parent.code,
      accounts.map((a) => a.code),
      accounts.filter((a) => a.parentId === parent.id).map((a) => a.code),
    );
  const code = editing?.code ?? generatedCode ?? '';

  const save = async () => {
    setBusy(true);
    setErrors({});
    setError(undefined);
    try {
      if (editing)
        await api.accounting.updateAccount(editing.id, {
          name: form.name,
          ...(managed ? {} : { parentId: form.parentId || null }),
          description: form.description,
          isActive: form.isActive,
        });
      else {
        if (!form.parentId) {
          setErrors({ parentId: 'Choose a parent account' });
          setBusy(false);
          return;
        }
        const opening = Number(form.openingBalance);
        await api.accounting.createAccount({
          code,
          name: form.name,
          class: form.class,
          parentId: form.parentId,
          isGroup: !form.postable,
          currency: form.postable ? form.currency : 'PKR',
          description: form.description || undefined,
          ...(form.postable && form.currency === 'PKR' && opening > 0
            ? { openingBalance: opening }
            : {}),
        });
      }
      void qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success(editing ? 'Account updated' : 'Account created');
      onClose();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!account}
      onOpenChange={(o) => !o && onClose()}
      title={editing ? `Edit ${editing.code}` : 'Add ledger account'}
      description={
        managed ? 'System and partner accounts keep their code and place in the chart.' : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? 'Save' : 'Create account'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error && !Object.keys(errors).length && <Alert tone="danger">{error}</Alert>}
        <Field label="Type" required error={errors.class}>
          <Select
            value={form.class}
            disabled={!!editing}
            onChange={(e) =>
              setForm({ ...form, class: e.target.value as AccountClass, parentId: '' })
            }
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Parent account"
          required
          error={errors.parentId}
          hint="Parents are filtered by type. Child codes follow the parent (e.g. 1100000 → 1100001)."
        >
          <AccountPicker
            options={parentOptions}
            value={form.parentId}
            disabled={managed}
            invalid={!!errors.parentId}
            placeholder="Search chart of accounts"
            onChange={(a) => setForm({ ...form, parentId: a.id, class: a.class })}
          />
        </Field>
        <Field label="Code (auto)" error={errors.code}>
          <Input
            readOnly
            disabled
            value={code}
            placeholder="Select a parent first"
            aria-label="Account code"
          />
        </Field>
        <Field label="Name" required error={errors.name}>
          <Input
            value={form.name}
            placeholder="Account name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Currency" error={errors.currency}>
            <Select
              value={form.currency}
              disabled={!!editing || !form.postable}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {(currencies.data ?? [{ code: 'PKR', name: 'Pakistani rupee', isActive: true }])
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
            </Select>
          </Field>
          <Field error={errors.isGroup}>
            <div className="flex h-9 items-center">
              <Checkbox
                label="Postable ledger"
                checked={form.postable}
                disabled={!!editing}
                onChange={(e) =>
                  setForm({
                    ...form,
                    postable: e.target.checked,
                    currency: e.target.checked ? form.currency : 'PKR',
                    openingBalance: e.target.checked ? form.openingBalance : '',
                  })
                }
              />
            </div>
          </Field>
        </div>
        <Field label="Description" error={errors.description}>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        {!editing && form.postable && form.currency === 'PKR' && (
          <Field
            label="Opening balance (optional)"
            error={errors.openingBalance}
            hint="Posted against Opening Balance Equity after the account is created. Leave blank to skip."
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.openingBalance}
              placeholder="0.00"
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </Field>
        )}
        {editing && !editing.systemKey && (
          <Field error={errors.isActive}>
            <Checkbox
              label="Active (only accounts with a zero balance can be deactivated)"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
          </Field>
        )}
      </div>
    </Dialog>
  );
}
