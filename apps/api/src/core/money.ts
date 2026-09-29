import { Prisma } from '@prisma/client';

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

/** Decimal → number for JSON responses. Values are PKR with 2 decimals, well within double precision. */
export const num = (v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : Number(v);
export const numOrNull = (v: Prisma.Decimal | number | null | undefined): number | null =>
  v == null ? null : Number(v);

export const isoDate = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null;
export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
