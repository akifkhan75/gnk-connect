import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';
import {
  PARTNER_ROLE_CAPABILITIES,
  partnerCan,
  type PartnerCapability,
  type PartnerRole,
} from '@gnk/types';
import { Button, EmptyState, Spinner } from '@gnk/ui';
import { useAuth } from '@/lib/api';
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage';
import { Link } from 'react-router-dom';

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label="Loading…" />
    </div>
  );
}

/** Restores the session (via refresh cookie) before rendering anything protected. */
export function RequireAuth() {
  const { status, session } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (session?.user.mustChangePassword) return <SetPasswordPage />;
  return <Outlet />;
}

export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}

/** UX gate only: the API enforces the same rules. */
export function RoleGate({ roles, children }: { roles: PartnerRole[]; children: ReactNode }) {
  const { session } = useAuth();
  if (!session || !roles.includes(session.account.role)) {
    return (
      <EmptyState
        className="py-20"
        icon={<ShieldAlert />}
        title="You don't have access to this page"
        description="Ask your account owner to change your role if you need it."
        action={
          <Button asChild variant="secondary">
            <Link to="/">Go to dashboard</Link>
          </Button>
        }
      />
    );
  }
  return <>{children}</>;
}

export function ApprovedGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.account.accountStatus !== 'APPROVED') {
    return (
      <EmptyState
        className="py-20"
        icon={<Lock />}
        title="Available after approval"
        description="Complete your application. Once GNK Connect approves your account you can book, pay and see partner fares."
        action={
          <Button asChild>
            <Link to="/onboarding">View application</Link>
          </Button>
        }
      />
    );
  }
  return <>{children}</>;
}

// UX only, from the shared capability map the API enforces.
const has = (role: PartnerRole | undefined, c: PartnerCapability) => !!role && partnerCan(role, c);
export const can = {
  book: (role?: PartnerRole) => has(role, 'bookings:create'),
  money: (role?: PartnerRole) => has(role, 'payments:view'),
  pay: (role?: PartnerRole) => has(role, 'payments:submit'),
  ledger: (role?: PartnerRole) => has(role, 'ledger:view'),
  team: (role?: PartnerRole) => has(role, 'team:manage'),
  owner: (role?: PartnerRole) => has(role, 'account:manage'),
};

/** Roles holding a capability, for RoleGate. */
export const rolesWith = (c: PartnerCapability) =>
  (Object.keys(PARTNER_ROLE_CAPABILITIES) as PartnerRole[]).filter((r) => partnerCan(r, c));
