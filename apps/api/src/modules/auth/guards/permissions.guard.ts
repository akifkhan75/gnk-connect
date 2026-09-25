import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permission restriction specified
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.aud !== 'gnk-admin') {
      throw new ForbiddenException('Staff authentication context is missing');
    }

    const staffUser = await this.prisma.staffUser.findUnique({
      where: { id: user.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!staffUser || staffUser.status !== 'ACTIVE') {
      throw new ForbiddenException('Staff account is inactive');
    }

    const userPermissions = new Set<string>();
    for (const userRole of staffUser.roles) {
      const perms = userRole.role.permissions;
      for (const p of perms) {
        userPermissions.add(p.permission.key);
      }
    }

    const hasPermission = requiredPermissions.every((perm) => userPermissions.has(perm));
    if (!hasPermission) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }
}
