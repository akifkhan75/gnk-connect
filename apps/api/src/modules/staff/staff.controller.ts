import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { z } from 'zod';
import type { AuditLogDto, Paginated, RoleDto, StaffUserDto } from '@gnk/types';
import {
  adminPasswordResetSchema,
  auditListSchema,
  roleSchema,
  staffInviteSchema,
  staffUpdateSchema,
} from '@gnk/validation';
import { pageArgs, paginated } from '../../core/http/pagination';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { iso } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePermission } from '../auth/decorators';
import { StaffService } from './staff.service';

@Controller('admin/staff')
export class AdminStaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @RequirePermission('staff:manage')
  list(@CurrentActor() actor: StaffActor): Promise<StaffUserDto[]> {
    return this.staff.list(actor);
  }

  /** Invite by email, or create with a temporary password (mode: 'password'). */
  @Post()
  @RequirePermission('staff:manage')
  create(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(staffInviteSchema)) dto: z.output<typeof staffInviteSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.staff.create(actor, dto, meta);
  }

  @Post(':id/resend-invite')
  @HttpCode(204)
  @RequirePermission('staff:manage')
  async resend(@Param('id', UUID) id: string) {
    await this.staff.resendInvite(id);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @RequirePermission('staff:manage')
  resetPassword(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(adminPasswordResetSchema)) dto: z.output<typeof adminPasswordResetSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.staff.resetPassword(actor, id, dto, meta);
  }

  @Patch(':id')
  @RequirePermission('staff:manage')
  update(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(staffUpdateSchema)) dto: z.output<typeof staffUpdateSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.staff.update(actor, id, dto, meta);
  }
}

@Controller('admin/roles')
export class AdminRolesController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @RequirePermission('staff:manage')
  list(): Promise<RoleDto[]> {
    return this.staff.roles();
  }

  @Post()
  @RequirePermission('roles:manage')
  create(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(roleSchema)) dto: z.output<typeof roleSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.staff.createRole(actor, dto, meta);
  }

  @Patch(':id')
  @RequirePermission('roles:manage')
  update(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(roleSchema)) dto: z.output<typeof roleSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.staff.updateRole(actor, id, dto, meta);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('roles:manage')
  async remove(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    await this.staff.deleteRole(actor, id, meta);
  }
}

@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('audit:read')
  async list(
    @Query(new ZodPipe(auditListSchema)) q: z.output<typeof auditListSchema>,
  ): Promise<Paginated<AuditLogDto>> {
    const where = {
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.q
        ? {
            OR: [
              { action: { contains: q.q, mode: 'insensitive' as const } },
              { entityId: { contains: q.q } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      this.prisma.auditLog.count({ where }),
    ]);
    const ids = [...new Set(rows.map((r) => r.actorId).filter(Boolean) as string[])];
    const [partners, staff] = await Promise.all([
      this.prisma.partnerUser.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true, email: true },
      }),
      this.prisma.staffUser.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true, email: true },
      }),
    ]);
    const names = new Map([...partners, ...staff].map((u) => [u.id, `${u.fullName} <${u.email}>`]));
    return paginated(
      rows.map((r) => ({
        id: r.id,
        actorRealm: r.actorRealm,
        actorName: r.actorId ? (names.get(r.actorId) ?? null) : null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        before: r.before,
        after: r.after,
        ip: r.ip,
        createdAt: iso(r.createdAt)!,
      })),
      total,
      q,
    );
  }
}
