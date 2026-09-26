import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hide below this breakpoint to keep tables readable on small screens. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const hide = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  dense,
  className,
  rowClassName,
  selectedKey,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: React.ReactNode;
  dense?: boolean;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  selectedKey?: string | null;
}) {
  const cellPad = dense ? 'px-3 py-2' : 'px-4 py-3';
  const align = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-surface-sunken/70">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'sticky top-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                  dense ? 'px-3 py-2' : 'px-4 py-2.5',
                  align(c.align),
                  c.hideBelow && hide[c.hideBelow],
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className={cn(cellPad, c.hideBelow && hide[c.hideBelow])}>
                    <div
                      className="h-4 animate-pulse rounded bg-muted"
                      style={{ width: `${50 + ((i * 17 + c.key.length * 7) % 45)}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : !rows?.length ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12">
                {empty ?? (
                  <p className="text-center text-sm text-muted-foreground">Nothing to show yet.</p>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-selected={selectedKey === key || undefined}
                  className={cn(
                    'border-b transition-colors last:border-0',
                    onRowClick &&
                      'cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                    selectedKey === key && 'bg-accent-soft/70 hover:bg-accent-soft',
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        cellPad,
                        'align-middle',
                        align(c.align),
                        c.align === 'right' && 'tabular',
                        c.hideBelow && hide[c.hideBelow],
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page === 1) {
    return total ? (
      <p className={cn('px-4 py-3 text-xs text-muted-foreground', className)}>
        {total} result{total === 1 ? '' : 's'}
      </p>
    ) : null;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={cn('flex items-center justify-between gap-3 border-t px-4 py-2.5', className)}>
      <p className="text-xs text-muted-foreground">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <span className="px-2 text-xs tabular text-muted-foreground">
          {page} / {pages}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
