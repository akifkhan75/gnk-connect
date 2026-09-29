import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Spinner } from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { errorMessage } from '@/lib/forms';
import { PortalAuthLayout } from '@/components/PortalAuthLayout';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { status } = useAuth();
  const [state, setState] = useState<{ ok?: string; error?: string }>({});
  const started = useRef(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token || started.current) return;
    started.current = true;
    api.auth
      .verifyEmail(token)
      .then((r) => {
        setState({ ok: r.message });
        void queryClient.invalidateQueries();
      })
      .catch((e) => setState({ error: errorMessage(e) }));
  }, [params]);

  return (
    <PortalAuthLayout title="Email verification">
      {!params.get('token') ? (
        <Alert tone="danger">This verification link is incomplete.</Alert>
      ) : state.ok ? (
        <div className="space-y-4">
          <Alert tone="success" title="Email verified">
            {state.ok}
          </Alert>
          <Button asChild size="lg" className="w-full">
            <Link to={status === 'authenticated' ? '/onboarding' : '/login'}>
              {status === 'authenticated' ? 'Continue to your application' : 'Sign in'}
            </Link>
          </Button>
        </div>
      ) : state.error ? (
        <div className="space-y-4">
          <Alert tone="danger">{state.error}</Alert>
          <p className="text-sm text-muted-foreground">
            Sign in and use “Resend verification email” on your application page to get a fresh
            link.
          </p>
        </div>
      ) : (
        <Spinner label="Verifying your email…" className="py-8" />
      )}
    </PortalAuthLayout>
  );
}
