import * as React from 'react';
import { Bell, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@gnk/api-client';
import { Button } from './Button';
import { cn } from './Button';

// Simple Popover implementation since we don't have Radix imported
export function NotificationBell({ userId, realm }: { userId: string, realm: 'PARTNER' | 'ADMIN' }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', userId, realm],
    queryFn: () => notificationsApi.getMyNotifications(userId, realm),
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread', userId, realm],
    queryFn: () => notificationsApi.getUnreadCount(userId, realm),
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(userId, realm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-lg z-50 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 gap-1 text-primary"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <Check className="w-3 h-3" /> Mark all read
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-0">
            {!notifications || notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                You have no notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notif: any) => (
                  <div 
                    key={notif.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-muted/50 cursor-default",
                      !notif.readAt ? "bg-primary/5" : ""
                    )}
                    onClick={() => {
                      if (!notif.readAt) markAsRead.mutate(notif.id);
                      if (notif.link) {
                        window.location.href = notif.link;
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          !notif.readAt ? "bg-primary" : "bg-transparent"
                        )} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className={cn(
                          "text-sm", 
                          !notif.readAt ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                        )}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {notif.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-2">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
