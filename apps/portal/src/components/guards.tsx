import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';
import type { PartnerRole } from '@gnk/types';
import { Button, EmptyState, Spinner } from '@gnk/ui';
import { useAuth } from '@/lib/api';
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
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
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

export const can = {
  book: (role?: PartnerRole) => role === 'OWNER' || role === 'MANAGER' || role === 'STAFF',
  money: (role?: PartnerRole) => role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT',
  team: (role?: PartnerRole) => role === 'OWNER' || role === 'MANAGER',
  owner: (role?: PartnerRole) => role === 'OWNER',
};
