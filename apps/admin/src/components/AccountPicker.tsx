import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import type { AccountOption } from '@gnk/types';
import { cn } from '@gnk/ui';

/**
 * Searchable account combobox: type a code or name, arrows to move, Enter to pick.
 * Only postable, active accounts are offered (the API enforces the same).
 */
export function AccountPicker({
  options,
  value,
  onChange,
  placeholder = 'Search account',
  filter,
  invalid,
  className,
  autoFocus,
}: {
  options: AccountOption[] | undefined;
  value: string | null | undefined;
  onChange: (account: AccountOption) => void;
  placeholder?: string;
  filter?: (a: AccountOption) => boolean;
  invalid?: boolean;
  className?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const selected = options?.find((o) => o.id === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (options ?? [])
      .filter((o) => !filter || filter(o))
      .filter(
        (o) =>
          !q ||
          o.code.toLowerCase().startsWith(q) ||
          `${o.name} ${o.path}`.toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [options, query, filter]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (o?: AccountOption) => {
    if (!o) return;
    onChange(o);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={root} className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-9 w-full items-center rounded-lg border border-input bg-surface text-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15',
          invalid && 'border-danger',
        )}
      >
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={open ? query : selected ? `${selected.code} · ${selected.name}` : ''}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && open) {
              e.preventDefault();
              pick(results[index]);
            } else if (e.key === 'Escape') setOpen(false);
          }}
          className="h-full min-w-0 flex-1 truncate bg-transparent px-3 outline-none placeholder:text-muted-foreground/60"
        />
        {selected && !open && selected.currency !== 'PKR' && (
          <span className="mr-1 rounded-md bg-highlight-soft px-1.5 py-0.5 text-[11px] font-semibold text-highlight-strong">
            {selected.currency}
          </span>
        )}
        <ChevronsUpDown className="mr-2.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-72 w-full min-w-[20rem] overflow-y-auto rounded-xl bg-surface/95 p-1 shadow-pop backdrop-blur-xl animate-[gnk-pop-in_140ms_var(--ease)]"
        >
          {!results.length && (
            <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">No accounts</li>
          )}
          {results.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === index}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseMove={() => setIndex(i)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5',
                i === index && 'bg-muted',
              )}
            >
              <span className="tabular w-16 shrink-0 text-[12px] text-muted-foreground">
                {o.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px]">{o.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{o.path}</span>
              </span>
              {o.currency !== 'PKR' && (
                <span className="text-[11px] font-semibold text-highlight-strong">
                  {o.currency}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "PKR 12,000 Dr" / "PKR 5,000 Cr" for debit-positive balances. */
export function DrCr({
  value,
  currency = 'PKR',
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  if (!value) return <span className={cn('tabular text-muted-foreground', className)}>—</span>;
  const n = Math.abs(value).toLocaleString('en-PK', { maximumFractionDigits: 2 });
  return (
    <span className={cn('tabular whitespace-nowrap', className)}>
      {currency} {n}
      <span className="ml-1 text-[11px] font-medium text-muted-foreground">
        {value > 0 ? 'Dr' : 'Cr'}
      </span>
    </span>
  );
}
