import { Bell, CheckCheck } from 'lucide-react';
import type { NotificationDto } from '@gnk/types';
import { cn } from '../lib/cn';
import { formatRelative } from '../lib/format';
import { DropdownContent, DropdownMenu, DropdownTrigger } from './overlay';
import * as M from '@radix-ui/react-dropdown-menu';

export function NotificationBell({
  items,
  unread,
  onOpenItem,
  onReadAll,
  onViewAll,
}: {
  items: NotificationDto[];
  unread: number;
  onOpenItem: (n: NotificationDto) => void;
  onReadAll: () => void;
  onViewAll?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <button
          type="button"
          className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-3.5 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={onReadAll}
              className="inline-flex items-center gap-1 text-xs text-link hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            items.slice(0, 12).map((n) => (
              <M.Item
                key={n.id}
                onSelect={() => onOpenItem(n)}
                className={cn(
                  'flex cursor-pointer gap-3 border-b px-3.5 py-3 outline-none last:border-0 data-[highlighted]:bg-muted',
                  !n.readAt && 'bg-accent-soft/40',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    n.readAt ? 'bg-transparent' : 'bg-accent',
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatRelative(n.createdAt)}
                  </p>
                </div>
              </M.Item>
            ))
          )}
        </div>
        {onViewAll && (
          <M.Item
            onSelect={onViewAll}
            className="block cursor-pointer border-t px-3.5 py-2.5 text-center text-xs font-medium text-link outline-none data-[highlighted]:bg-muted"
          >
            View all notifications
          </M.Item>
        )}
      </DropdownContent>
    </DropdownMenu>
  );
}
