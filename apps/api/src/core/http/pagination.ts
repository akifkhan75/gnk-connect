import type { Paginated } from '@gnk/types';

export const pageArgs = (p: { page: number; pageSize: number }) => ({
  skip: (p.page - 1) * p.pageSize,
  take: p.pageSize,
});

export const paginated = <T>(
  items: T[],
  total: number,
  p: { page: number; pageSize: number },
): Paginated<T> => ({
  items,
  total,
  page: p.page,
  pageSize: p.pageSize,
});
