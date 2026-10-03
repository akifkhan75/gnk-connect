import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, Eye, FileText, Printer } from 'lucide-react';
import { VOUCHER_TYPES, type VoucherType } from '@gnk/types';
import {
  Breadcrumbs,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  filterPage,
  formatDate,
  formatMoney,
  useToast,
} from '@gnk/ui';
import { downloadCsv } from '@/lib/csv';
import { VOUCHER_TYPE_LABEL } from './VouchersPage';

export type LedgerSheetLine = {
  date: string;
  voucherId?: string;
  reference: string;
  type?: VoucherType;
  description: string;
  narration?: string | null;
  debit: number;
  credit: number;
  balance: number;
};

export function LedgerSheet({
  breadcrumbs,
  title,
  meta,
  description,
  headerActions,
  currency,
  opening,
  closing,
  summaryExtra,
  toolbarExtra,
  lines,
  loading,
  error,
  onRetry,
  from,
  to,
  search,
  type,
  onFrom,
  onTo,
  onSearch,
  onType,
  onClear,
  onView,
  exportName,
}: {
  breadcrumbs: { label: string; onClick?: () => void }[];
  title: string;
  meta?: ReactNode;
  description?: ReactNode;
  headerActions?: ReactNode;
  currency: string;
  opening: number;
  closing: number;
  summaryExtra?: ReactNode;
  toolbarExtra?: ReactNode;
  lines: LedgerSheetLine[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  from: string;
  to: string;
  search: string;
  type: 'ALL' | VoucherType;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onSearch: (v: string) => void;
  onType: (v: 'ALL' | VoucherType) => void;
  onClear: () => void;
  onView?: (voucherId: string) => void;
  exportName: string;
}) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return lines.filter((l) => {
      if (type !== 'ALL' && l.type !== type) return false;
      if (!s) return true;
      return (
        l.reference.toLowerCase().includes(s) ||
        l.description.toLowerCase().includes(s) ||
        (l.narration ?? '').toLowerCase().includes(s)
      );
    });
  }, [lines, search, type]);

  useEffect(() => {
    setPage(1);
  }, [from, to, search, type]);

  const paged = filterPage(filtered, { page, pageSize: 25 });

  const hasFilters = !!(from || to || search || type !== 'ALL');

  const exportCsv = () =>
    downloadCsv(`${exportName}.csv`, [
      [
        'Date',
        'Type',
        'Reference',
        'Description',
        `DR (${currency})`,
        `CR (${currency})`,
        `Balance (${currency})`,
      ],
      ...filtered.map((l) => [
        l.date,
        l.type ? VOUCHER_TYPE_LABEL[l.type] : '',
        l.reference,
        [l.description, l.narration].filter(Boolean).join(' — '),
        l.debit || '',
        l.credit || '',
        signed(l.balance),
      ]),
    ]);

  const exportPdf = () => {
    const rows = filtered
      .map(
        (l) =>
          `<tr>
            <td>${esc(formatDate(l.date))}</td>
            <td>${esc(l.type ? VOUCHER_TYPE_LABEL[l.type] : '')}</td>
            <td>${esc(l.reference)}</td>
            <td>${esc([l.description, l.narration].filter(Boolean).join(' — '))}</td>
            <td class="n">${l.debit ? money(l.debit) : '—'}</td>
            <td class="n">${l.credit ? money(l.credit) : '—'}</td>
            <td class="n">${esc(signed(l.balance))}</td>
          </tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(exportName)}</title>
      <style>
        body{font:13px/1.45 system-ui,sans-serif;color:#111;padding:24px}
        h1{font-size:20px;margin:0 0 4px}
        .meta{color:#555;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        th,td{border-bottom:1px solid #e5e5e5;padding:8px 10px;text-align:left}
        th{color:#666;font-weight:600;font-size:12px}
        td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
      </style></head><body>
      <h1>${esc(title)}</h1>
      <p class="meta">Opening: ${esc(signed(opening))} · Closing: ${esc(signed(closing))}</p>
      <table><thead><tr>
        <th>Date</th><th>Type</th><th>Reference</th><th>Description</th>
        <th class="n">DR (${esc(currency)})</th>
        <th class="n">CR (${esc(currency)})</th>
        <th class="n">Balance (${esc(currency)})</th>
      </tr></thead><tbody>${rows || '<tr><td colspan="7">No postings in this period</td></tr>'}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Allow pop-ups to export a PDF');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        title={title}
        meta={meta}
        description={description}
        actions={headerActions}
      />

      <Card>
        <div className="no-print space-y-3 border-b border-border/70 p-4">
          <div className="flex items-end gap-3 overflow-x-auto pb-0.5">
            <Field label="From date" className="w-[10.5rem] shrink-0">
              <Input
                type="date"
                value={from}
                onChange={(e) => onFrom(e.target.value)}
                aria-label="From date"
              />
            </Field>
            <Field label="To date" className="w-[10.5rem] shrink-0">
              <Input
                type="date"
                value={to}
                onChange={(e) => onTo(e.target.value)}
                aria-label="To date"
              />
            </Field>
            <Field label={'\u00a0'} className="min-w-[16rem] flex-1">
              <SearchInput
                placeholder="Search reference, booking, description..."
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </Field>
            <Field label="Transaction type" className="w-44 shrink-0">
              <Select
                value={type}
                onChange={(e) => onType(e.target.value as 'ALL' | VoucherType)}
                aria-label="Transaction type"
              >
                <option value="ALL">All types</option>
                {VOUCHER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {VOUCHER_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="link" size="sm" onClick={onClear} disabled={!hasFilters}>
              Clear filters
            </Button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {toolbarExtra}
              <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!filtered.length}>
                <Download /> CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportPdf}
                disabled={!lines.length && !loading}
              >
                <FileText /> PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer /> Print
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border/70 px-4 py-3 text-sm">
          <span>
            Opening: <span className="tabular font-medium">{signed(opening)}</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            Closing: <span className="tabular font-medium">{signed(closing)}</span>
          </span>
          {summaryExtra}
        </div>

        {error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[56rem]">
              <DataTable
                dense
                headerClassName="font-bold text-foreground"
                rows={paged.items}
                loading={loading}
                rowKey={(l) =>
                  `${l.voucherId ?? l.reference}${l.debit}${l.credit}${l.narration ?? ''}`
                }
                onRowClick={onView ? (l) => l.voucherId && onView(l.voucherId) : undefined}
                empty={<EmptyState title="No postings in this period" />}
                columns={[
                  { key: 'd', header: 'Date', cell: (l) => formatDate(l.date) },
                  {
                    key: 't',
                    header: 'Type',
                    cell: (l) => (l.type ? VOUCHER_TYPE_LABEL[l.type] : '—'),
                  },
                  {
                    key: 'r',
                    header: 'Reference',
                    cell: (l) => <span className="tabular">{l.reference}</span>,
                  },
                  {
                    key: 'x',
                    header: 'Description',
                    cell: (l) => (
                      <p className="max-w-xl truncate">
                        {[l.description, l.narration].filter(Boolean).join(' — ')}
                      </p>
                    ),
                  },
                  {
                    key: 'dr',
                    header: `DR (${currency})`,
                    align: 'right',
                    cell: (l) =>
                      l.debit ? money(l.debit) : <span className="text-muted-foreground">—</span>,
                  },
                  {
                    key: 'cr',
                    header: `CR (${currency})`,
                    align: 'right',
                    cell: (l) =>
                      l.credit ? money(l.credit) : <span className="text-muted-foreground">—</span>,
                  },
                  {
                    key: 'b',
                    header: `Balance (${currency})`,
                    align: 'right',
                    cell: (l) => (
                      <span className="tabular whitespace-nowrap">{signed(l.balance)}</span>
                    ),
                  },
                  ...(onView
                    ? [
                        {
                          key: 'a',
                          header: 'Actions',
                          align: 'right' as const,
                          className: 'no-print',
                          cell: (l: LedgerSheetLine) =>
                            l.voucherId ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View ${l.reference}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onView(l.voucherId!);
                                }}
                              >
                                <Eye />
                              </Button>
                            ) : null,
                        },
                      ]
                    : []),
                ]}
              />
              <Pagination
                className="no-print"
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                onChange={setPage}
              />
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export const money = (n: number) =>
  formatMoney(n, { decimals: true, currency: false }).replace(/^[−-]/, '');

export const signed = (n: number) => `${money(Math.abs(n))} ${n < 0 ? 'CR' : 'DR'}`;

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
