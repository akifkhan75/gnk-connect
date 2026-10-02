import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  cn,
  filterPage,
  formatDateTime,
  includesQ,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';

export function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: keys.notifications, queryFn: api.notifications.list });
  const list = filterPage(q.data?.items, {
    q: search,
    page,
    pageSize: 20,
    match: (n, s) => includesQ(n.title, n.body).includes(s),
    filter: (n) => filter === 'all' || (filter === 'unread' ? !n.readAt : !!n.readAt),
  });
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
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <SearchInput
            className="min-w-[14rem] flex-1"
            placeholder="Search notifications"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            className="w-36"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Read status"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </Select>
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <Spinner className="py-12" />
        ) : !list.total ? (
          <EmptyState
            icon={<Bell />}
            title={q.data.items.length ? 'No matching notifications' : 'No notifications'}
            description="Updates about your account, bookings and payments appear here."
          />
        ) : (
          <ul className="divide-y">
            {list.items.map((n) => (
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
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          onChange={setPage}
        />
      </Card>
    </div>
  );
}
