import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Permission } from '@gnk/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthCacheService } from './auth-cache.service';
import type { PartnerActor, StaffActor } from './auth.types';

/** Loads the live user/session/account state behind an access token. */
@Injectable()
export class ActorResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AuthCacheService,
  ) {}

  async partner(userId: string, sessionId: string, accountId?: string): Promise<PartnerActor> {
    const key = `P:${sessionId}:${accountId ?? ''}`;
    const cached = this.cache.get(key);
    if (cached?.realm === 'PARTNER') return cached;

    await this.assertSession(sessionId, 'PARTNER', userId);
    const user = await this.prisma.partnerUser.findUnique({
      where: { id: userId },
      include: { memberships: { include: { account: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!user || user.deletedAt || user.status !== 'ACTIVE')
      throw new UnauthorizedException('Your user account is not active');

    const memberships = user.memberships.filter((m) => !m.account.deletedAt);
    const membership = accountId
      ? memberships.find((m) => m.accountId === accountId)
      : memberships[0];
    if (!membership) throw new ForbiddenException('You are not a member of this account');

    const actor: PartnerActor = {
      realm: 'PARTNER',
      userId: user.id,
      sessionId,
      email: user.email,
      fullName: user.fullName,
      accountId: membership.accountId,
      accountCode: membership.account.code,
      accountName: membership.account.tradeName || membership.account.legalName,
      accountType: membership.account.type,
      accountStatus: membership.account.status,
      role: membership.role,
    };
    this.cache.set(key, actor);
    return actor;
  }

  async staff(userId: string, sessionId: string): Promise<StaffActor> {
    const key = `S:${sessionId}`;
    const cached = this.cache.get(key);
    if (cached?.realm === 'STAFF') return cached;

    await this.assertSession(sessionId, 'STAFF', userId);
    const user = await this.prisma.staffUser.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user || user.deletedAt || user.status !== 'ACTIVE')
      throw new UnauthorizedException('Your staff account is not active');

    const permissions = new Set<Permission>();
    for (const r of user.roles)
      for (const p of r.role.permissions) permissions.add(p.permission.key as Permission);

    const actor: StaffActor = {
      realm: 'STAFF',
      userId: user.id,
      sessionId,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role.key),
      permissions,
    };
    this.cache.set(key, actor);
    return actor;
  }

  private async assertSession(sessionId: string, realm: 'PARTNER' | 'STAFF', userId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    const owner = realm === 'PARTNER' ? session?.partnerUserId : session?.staffUserId;
    // Rotated sessions stay valid for their still-live access tokens; any other revocation ends them.
    const revoked = session?.revokedAt && session.revokedReason !== 'rotated';
    if (
      !session ||
      session.realm !== realm ||
      owner !== userId ||
      revoked ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Your session has ended. Please sign in again.');
    }
  }
}
