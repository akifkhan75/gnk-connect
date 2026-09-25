import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import type { Paginated, SupplierCallDto, SupplierDto } from '@gnk/types';
import { pageArgs, paginated } from '../../core/http/pagination';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { iso } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePermission } from '../auth/decorators';
import { SupplierGatewayService } from './supplier-gateway.service';
import { SupplierSyncService } from './supplier-sync.service';

const callsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  failed: z.enum(['true', 'false']).optional(),
});
const statusBody = z.object({ status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']) });

@Controller('admin/suppliers')
export class AdminSuppliersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SupplierSyncService,
    private readonly gateway: SupplierGatewayService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('suppliers:read')
  async list(): Promise<SupplierDto[]> {
    const since = new Date(Date.now() - 86_400_000);
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    });
    return Promise.all(
      suppliers.map(async (s) => {
        const [calls24h, failures24h] = await Promise.all([
          this.prisma.supplierCallLog.count({
            where: { supplierId: s.id, createdAt: { gte: since } },
          }),
          this.prisma.supplierCallLog.count({
            where: { supplierId: s.id, createdAt: { gte: since }, errorKind: { not: null } },
          }),
        ]);
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          adapterKey: s.adapterKey,
          status: s.status,
          mode: this.gateway.mode(),
          lastSyncAt: iso(s.lastSyncAt),
          lastSyncStatus: s.lastSyncStatus,
          productsCount: s._count.products,
          calls24h,
          failures24h,
        };
      }),
    );
  }

  @Post(':id/sync')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 5 * 60_000 } })
  @RequirePermission('suppliers:sync')
  async runSync(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    const result = await this.sync.sync(id);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'supplier.sync',
      entityType: 'Supplier',
      entityId: id,
      after: result,
      meta,
    });
    return result;
  }

  @Patch(':id')
  @RequirePermission('suppliers:sync')
  async setStatus(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(statusBody)) dto: z.output<typeof statusBody>,
    @Meta() meta: RequestMeta,
  ) {
    const before = await this.prisma.supplier.findUniqueOrThrow({ where: { id } });
    await this.prisma.supplier.update({ where: { id }, data: { status: dto.status } });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'supplier.status',
      entityType: 'Supplier',
      entityId: id,
      before: { status: before.status },
      after: dto,
      meta,
    });
    return (await this.list()).find((s) => s.id === id);
  }

  @Get(':id/calls')
  @RequirePermission('suppliers:read')
  async calls(
    @Param('id', UUID) id: string,
    @Query(new ZodPipe(callsQuery)) q: z.output<typeof callsQuery>,
  ): Promise<Paginated<SupplierCallDto & { bookingId: string | null }>> {
    const where = { supplierId: id, ...(q.failed === 'true' ? { errorKind: { not: null } } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.supplierCallLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q),
      }),
      this.prisma.supplierCallLog.count({ where }),
    ]);
    return paginated(
      rows.map((c) => ({
        id: c.id,
        bookingId: c.bookingId,
        operation: c.operation,
        responseCode: c.responseCode,
        errorKind: c.errorKind,
        durationMs: c.durationMs,
        requestBody: c.requestBody,
        responseBody: c.responseBody,
        createdAt: iso(c.createdAt)!,
      })),
      total,
      q,
    );
  }
}
