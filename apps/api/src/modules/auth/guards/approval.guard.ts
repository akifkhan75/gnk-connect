import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_APPROVAL_KEY } from '../decorators/roles.decorator';

@Injectable()
export class ApprovalGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireApproval = this.reflector.getAllAndOverride<boolean>(REQUIRE_APPROVAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireApproval) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User authentication context is missing');
    }

    // GNK Admins always have bypass
    if (user.role === 'GNK_ADMIN') {
      return true;
    }

    if (user.approvalStatus !== 'APPROVED') {
      throw new ForbiddenException(
        `Your partner account status is '${user.approvalStatus}'. Wholesale bookings and net pricing require verified partner approval by GNK Operations.`
      );
    }

    return true;
  }
}
