import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserStatus } from '@prisma/client';
import type { Permission, RoleDto, StaffUserDto } from '@gnk/types';
import type { z } from 'zod';
import type {
  adminPasswordResetSchema,
  roleSchema,
  staffInviteSchema,
  staffUpdateSchema,
} from '@gnk/validation';
import type { RequestMeta } from '../../core/http/request-meta';
import { iso } from '../../core/money';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from '../auth/auth-cache.service';
import type { StaffActor } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';

const staffInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} as const;

/**
 * Staff users and roles. System roles take their grants from code (STAFF_ROLES);
 * custom roles are edited here. Nobody can grant a permission they don't hold.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    private readonly cache: AuthCacheService,
    private readonly sessions: SessionService,
    private readonly passwords: PasswordService,
  ) {}

  // ---------- Users ----------

  async list(actor: StaffActor): Promise<StaffUserDto[]> {
    const users = await this.prisma.staffUser.findMany({
      where: { deletedAt: null },
      include: staffInclude,
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => this.toDto(u, actor.userId));
  }

  async create(actor: StaffActor, dto: z.output<typeof staffInviteSchema>, meta: RequestMeta) {
    const existing = await this.prisma.staffUser.findUnique({ where: { email: dto.email } });
    if (existing) throw this.fieldError('email', 'A staff member with this email already exists');
    const roles = await this.assignableRoles(actor, dto.roles);
    const byPassword = dto.mode === 'password';
    const user = await this.prisma.staffUser.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        status: byPassword ? 'ACTIVE' : 'INVITED',
        passwordHash: byPassword ? await this.passwords.hash(dto.password!) : null,
        mustChangePassword: byPassword,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      include: staffInclude,
    });
    if (byPassword)
      await this.mailer.accountCreated(user.email, user.fullName, 'STAFF', actor.fullName);
    else await this.sendInvite(user.id, user.email, user.fullName);
    await this.log(
      actor,
      byPassword ? 'staff.create' : 'staff.invite',
      user.id,
      { email: dto.email, roles: dto.roles },
      meta,
    );
    return this.toDto(user, actor.userId);
  }

  async resendInvite(id: string) {
    const user = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!user || user.status !== 'INVITED')
      throw new BadRequestException('This person has already accepted their invite');
    await this.sendInvite(user.id, user.email, user.fullName);
  }

  async update(
    actor: StaffActor,
    id: string,
    dto: z.output<typeof staffUpdateSchema>,
    meta: RequestMeta,
  ) {
    const user = await this.prisma.staffUser.findUnique({ where: { id }, include: staffInclude });
    if (!user || user.deletedAt) throw new NotFoundException('Staff member not found');
    if (id === actor.userId && (dto.roles || dto.status))
      throw new BadRequestException('You cannot change your own roles or status');
    // Editing someone who holds more power than you would let you take it away or lock them out.
    this.assertCovers(actor, this.permissionsOf(user));

    if (dto.roles) {
      const roles = await this.assignableRoles(actor, dto.roles);
      const removingLastAdmin =
        user.roles.some((r) => r.role.key === 'SUPER_ADMIN') &&
        !dto.roles.includes('SUPER_ADMIN') &&
        (await this.activeSuperAdmins()) <= 1;
      if (removingLastAdmin)
        throw new ConflictException('At least one active super admin is required');
      await this.prisma.$transaction([
        this.prisma.staffUserRole.deleteMany({ where: { userId: id } }),
        this.prisma.staffUserRole.createMany({
          data: roles.map((r) => ({ userId: id, roleId: r.id })),
        }),
      ]);
    }
    if (dto.status && dto.status !== user.status && user.status !== 'INVITED') {
      if (
        dto.status === 'DISABLED' &&
        user.roles.some((r) => r.role.key === 'SUPER_ADMIN') &&
        (await this.activeSuperAdmins()) <= 1
      )
        throw new ConflictException('At least one active super admin is required');
      await this.prisma.staffUser.update({
        where: { id },
        data: { status: dto.status as UserStatus },
      });
      if (dto.status === 'DISABLED') await this.sessions.revokeAllForUser('STAFF', id, 'disabled');
    }
    if (dto.fullName)
      await this.prisma.staffUser.update({ where: { id }, data: { fullName: dto.fullName } });
    this.cache.invalidateUser(id);
    await this.log(actor, 'staff.update', id, dto, meta, {
      roles: user.roles.map((r) => r.role.key),
      status: user.status,
    });
    const updated = await this.prisma.staffUser.findUniqueOrThrow({
      where: { id },
      include: staffInclude,
    });
    return this.toDto(updated, actor.userId);
  }

  /** Emails a reset link, or sets a temporary password the user must change at sign-in. */
  async resetPassword(
    actor: StaffActor,
    id: string,
    dto: z.output<typeof adminPasswordResetSchema>,
    meta: RequestMeta,
  ) {
    const user = await this.prisma.staffUser.findUnique({ where: { id }, include: staffInclude });
    if (!user || user.deletedAt) throw new NotFoundException('Staff member not found');
    if (id === actor.userId) throw new BadRequestException('Use "Change password" in your profile');
    this.assertCovers(actor, this.permissionsOf(user));
    if (dto.mode === 'link') {
      const { token, hash } = CryptoService.newToken();
      await this.prisma.oneTimeToken.create({
        data: {
          realm: 'STAFF',
          userId: id,
          purpose: 'PASSWORD_RESET',
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      await this.mailer.passwordReset(user.email, 'STAFF', token);
    } else {
      await this.prisma.staffUser.update({
        where: { id },
        data: {
          passwordHash: await this.passwords.hash(dto.password!),
          mustChangePassword: true,
          status: user.status === 'INVITED' ? 'ACTIVE' : user.status,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await this.sessions.revokeAllForUser('STAFF', id, 'password_reset_by_admin');
      this.cache.invalidateUser(id);
    }
    await this.log(actor, 'staff.password_reset', id, { mode: dto.mode }, meta);
    return { message: dto.mode === 'link' ? 'Reset link sent.' : 'Temporary password set.' };
  }

  // ---------- Roles ----------

  async roles(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.permissions.map((p) => p.permission.key as Permission).sort(),
      usersCount: r._count.users,
    }));
  }

  async createRole(actor: StaffActor, dto: z.output<typeof roleSchema>, meta: RequestMeta) {
    this.assertCovers(actor, dto.permissions);
    const key = `CUSTOM_${dto.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`;
    if (await this.prisma.role.findFirst({ where: { OR: [{ key }, { name: dto.name }] } }))
      throw this.fieldError('name', 'A role with this name already exists');
    const role = await this.prisma.role.create({
      data: {
        key,
        name: dto.name,
        description: dto.description ?? null,
        isSystem: false,
        permissions: { create: await this.permissionLinks(dto.permissions) },
      },
    });
    await this.log(actor, 'role.create', role.id, dto, meta);
    return (await this.roles()).find((r) => r.id === role.id)!;
  }

  async updateRole(
    actor: StaffActor,
    id: string,
    dto: z.output<typeof roleSchema>,
    meta: RequestMeta,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } }, users: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem)
      throw new BadRequestException('System roles are managed by GNK and cannot be edited');
    const before = role.permissions.map((p) => p.permission.key as Permission);
    this.assertCovers(actor, [...before, ...dto.permissions]);
    if (await this.prisma.role.findFirst({ where: { name: dto.name, id: { not: id } } }))
      throw this.fieldError('name', 'A role with this name already exists');
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description ?? null,
          permissions: { create: await this.permissionLinks(dto.permissions) },
        },
      }),
    ]);
    for (const u of role.users) this.cache.invalidateUser(u.userId);
    await this.log(actor, 'role.update', id, dto, meta, { name: role.name, permissions: before });
    return (await this.roles()).find((r) => r.id === id)!;
  }

  async deleteRole(actor: StaffActor, id: string, meta: RequestMeta) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users)
      throw new ConflictException(`${role._count.users} staff member(s) still have this role`);
    await this.prisma.role.delete({ where: { id } });
    await this.log(actor, 'role.delete', id, { name: role.name }, meta);
  }

  // ---------- internals ----------

  private async assignableRoles(actor: StaffActor, keys: string[]) {
    const roles = await this.prisma.role.findMany({
      where: { key: { in: keys } },
      include: { permissions: { include: { permission: true } } },
    });
    if (roles.length !== new Set(keys).size) throw this.fieldError('roles', 'Unknown role');
    this.assertCovers(
      actor,
      roles.flatMap((r) => r.permissions.map((p) => p.permission.key as Permission)),
    );
    return roles;
  }

  /** Prevents privilege escalation: you can only grant or manage what you hold yourself. */
  private assertCovers(actor: StaffActor, permissions: Iterable<Permission>) {
    const missing = [...new Set(permissions)].filter((p) => !actor.permissions.has(p));
    if (missing.length)
      throw new ForbiddenException({
        message: `You can't grant or manage permissions you don't have (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''})`,
        code: 'MISSING_PERMISSION',
      });
  }

  private permissionsOf(user: {
    roles: { role: { permissions: { permission: { key: string } }[] } }[];
  }) {
    return user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key as Permission));
  }

  private async permissionLinks(keys: Permission[]) {
    const rows = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    return rows.map((p) => ({ permissionId: p.id }));
  }

  private activeSuperAdmins() {
    return this.prisma.staffUserRole.count({
      where: { role: { key: 'SUPER_ADMIN' }, user: { status: 'ACTIVE', deletedAt: null } },
    });
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
      status: UserStatus;
      lastLoginAt: Date | null;
      createdAt: Date;
      mustChangePassword: boolean;
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
      mustChangePassword: u.mustChangePassword,
    };
  }

  private fieldError(path: string, message: string) {
    return new BadRequestException({
      message,
      code: 'VALIDATION_FAILED',
      errors: [{ path, message }],
    });
  }

  private log(
    actor: StaffActor,
    action: string,
    id: string,
    after: unknown,
    meta: RequestMeta,
    before?: unknown,
  ) {
    return this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action,
      entityType: action.startsWith('role') ? 'Role' : 'StaffUser',
      entityId: id,
      before,
      after,
      meta,
    });
  }
}
