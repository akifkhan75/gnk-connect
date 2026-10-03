import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale } from 'lucide-react';
import { ApiError } from '@gnk/api-client';
import type { VoucherType } from '@gnk/types';
import {
  Alert,
  Button,
  Dialog,
  ErrorState,
  Field,
  Input,
  Spinner,
  StatusBadge,
  formatDate,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';
import { AccountFormDialog } from './AccountFormDialog';
import { LedgerSheet } from './LedgerSheet';
import { useVoucherOverlays } from './voucher-overlay-context';

export function AccountLedgerPage() {
  return (
    <RequirePerm perm="ledger:read">
      <Ledger />
    </RequirePerm>
  );
}

function Ledger() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const overlays = useVoucherOverlays();
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'ALL' | VoucherType>('ALL');
  const [editing, setEditing] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingError, setOpeningError] = useState<string>();
  const [openingBusy, setOpeningBusy] = useState(false);

  const q = useQuery({
    queryKey: ['accounting', 'account-ledger', id, from, to],
    queryFn: () =>
      api.accounting.accountLedger(id!, {
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
  const accounts = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => api.accounting.accounts(),
  });

  const g = q.data;
  const account = g?.account;

  const setOpening = async () => {
    if (!id) return;
    setOpeningBusy(true);
    setOpeningError(undefined);
    try {
      await api.accounting.setOpeningBalance(id, { amount: Number(openingAmount) });
      void qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Opening balance posted');
      setOpeningOpen(false);
      setOpeningAmount('');
    } catch (e) {
      setOpeningError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setOpeningBusy(false);
    }
  };

  if (q.isError) {
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  if (!account || !g) return <Spinner className="py-24" />;

  const currency = account.currency;
  const canManage = can('ledger:coa');
  const canSetOpening =
    canManage && !account.isGroup && currency === 'PKR' && !account.isLocked && !g.hasOpening;

  return (
    <>
      <LedgerSheet
        breadcrumbs={[
          { label: 'Chart of accounts', onClick: () => navigate('/accounting/accounts') },
          { label: account.code },
        ]}
        title={account.name}
        meta={
          <StatusBadge
            status={account.isLocked ? 'LOCKED' : account.isActive ? 'ACTIVE' : 'INACTIVE'}
          />
        }
        description={
          <>
            Code: {account.code} · Currency: {currency}
            {g.lastTransaction ? ` · Last transaction: ${formatDate(g.lastTransaction)}` : ''}
          </>
        }
        headerActions={
          <Button variant="secondary" className="no-print" onClick={() => setEditing(true)}>
            View details
          </Button>
        }
        currency={currency}
        opening={g.opening}
        closing={g.closing}
        toolbarExtra={
          canManage ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={!canSetOpening}
              title={
                account.isGroup
                  ? 'Opening balance is only for postable accounts'
                  : currency !== 'PKR'
                    ? 'Opening balance is only for PKR accounts'
                    : g.hasOpening
                      ? 'Opening balance is already set'
                      : account.isLocked
                        ? 'Unlock the account first'
                        : undefined
              }
              onClick={() => {
                setOpeningError(undefined);
                setOpeningOpen(true);
              }}
            >
              <Scale /> Set opening balance
            </Button>
          ) : undefined
        }
        lines={g.lines}
        loading={q.isLoading}
        from={from}
        to={to}
        search={search}
        type={type}
        onFrom={setFrom}
        onTo={setTo}
        onSearch={setSearch}
        onType={setType}
        onClear={() => {
          setFrom('');
          setTo('');
          setSearch('');
          setType('ALL');
        }}
        onView={(voucherId) => overlays.openView(voucherId)}
        exportName={`ledger-${account.code}`}
      />

      <AccountFormDialog
        account={editing ? account : null}
        accounts={accounts.data ?? [account]}
        onClose={() => setEditing(false)}
      />
      <Dialog
        open={openingOpen}
        onOpenChange={(o) => !o && setOpeningOpen(false)}
        title="Set opening balance"
        description="Posted against Opening Balance Equity as of today. Only once per account."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpeningOpen(false)}>
              Cancel
            </Button>
            <Button onClick={setOpening} loading={openingBusy} disabled={!Number(openingAmount)}>
              Post opening
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {openingError && <Alert tone="danger">{openingError}</Alert>}
          <Field label="Amount (PKR)" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={openingAmount}
              placeholder="0.00"
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
          </Field>
        </div>
      </Dialog>
    </>
  );
}
