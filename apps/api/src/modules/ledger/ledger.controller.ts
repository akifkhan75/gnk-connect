import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  adminPartnerListSchema,
  ledgerAdjustmentSchema,
  statementQuerySchema,
  type LedgerAdjustmentInput,
} from '@gnk/validation';
import type { AdminPartnerListItem, Paginated } from '@gnk/types';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePartnerCapability, RequirePermission } from '../auth/decorators';
import { LedgerService } from './ledger.service';

type StatementQuery = z.output<typeof statementQuerySchema>;

@Controller('partner/ledger')
export class PartnerLedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('balance')
  balance(@CurrentActor() actor: PartnerActor) {
    return this.ledger.balance(actor.accountId);
  }

  @Get('statement')
  @RequirePartnerCapability('ledger:view')
  statement(
    @CurrentActor() actor: PartnerActor,
    @Query(new ZodPipe(statementQuerySchema)) q: StatementQuery,
  ) {
    return this.ledger.statement(actor.accountId, q.from, q.to);
  }
}

@Controller('admin/ledger')
export class AdminLedgerController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Partner balances overview (receivables), largest debt first. */
  @Get('accounts')
  @RequirePermission('ledger:read')
  async accounts(
    @Query(new ZodPipe(adminPartnerListSchema)) q: z.output<typeof adminPartnerListSchema>,
  ): Promise<Paginated<AdminPartnerListItem>> {
    const status =
      q.status === 'APPROVED' || q.status === 'SUSPENDED'
        ? q.status
        : { in: ['APPROVED', 'SUSPENDED'] as ('APPROVED' | 'SUSPENDED')[] };
    const where: Prisma.PartnerAccountWhereInput = {
      deletedAt: null,
      status,
      ...(q.type && q.type !== 'ALL' ? { type: q.type } : {}),
      ...(q.q
        ? {
            OR: [
              { legalName: { contains: q.q, mode: 'insensitive' as const } },
              { tradeName: { contains: q.q, mode: 'insensitive' as const } },
              { code: { contains: q.q, mode: 'insensitive' as const } },
              { city: { contains: q.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.partnerAccount.findMany({
      where,
      include: {
        members: { where: { role: 'OWNER' }, include: { user: true } },
        _count: { select: { bookings: true } },
      },
    });
    const balances = await this.ledger.balances(rows.map((r) => r.id));
    const items = rows
      .map<AdminPartnerListItem>((a) => ({
        id: a.id,
        code: a.code,
        type: a.type,
        status: a.status,
        legalName: a.tradeName || a.legalName,
        city: a.city,
        email: a.email,
        phone: a.phone,
        ownerName: a.members[0]?.user.fullName ?? null,
        bookingsCount: a._count.bookings,
        balance: balances.get(a.id) ?? 0,
        creditLimit: num(a.creditLimit),
        createdAt: a.createdAt.toISOString(),
      }))
      .filter((a) => {
        if (q.balance === 'OWING') return a.balance < 0;
        if (q.balance === 'CREDIT') return a.balance > 0;
        if (q.balance === 'ZERO') return a.balance === 0;
        return true;
      })
      .sort((a, b) => a.balance - b.balance);
    const start = (q.page - 1) * q.pageSize;
    return {
      items: items.slice(start, start + q.pageSize),
      total: items.length,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  @Get(':accountId/statement')
  @RequirePermission('ledger:read')
  statement(
    @Param('accountId', UUID) accountId: string,
    @Query(new ZodPipe(statementQuerySchema)) q: StatementQuery,
  ) {
    return this.ledger.statement(accountId, q.from, q.to);
  }

  @Post(':accountId/adjustments')
  @RequirePermission('ledger:adjust')
  async adjust(
    @CurrentActor() actor: StaffActor,
    @Param('accountId', UUID) accountId: string,
    @Body(new ZodPipe(ledgerAdjustmentSchema))
    dto: z.output<typeof ledgerAdjustmentSchema> & LedgerAdjustmentInput,
    @Meta() meta: RequestMeta,
  ) {
    const before = await this.ledger.balance(accountId);
    const txn = await this.ledger.adjust(
      accountId,
      dto.direction,
      dto.amount,
      dto.description,
      actor.userId,
    );
    const after = await this.ledger.balance(accountId);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'ledger.adjust',
      entityType: 'PartnerAccount',
      entityId: accountId,
      before,
      after: {
        ...after,
        reference: txn.reference,
        direction: dto.direction,
        amount: dto.amount,
        description: dto.description,
      },
      meta,
    });
    return after;
  }
}
