import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button, ErrorState, reportError } from '@gnk/ui';

/** Shown when a page crashes while rendering; the error is reported to monitoring. */
export function RouteError() {
  const error = useRouteError();
  useEffect(() => {
    if (!isRouteErrorResponse(error)) reportError(error, { source: 'route' });
  }, [error]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <ErrorState
        error={
          new Error(
            isRouteErrorResponse(error)
              ? `${error.status} ${error.statusText}`
              : 'This page ran into a problem. It has been reported; reloading usually fixes it.',
          )
        }
        onRetry={() => window.location.reload()}
      />
      <Button variant="ghost" onClick={() => window.location.assign('/')}>
        Go to the dashboard
      </Button>
    </div>
  );
}
