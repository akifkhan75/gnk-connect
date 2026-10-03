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
export function RequirePerm({
  perm,
  anyOf,
  children,
}: {
  perm?: Permission;
  anyOf?: Permission[];
  children: ReactNode;
}) {
  const can = useCan();
  const ok = anyOf?.length ? anyOf.some((p) => can(p)) : perm ? can(perm) : false;
  const needed = anyOf?.length ? anyOf.join(' or ') : perm;
  if (!ok) {
    return (
      <EmptyState
        className="py-24"
        icon={<ShieldAlert />}
        title="You don't have access to this area"
        description={`This page needs the "${needed}" permission. Ask a super admin if you need it.`}
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
