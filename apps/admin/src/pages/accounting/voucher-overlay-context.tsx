import { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isPaymentPayee, voucherModulePath, type PaymentPayee } from './voucher-home';

export type VoucherKind = 'JOURNAL' | 'PAYMENT' | 'RECEIPT';
export type { PaymentPayee };

export type VoucherOverlays = {
  openNew: (type: VoucherKind, opts?: { payee?: PaymentPayee }) => void;
  openEdit: (id: string) => void;
  openView: (id: string) => void;
  close: () => void;
};

export const VoucherOverlayContext = createContext<VoucherOverlays | null>(null);

export function useVoucherOverlays() {
  const ctx = useContext(VoucherOverlayContext);
  const navigate = useNavigate();
  const fallback = useMemo<VoucherOverlays>(
    () => ({
      openNew: (type, opts) => {
        if (type === 'PAYMENT') {
          const payee = isPaymentPayee(opts?.payee) ? opts.payee : 'SUPPLIER';
          navigate(`/payments?tab=outgoing&pay=${payee}`);
          return;
        }
        const home = type === 'RECEIPT' ? '/accounting/receipts' : '/accounting/vouchers';
        navigate(`${home}/new?type=${type}`);
      },
      openEdit: (id) => navigate(`/accounting/vouchers/${id}/edit`),
      openView: (id) => navigate(`/accounting/vouchers/${id}`),
      close: () => undefined,
    }),
    [navigate],
  );
  return ctx ?? fallback;
}

export { voucherModulePath };
