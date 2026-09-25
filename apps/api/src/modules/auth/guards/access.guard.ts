import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PartnerAccountStatus, PartnerRole } from '@prisma/client';
import type { Permission } from '@gnk/types';
import { ACCOUNT_STATUS, IS_PUBLIC, PARTNER_ROLES, PERMISSIONS } from '../decorators';
import type { Actor } from '../auth.types';

/** Authorization after RealmAuthGuard: staff permissions, partner roles, partner account status. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const actor: Actor | undefined = context.switchToHttp().getRequest().actor;
    if (!actor) throw new ForbiddenException();

    const permissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS, targets);
    const roles = this.reflector.getAllAndOverride<PartnerRole[]>(PARTNER_ROLES, targets);
    const statuses = this.reflector.getAllAndOverride<PartnerAccountStatus[]>(
      ACCOUNT_STATUS,
      targets,
    );

    if (permissions?.length) {
      if (actor.realm !== 'STAFF') throw new ForbiddenException();
      const missing = permissions.filter((p) => !actor.permissions.has(p));
      if (missing.length) {
        throw new ForbiddenException({
          message: 'You do not have permission to do this',
          code: 'MISSING_PERMISSION',
        });
      }
    }

    if (roles?.length || statuses?.length) {
      if (actor.realm !== 'PARTNER') throw new ForbiddenException();
      if (roles?.length && !roles.includes(actor.role)) {
        throw new ForbiddenException({
          message: 'Your role does not allow this action',
          code: 'ROLE_NOT_ALLOWED',
        });
      }
      if (statuses?.length && !statuses.includes(actor.accountStatus)) {
        throw new ForbiddenException({
          message: 'This is available once GNK Connect approves your account',
          code: 'ACCOUNT_NOT_APPROVED',
        });
      }
    }
    return true;
  }
}
