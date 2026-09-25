import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { z } from 'zod';
import type { AuditLogDto, Paginated, Permission, RoleDto, StaffUserDto } from '@gnk/types';
import { auditListSchema, staffInviteSchema, staffUpdateSchema } from '@gnk/validation';
import { pageArgs, paginated } from '../../core/http/pagination';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { iso } from '../../core/money';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from '../auth/auth-cache.service';
import type { StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePermission } from '../auth/decorators';
import { SessionService } from '../auth/session.service';

const staffInclude = { roles: { include: { role: true } } } as const;

@Controller('admin/staff')
export class AdminStaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    private readonly cache: AuthCacheService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  @RequirePermission('staff:manage')
  async list(@CurrentActor() actor: StaffActor): Promise<StaffUserDto[]> {
    const users = await this.prisma.staffUser.findMany({
      where: { deletedAt: null },
      include: staffInclude,
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => this.toDto(u, actor.userId));
  }

  @Post()
  @RequirePermission('staff:manage')
  async invite(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(staffInviteSchema)) dto: z.output<typeof staffInviteSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const existing = await this.prisma.staffUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A staff member with this email already exists');
    const roles = await this.prisma.role.findMany({ where: { key: { in: dto.roles } } });
    const user = await this.prisma.staffUser.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        status: 'INVITED',
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      include: staffInclude,
    });
    await this.sendInvite(user.id, user.email, user.fullName);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'staff.invite',
      entityType: 'StaffUser',
      entityId: user.id,
      after: { email: dto.email, roles: dto.roles },
      meta,
    });
    return this.toDto(user, actor.userId);
  }

  @Post(':id/resend-invite')
  @HttpCode(204)
  @RequirePermission('staff:manage')
  async resend(@Param('id', UUID) id: string) {
    const user = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!user || user.status !== 'INVITED')
      throw new BadRequestException('This person has already accepted their invite');
    await this.sendInvite(user.id, user.email, user.fullName);
  }

  @Patch(':id')
  @RequirePermission('staff:manage')
  async update(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(staffUpdateSchema)) dto: z.output<typeof staffUpdateSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const user = await this.prisma.staffUser.findUnique({ where: { id }, include: staffInclude });
    if (!user || user.deletedAt) throw new NotFoundException('Staff member not found');
    if (id === actor.userId)
      throw new BadRequestException('You cannot change your own roles or status');

    if (dto.roles) {
      const removingLastAdmin =
        user.roles.some((r) => r.role.key === 'SUPER_ADMIN') &&
        !dto.roles.includes('SUPER_ADMIN') &&
        (await this.prisma.staffUserRole.count({
          where: { role: { key: 'SUPER_ADMIN' }, user: { status: 'ACTIVE', deletedAt: null } },
        })) <= 1;
      if (removingLastAdmin)
        throw new ConflictException('At least one active super admin is required');
      const roles = await this.prisma.role.findMany({ where: { key: { in: dto.roles } } });
      await this.prisma.$transaction([
        this.prisma.staffUserRole.deleteMany({ where: { userId: id } }),
        this.prisma.staffUserRole.createMany({
          data: roles.map((r) => ({ userId: id, roleId: r.id })),
        }),
      ]);
    }
    if (dto.status && dto.status !== user.status && user.status !== 'INVITED') {
      await this.prisma.staffUser.update({ where: { id }, data: { status: dto.status } });
      if (dto.status === 'DISABLED') await this.sessions.revokeAllForUser('STAFF', id, 'disabled');
    }
    this.cache.invalidateUser(id);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'staff.update',
      entityType: 'StaffUser',
      entityId: id,
      before: { roles: user.roles.map((r) => r.role.key), status: user.status },
      after: dto,
      meta,
    });
    const updated = await this.prisma.staffUser.findUniqueOrThrow({
      where: { id },
      include: staffInclude,
    });
    return this.toDto(updated, actor.userId);
  }

  private async sendInvite(userId: string, email: string, name: string) {
    await this.prisma.oneTimeToken.updateMany({
      where: { userId, purpose: 'STAFF_INVITE', usedAt: null },
      data: { usedAt: new Date() },
    });
    const { token, hash } = CryptoService.newToken();
    await this.prisma.oneTimeToken.create({
      data: {
        realm: 'STAFF',
        userId,
        purpose: 'STAFF_INVITE',
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 72 * 3600_000),
      },
    });
    await this.mailer.staffInvite(email, name, token);
  }

  private toDto(
    u: {
      id: string;
      email: string;
      fullName: string;
      status: any;
      lastLoginAt: Date | null;
      createdAt: Date;
      roles: { role: { key: string } }[];
    },
    you: string,
  ): StaffUserDto {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      status: u.status,
      roles: u.roles.map((r) => r.role.key),
      lastLoginAt: iso(u.lastLoginAt),
      createdAt: iso(u.createdAt)!,
      isYou: u.id === you,
    };
  }
}

@Controller('admin/roles')
export class AdminRolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('staff:manage')
  async list(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    return roles.map((r) => ({
      key: r.key,
      name: r.name,
      permissions: r.permissions.map((p) => p.permission.key as Permission).sort(),
      usersCount: r._count.users,
    }));
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
