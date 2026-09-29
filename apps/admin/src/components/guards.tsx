import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { Permission } from '@gnk/types';
import { Button, EmptyState, Spinner } from '@gnk/ui';
import { useAuth } from '@/lib/api';
import { useCan } from '@/lib/useCan';
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage';

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label="Loading…" />
    </div>
  );
}

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

/** Missing permission renders a 403 page, never a silent redirect (plan 07 §5). */
export function RequirePerm({ perm, children }: { perm: Permission; children: ReactNode }) {
  const can = useCan();
  if (!can(perm)) {
    return (
      <EmptyState
        className="py-24"
        icon={<ShieldAlert />}
        title="You don't have access to this area"
        description={`This page needs the "${perm}" permission. Ask a super admin if you need it.`}
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
