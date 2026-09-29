import * as React from 'react';
import * as D from '@radix-ui/react-dialog';
import { CornerDownLeft, Search } from 'lucide-react';
import { cn } from '../lib/cn';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  keywords?: string;
  onSelect: () => void;
}

/** ⌘K launcher: type to filter, arrows to move, Enter to run. */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = 'Search pages and actions',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
}) {
  const [query, setQuery] = React.useState('');
  const [index, setIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = React.useMemo(
    () =>
      q
        ? items.filter((i) => `${i.label} ${i.group} ${i.keywords ?? ''}`.toLowerCase().includes(q))
        : items,
    [items, q],
  );
  const groups = [...new Set(results.map((r) => r.group))];
  const ordered = groups.flatMap((g) => results.filter((r) => r.group === g));

  const run = (item?: CommandItem) => {
    if (!item) return;
    onOpenChange(false);
    item.onSelect();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, ordered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(ordered[index]);
    }
  };
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[hsl(240_6%_10%/0.2)] backdrop-blur-[3px] data-[state=open]:animate-[gnk-fade-in_150ms_ease-out] dark:bg-black/50" />
        <D.Content
          className="fixed left-1/2 top-[14vh] z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl bg-surface/95 shadow-pop backdrop-blur-2xl data-[state=open]:animate-[gnk-pop-in_200ms_var(--ease)]"
          onKeyDown={onKeyDown}
        >
          <D.Title className="sr-only">Command menu</D.Title>
          <D.Description className="sr-only">{placeholder}</D.Description>
          <div className="flex items-center gap-3 border-b border-border/70 px-4">
            <Search className="size-[18px] text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              placeholder={placeholder}
              className="h-14 flex-1 bg-transparent text-[16px] tracking-[-0.01em] outline-none placeholder:text-muted-foreground/70"
              aria-label={placeholder}
            />
            <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground">
              esc
            </kbd>
          </div>
          <div ref={listRef} className="max-h-[min(24rem,60vh)] overflow-y-auto p-2" role="listbox">
            {!ordered.length && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No results</p>
            )}
            {groups.map((g) => (
              <div key={g} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground">
                  {g}
                </p>
                {results
                  .filter((r) => r.group === g)
                  .map((item) => {
                    const i = ordered.indexOf(item);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={i === index}
                        data-index={i}
                        onMouseMove={() => setIndex(i)}
                        onClick={() => run(item)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] tracking-[-0.01em]',
                          i === index ? 'bg-primary text-primary-foreground' : 'text-foreground',
                        )}
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              'size-4 shrink-0',
                              i === index ? 'text-primary-foreground' : 'text-muted-foreground',
                            )}
                          />
                        )}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.hint && (
                          <span
                            className={cn(
                              'text-[12px]',
                              i === index ? 'text-primary-foreground/80' : 'text-muted-foreground',
                            )}
                          >
                            {item.hint}
                          </span>
                        )}
                        {i === index && <CornerDownLeft className="size-3.5 opacity-80" />}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Small "Live" dot showing the realtime connection state. */
export function LiveIndicator({
  status,
  className,
}: {
  status: 'connecting' | 'live' | 'offline';
  className?: string;
}) {
  const label = status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[12px] text-muted-foreground',
        className,
      )}
      title={
        status === 'live'
          ? 'Updates appear automatically'
          : status === 'offline'
            ? 'Reconnecting… pages refresh when you return'
            : 'Connecting to live updates'
      }
    >
      <span
        className={cn(
          'size-[7px] rounded-full',
          status === 'live' && 'bg-success animate-[gnk-pulse-ring_2s_ease-out_infinite]',
          status === 'connecting' && 'bg-warning',
          status === 'offline' && 'bg-muted-foreground/50',
        )}
        aria-hidden
      />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
