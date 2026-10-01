// Display formats (plan 06 §5): PKR 195,000 · 15 Oct 2026 · times in Asia/Karachi.
const TZ = 'Asia/Karachi';
const money = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(
  value: number | null | undefined,
  opts: { decimals?: boolean; currency?: boolean } = {},
) {
  if (value == null || Number.isNaN(value)) return '—';
  const n = (opts.decimals ? money2 : money).format(Math.abs(value));
  const sign = value < 0 ? '−' : '';
  return opts.currency === false ? `${sign}${n}` : `${sign}PKR ${n}`;
}

/** Compact money for KPI tiles: PKR 1.25M, PKR 450K. */
export function formatMoneyCompact(value: number | null | undefined) {
  if (value == null) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000_000) return `${sign}PKR ${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}PKR ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}PKR ${Math.round(abs / 1000)}K`;
  return formatMoney(value);
}

const parse = (v: string | Date) =>
  v instanceof Date
    ? v
    : /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? new Date(`${v}T00:00:00+05:00`)
      : new Date(v);

export function formatDate(
  value: string | Date | null | undefined,
  style: 'short' | 'long' | 'weekday' = 'short',
) {
  if (!value) return '—';
  const opts: Intl.DateTimeFormatOptions =
    style === 'weekday'
      ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }
      : { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ };
  return new Intl.DateTimeFormat('en-GB', opts).format(parse(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(parse(value));
}

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return '—';
  const diff = (parse(value).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return formatDate(value);
}

export function daysUntil(value: string) {
  return Math.ceil((parse(value).getTime() - Date.now()) / 86_400_000);
}

export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export { amountInWords } from '@gnk/types';
