import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PARTNER_ROLES_KEY } from '../decorators/roles.decorator';
import { PartnerRole } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class PartnerRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<PartnerRole[]>(PARTNER_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role restriction specified
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.aud !== 'gnk-portal') {
      throw new ForbiddenException('Partner authentication context is missing');
    }

    // A partner might have multiple accounts. They must act in the context of an active account.
    // We expect the active account ID to be in the JWT payload (`acc`) or passed via a header.
    // For now, if they only have one account, we can infer it. Otherwise we fail if `acc` is missing.
    const request = context.switchToHttp().getRequest();
    const activeAccountId = request.headers['x-gnk-account-id'] || user.acc;

    const memberships = await this.prisma.partnerMember.findMany({
      where: { userId: user.sub },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('User does not belong to any account');
    }

    let activeMembership = memberships[0];
    if (activeAccountId) {
      activeMembership = memberships.find((m) => m.accountId === activeAccountId);
      if (!activeMembership) {
        throw new ForbiddenException('User is not a member of the requested account');
      }
    }

    // Set the actor details for the controller
    request.actor = {
      userId: user.sub,
      accountId: activeMembership.accountId,
      role: activeMembership.role,
    };

    const hasRole = requiredRoles.includes(activeMembership.role);
    if (!hasRole) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }
}
