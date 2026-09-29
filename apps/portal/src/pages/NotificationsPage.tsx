import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  cn,
  formatDateTime,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';

export function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: keys.notifications, queryFn: api.notifications.list });
  const refresh = () => qc.invalidateQueries({ queryKey: keys.notifications });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        actions={
          !!q.data?.unread && (
            <Button
              variant="secondary"
              onClick={async () => {
                await api.notifications.readAll();
                void refresh();
              }}
            >
              <CheckCheck /> Mark all read
            </Button>
          )
        }
      />
      <Card>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <Spinner className="py-12" />
        ) : !q.data.items.length ? (
          <EmptyState
            icon={<Bell />}
            title="No notifications"
            description="Updates about your account, bookings and payments appear here."
          />
        ) : (
          <ul className="divide-y">
            {q.data.items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full gap-3 px-5 py-4 text-left hover:bg-muted/60',
                    !n.readAt && 'bg-accent-soft/40',
                  )}
                  onClick={async () => {
                    if (!n.readAt) await api.notifications.read(n.id);
                    void refresh();
                    if (n.link) navigate(n.link);
                  }}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.readAt ? 'bg-transparent' : 'bg-accent',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{n.title}</span>
                    <span className="block text-[13px] text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
