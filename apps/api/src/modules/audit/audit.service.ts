import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Realm } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { RequestMeta } from '../../core/http/request-meta';

export interface AuditEntry {
  actor?: { realm: Realm; userId: string } | null;
  action: string; // e.g. partner.approve, booking.push, auth.login_failed
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  meta?: RequestMeta | null;
}

/** Append-only audit trail (plan 04 §9). Failures are logged, never thrown into the business flow. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, tx: Prisma.TransactionClient = this.prisma) {
    try {
      await tx.auditLog.create({
        data: {
          actorRealm: entry.actor?.realm ?? null,
          actorId: entry.actor?.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
          after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
          ip: entry.meta?.ip ?? null,
          userAgent: entry.meta?.userAgent ?? null,
          requestId: entry.meta?.requestId ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Audit write failed for ${entry.action}: ${(err as Error).message}`);
    }
  }
}
