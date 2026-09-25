import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';

type SequenceKind = 'BOOKING' | 'PAYMENT' | 'INVOICE' | 'LEDGER' | 'PARTNER';

const PREFIX: Record<SequenceKind, string> = {
  BOOKING: 'GNK',
  PAYMENT: 'PAY',
  INVOICE: 'INV',
  LEDGER: 'TXN',
  PARTNER: 'AGT',
};

/** Human-readable references backed by an atomic counter row per kind and year. */
@Injectable()
export class SequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async next(kind: SequenceKind, tx: Prisma.TransactionClient = this.prisma): Promise<string> {
    if (kind === 'PARTNER') {
      const n = await this.increment(tx, 'PARTNER');
      return `AGT-${String(n).padStart(6, '0')}`;
    }
    const year = new Date().getFullYear();
    const n = await this.increment(tx, `${kind}:${year}`);
    return `${PREFIX[kind]}-${year}-${String(n).padStart(6, '0')}`;
  }

  private async increment(tx: Prisma.TransactionClient, key: string): Promise<number> {
    const rows = await tx.$queryRaw<{ last: number }[]>`
      INSERT INTO "DocumentSequence" ("key", "last") VALUES (${key}, 1)
      ON CONFLICT ("key") DO UPDATE SET "last" = "DocumentSequence"."last" + 1
      RETURNING "last"`;
    return rows[0].last;
  }
}
