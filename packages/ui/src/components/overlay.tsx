import * as React from 'react';
import * as D from '@radix-ui/react-dialog';
import * as M from '@radix-ui/react-dropdown-menu';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { Field, Textarea } from './form';

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[hsl(240_6%_10%/0.28)] backdrop-blur-[6px] data-[state=open]:animate-[gnk-fade-in_180ms_ease-out] dark:bg-black/60" />
        <D.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-surface shadow-pop data-[state=open]:animate-[gnk-pop-in_220ms_var(--ease)]',
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
            <div>
              <D.Title className="text-[17px] font-semibold tracking-[-0.02em]">{title}</D.Title>
              {description ? (
                <D.Description className="mt-0.5 text-[13px] text-muted-foreground">
                  {description}
                </D.Description>
              ) : (
                <D.Description className="sr-only">{String(title)}</D.Description>
              )}
            </div>
            <D.Close
              className="-mr-2 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </D.Close>
          </div>
          {children && <div className="overflow-y-auto px-6 py-4">{children}</div>}
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-5 pt-2">
              {footer}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Right-side panel for list → detail workflows (keeps the list in context). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-[hsl(240_6%_10%/0.2)] backdrop-blur-[2px] data-[state=open]:animate-[gnk-fade-in_180ms_ease-out] dark:bg-black/50" />
        <D.Content
          className={cn(
            'fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-background shadow-pop data-[state=open]:animate-[gnk-slide-in-right_320ms_var(--ease)] sm:inset-y-2 sm:right-2 sm:w-[calc(100%-1rem)] sm:overflow-hidden sm:rounded-2xl',
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-surface/80 px-6 py-4 backdrop-blur">
            <div className="min-w-0">
              <D.Title className="truncate text-[17px] font-semibold tracking-[-0.02em]">
                {title}
              </D.Title>
              {description ? (
                <D.Description asChild>
                  <div className="mt-1 text-[13px] text-muted-foreground">{description}</div>
                </D.Description>
              ) : (
                <D.Description className="sr-only">Details</D.Description>
              )}
            </div>
            <D.Close
              className="-mr-2 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </D.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-surface/80 px-6 py-3 backdrop-blur">
              {footer}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/**
 * Confirmation for destructive or important actions. With `reasonLabel` it asks
 * for a required reason (reject, suspend, cancel) and passes it to onConfirm.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  reasonLabel,
  reasonRequired = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  reasonLabel?: string;
  reasonRequired?: boolean;
  onConfirm: (reason: string) => Promise<unknown> | void;
}) {
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    if (open) {
      setReason('');
      setError(undefined);
    }
  }, [open]);
  const submit = async () => {
    if (reasonLabel && reasonRequired && reason.trim().length < 3)
      return setError('Please give a reason');
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={submit}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {reasonLabel ? (
        <Field label={reasonLabel} required={reasonRequired} error={error}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
        </Field>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}
    </Dialog>
  );
}

export const DropdownMenu = M.Root;
export const DropdownTrigger = M.Trigger;

export function DropdownContent({
  children,
  align = 'end',
  className,
}: {
  children: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-48 rounded-xl bg-surface/95 p-1 shadow-pop backdrop-blur-xl data-[state=open]:animate-[gnk-pop-in_160ms_var(--ease)]',
          className,
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function DropdownItem({
  children,
  onSelect,
  danger,
  className,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <M.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13.5px] outline-none data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground',
        danger && 'text-danger [&_svg]:text-danger',
        className,
      )}
    >
      {children}
    </M.Item>
  );
}

export const DropdownSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
export const DropdownLabel = ({ children }: { children: React.ReactNode }) => (
  <M.Label className="px-2.5 py-1.5 text-xs text-muted-foreground">{children}</M.Label>
);
