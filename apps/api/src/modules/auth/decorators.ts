import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PartnerAccountStatus, PartnerRole } from '@prisma/client';
import { PARTNER_ROLE_CAPABILITIES, type PartnerCapability, type Permission } from '@gnk/types';

export const IS_PUBLIC = 'gnk:public';
export const PERMISSIONS = 'gnk:permissions';
export const PARTNER_ROLES = 'gnk:partner_roles';
export const ACCOUNT_STATUS = 'gnk:account_status';

/** Opt a route out of authentication. Everything else is authenticated by default. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Staff routes: every listed permission is required. */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS, permissions);

/** Partner routes: the member's role in the active account must be one of these. */
export const RequirePartnerRole = (...roles: PartnerRole[]) => SetMetadata(PARTNER_ROLES, roles);

/** Partner routes: the member's role must grant this capability (PARTNER_ROLE_CAPABILITIES). */
export const RequirePartnerCapability = (capability: PartnerCapability) =>
  RequirePartnerRole(
    ...(Object.keys(PARTNER_ROLE_CAPABILITIES) as PartnerRole[]).filter((r) =>
      PARTNER_ROLE_CAPABILITIES[r].includes(capability),
    ),
  );

/** Partner routes: the active account must be in one of these statuses. */
export const RequireAccountStatus = (...statuses: PartnerAccountStatus[]) =>
  SetMetadata(ACCOUNT_STATUS, statuses);
export const RequireApproved = () => RequireAccountStatus('APPROVED');

/** The authenticated PartnerActor or StaffActor for this request. */
export const CurrentActor = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().actor,
);
