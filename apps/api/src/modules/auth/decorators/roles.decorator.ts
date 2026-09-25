import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PartnerRole, PartnerAccountStatus } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const PARTNER_ROLES_KEY = 'partner_roles';
export const RequirePartnerRole = (...roles: PartnerRole[]) =>
  SetMetadata(PARTNER_ROLES_KEY, roles);

export const REQUIRE_ACCOUNT_STATUS_KEY = 'require_account_status';
export const RequireAccountStatus = (status: PartnerAccountStatus) =>
  SetMetadata(REQUIRE_ACCOUNT_STATUS_KEY, status);

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
