import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AgentRole } from '@gnk/types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AgentRole[]) => SetMetadata(ROLES_KEY, roles);

export const REQUIRE_APPROVAL_KEY = 'require_approval';
export const RequireApprovedAgent = () => SetMetadata(REQUIRE_APPROVAL_KEY, true);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
