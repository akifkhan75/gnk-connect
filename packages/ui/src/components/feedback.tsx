import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, RotateCw, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';

const alertTones = {
  info: { box: 'border-info/25 bg-info-soft', icon: Info, iconClass: 'text-info' },
  success: {
    box: 'border-success/25 bg-success-soft',
    icon: CheckCircle2,
    iconClass: 'text-success',
  },
  warning: {
    box: 'border-warning/30 bg-warning-soft',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  danger: { box: 'border-danger/25 bg-danger-soft', icon: AlertCircle, iconClass: 'text-danger' },
};

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof alertTones;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = alertTones[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border px-4 py-3', t.box, className)}
    >
      <t.icon className={cn('mt-0.5 size-[18px] shrink-0', t.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1 text-[13px]">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      {icon && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <EmptyState
      className={className}
      icon={<AlertCircle />}
      title="Couldn't load this"
      description={message}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCw /> Try again
          </Button>
        )
      }
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 text-sm text-muted-foreground',
        className,
      )}
      role="status"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label ?? <span className="sr-only">Loading</span>}
    </div>
  );
}

// ---------- Toasts ----------

type ToastTone = 'success' | 'danger' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}
const ToastContext = React.createContext<((t: Omit<ToastItem, 'id'>) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const push = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-3), { ...t, id }]);
    setTimeout(
      () => setItems((xs) => xs.filter((x) => x.id !== id)),
      t.tone === 'danger' ? 7000 : 4500,
    );
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((t) => {
          const Icon =
            t.tone === 'success' ? CheckCircle2 : t.tone === 'danger' ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex gap-3 rounded-lg border bg-surface p-3.5 shadow-pop animate-[gnk-pop-in_160ms_ease-out]"
            >
              <Icon
                className={cn(
                  'mt-0.5 size-[18px] shrink-0',
                  t.tone === 'success'
                    ? 'text-success'
                    : t.tone === 'danger'
                      ? 'text-danger'
                      : 'text-info',
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = React.useContext(ToastContext);
  if (!push) throw new Error('useToast must be used inside ToastProvider');
  return React.useMemo(
    () => ({
      success: (title: string, description?: string) =>
        push({ tone: 'success', title, description }),
      error: (title: string, description?: string) => push({ tone: 'danger', title, description }),
      info: (title: string, description?: string) => push({ tone: 'info', title, description }),
    }),
    [push],
  );
}
