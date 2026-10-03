import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  VoucherOverlayContext,
  useVoucherOverlays,
  type VoucherKind,
  type VoucherOverlays,
} from './voucher-overlay-context';
import { isPaymentPayee, voucherModulePath, type PaymentPayee } from './voucher-home';

export { useVoucherOverlays, type VoucherKind } from './voucher-overlay-context';

type Overlay =
  | { mode: 'new'; type: VoucherKind; payee?: PaymentPayee }
  | { mode: 'edit'; id: string }
  | { mode: 'view'; id: string };

const VoucherFormDialog = lazy(() =>
  import('./VoucherEditorPage').then((m) => ({ default: m.VoucherFormDialog })),
);
const VoucherDetailDrawer = lazy(() =>
  import('./VoucherDetailPage').then((m) => ({ default: m.VoucherDetailDrawer })),
);

export function VoucherOverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const close = useCallback(() => setOverlay(null), []);
  const value = useMemo<VoucherOverlays>(
    () => ({
      openNew: (type, opts) => setOverlay({ mode: 'new', type, payee: opts?.payee }),
      openEdit: (id) => setOverlay({ mode: 'edit', id }),
      openView: (id) => setOverlay({ mode: 'view', id }),
      close,
    }),
    [close],
  );

  return (
    <VoucherOverlayContext.Provider value={value}>
      {children}
      {overlay && (
        <Suspense fallback={null}>
          {(overlay.mode === 'new' || overlay.mode === 'edit') && (
            <VoucherFormDialog
              open
              type={overlay.mode === 'new' ? overlay.type : undefined}
              payee={overlay.mode === 'new' ? overlay.payee : undefined}
              id={overlay.mode === 'edit' ? overlay.id : undefined}
              onOpenChange={(o) => !o && close()}
              onSaved={(id) => setOverlay({ mode: 'view', id })}
            />
          )}
          {overlay.mode === 'view' && (
            <VoucherDetailDrawer
              id={overlay.id}
              onClose={close}
              onEdit={(id) => setOverlay({ mode: 'edit', id })}
              onView={(id) => setOverlay({ mode: 'view', id })}
            />
          )}
        </Suspense>
      )}
    </VoucherOverlayContext.Provider>
  );
}

function kindFromPath(pathname: string, type: string | null): VoucherKind {
  if (pathname.includes('/receipts')) return 'RECEIPT';
  if (pathname.includes('/payments')) return 'PAYMENT';
  return type === 'PAYMENT' || type === 'RECEIPT' ? type : 'JOURNAL';
}

/** Opens the matching overlay then lands on that voucher's module list. */
export function VoucherDeepLink() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const overlays = useVoucherOverlays();

  useEffect(() => {
    if (location.pathname.endsWith('/new') || params.get('pay')) {
      const type = kindFromPath(location.pathname, params.get('type'));
      const payee = params.get('pay') ?? params.get('payee');
      overlays.openNew(type, isPaymentPayee(payee) ? { payee } : undefined);
      navigate(voucherModulePath(type), { replace: true });
      return;
    }
    if (location.pathname.endsWith('/edit') && id) overlays.openEdit(id);
    else if (id) overlays.openView(id);
    if (id) {
      void api.accounting
        .voucher(id)
        .then((v) => navigate(voucherModulePath(v.type), { replace: true }))
        .catch(() => navigate('/accounting/vouchers', { replace: true }));
    } else navigate('/accounting/vouchers', { replace: true });
    // Overlay open + list redirect is intentionally one-shot on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
