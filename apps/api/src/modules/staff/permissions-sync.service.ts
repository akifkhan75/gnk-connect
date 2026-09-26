import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PERMISSIONS, STAFF_ROLES } from '@gnk/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthCacheService } from '../auth/auth-cache.service';

/**
 * Keeps the permission catalogue and system roles in the database in step with code,
 * so a deploy that adds permissions takes effect without re-running seeds.
 * Custom (admin-defined) roles are never touched.
 */
@Injectable()
export class PermissionsSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AuthCacheService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.sync();
    } catch (err) {
      this.logger.error(`Permission sync failed: ${(err as Error).message}`);
    }
  }

  async sync() {
    for (const [key, description] of Object.entries(PERMISSIONS))
      await this.prisma.permission.upsert({
        where: { key },
        update: { description },
        create: { key, description },
      });
    const ids = new Map((await this.prisma.permission.findMany()).map((p) => [p.key, p.id]));
    for (const [key, role] of Object.entries(STAFF_ROLES)) {
      const row = await this.prisma.role.upsert({
        where: { key },
        update: { name: role.name, isSystem: true },
        create: { key, name: role.name, isSystem: true },
      });
      const want = new Set(role.permissions.map((p) => ids.get(p)!));
      const have = await this.prisma.rolePermission.findMany({ where: { roleId: row.id } });
      const haveIds = new Set(have.map((h) => h.permissionId));
      const add = [...want].filter((id) => !haveIds.has(id));
      const remove = [...haveIds].filter((id) => !want.has(id));
      if (add.length)
        await this.prisma.rolePermission.createMany({
          data: add.map((permissionId) => ({ roleId: row.id, permissionId })),
        });
      if (remove.length)
        await this.prisma.rolePermission.deleteMany({
          where: { roleId: row.id, permissionId: { in: remove } },
        });
      if (add.length || remove.length) {
        this.cache.clear();
        this.logger.log(`Role ${key}: +${add.length} / -${remove.length} permissions`);
      }
    }
  }
}
