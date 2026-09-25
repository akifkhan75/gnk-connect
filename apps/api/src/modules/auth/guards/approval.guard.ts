import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ACCOUNT_STATUS_KEY } from '../decorators/roles.decorator';
import { PartnerAccountStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ApprovalGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireStatus = this.reflector.getAllAndOverride<PartnerAccountStatus>(
      REQUIRE_ACCOUNT_STATUS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireStatus) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, actor } = request;

    if (!user) {
      throw new ForbiddenException('User authentication context is missing');
    }

    // GNK Admins don't need partner account approval to view
    if (user.aud === 'gnk-admin') {
      return true;
    }

    let accountId = actor?.accountId;

    if (!accountId) {
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
      accountId = activeMembership.accountId;
    }

    const account = await this.prisma.partnerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new ForbiddenException('Account not found');
    }

    if (account.status !== requireStatus) {
      throw new ForbiddenException(
        `Your partner account status is '${account.status}'. Wholesale bookings and net pricing require verified partner approval by GNK Operations.`,
      );
    }

    return true;
  }
}
