import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from '../decorators';
import { ActorResolverService } from '../actor-resolver.service';
import { AccessClaims, ISSUER, PARTNER_AUDIENCE, STAFF_AUDIENCE } from '../auth.types';

const PARTNER_PREFIXES = ['/api/v1/partner/', '/api/v1/auth/partner/'];
const STAFF_PREFIXES = ['/api/v1/admin/', '/api/v1/auth/staff/'];

// Partner routes a suspended/closed account may still reach (to see its status and sign out).
const SUSPENDED_ALLOWED = ['/api/v1/auth/partner/'];
// Until a user replaces a password someone else set, only auth routes are open to them.
const AUTH_PREFIXES = ['/api/v1/auth/'];

const passwordChangeRequired = () =>
  new ForbiddenException({
    message: 'Choose a new password to continue',
    code: 'PASSWORD_CHANGE_REQUIRED',
  });

/**
 * Global default-deny authentication (plan 04 §4.3).
 * The route prefix decides the realm: /partner/** accepts only portal tokens,
 * /admin/** only staff tokens. A non-public route outside both prefixes is refused.
 */
@Injectable()
export class RealmAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly actors: ActorResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { actor?: unknown }>();
    const path = req.path.endsWith('/') ? req.path : `${req.path}/`;
    const realm = PARTNER_PREFIXES.some((p) => path.startsWith(p))
      ? 'PARTNER'
      : STAFF_PREFIXES.some((p) => path.startsWith(p))
        ? 'STAFF'
        : null;
    if (!realm) throw new ForbiddenException('This endpoint is not available');

    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sign in to continue');

    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        audience: realm === 'PARTNER' ? PARTNER_AUDIENCE : STAFF_AUDIENCE,
        issuer: ISSUER,
      });
    } catch {
      throw new UnauthorizedException({
        message: 'Your session has expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (realm === 'STAFF') {
      const staff = await this.actors.staff(claims.sub, claims.sid);
      if (staff.mustChangePassword && !AUTH_PREFIXES.some((p) => path.startsWith(p)))
        throw passwordChangeRequired();
      req.actor = staff;
      return true;
    }

    const requested = (req.headers['x-gnk-account'] as string | undefined) || claims.acc;
    const actor = await this.actors.partner(claims.sub, claims.sid, requested);
    if (
      (actor.accountStatus === 'SUSPENDED' || actor.accountStatus === 'CLOSED') &&
      !SUSPENDED_ALLOWED.some((p) => path.startsWith(p))
    ) {
      throw new ForbiddenException({
        message: 'This partner account is suspended. Contact GNK Connect.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }
    if (actor.mustChangePassword && !AUTH_PREFIXES.some((p) => path.startsWith(p)))
      throw passwordChangeRequired();
    req.actor = actor;
    return true;
  }
}
