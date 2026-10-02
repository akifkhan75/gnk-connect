/** Client-side search, filter and page for lists that arrive as a full array. */
export function filterPage<T>(
  items: readonly T[] | undefined,
  opts: {
    q?: string;
    match?: (item: T, q: string) => boolean;
    filter?: (item: T) => boolean;
    page: number;
    pageSize?: number;
  },
): { items: T[]; total: number; page: number; pageSize: number } {
  const pageSize = opts.pageSize ?? 25;
  const query = opts.q?.trim().toLowerCase() ?? '';
  const filtered = (items ?? []).filter((item) => {
    if (opts.filter && !opts.filter(item)) return false;
    if (!query) return true;
    return opts.match ? opts.match(item, query) : true;
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = Math.min(Math.max(1, opts.page), pages);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
  };
}

export function includesQ(...parts: Array<string | number | null | undefined>) {
  return parts
    .filter((p) => p != null && p !== '')
    .join(' ')
    .toLowerCase();
}
