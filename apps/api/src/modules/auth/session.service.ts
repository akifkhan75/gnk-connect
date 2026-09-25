import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Realm } from '@prisma/client';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { SessionInfo } from '@gnk/types';
import type { EnvConfig } from '../../core/config/env.config';
import { iso } from '../../core/money';
import type { RequestMeta } from '../../core/http/request-meta';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from './auth-cache.service';
import { ISSUER, PARTNER_AUDIENCE, STAFF_AUDIENCE } from './auth.types';

const REALM = {
  PARTNER: {
    cookie: 'gnk_prt_rt',
    path: '/api/v1/auth/partner',
    audience: PARTNER_AUDIENCE,
    accessTtlSec: 15 * 60,
    refreshTtlMs: 30 * 24 * 3600_000,
  },
  STAFF: {
    cookie: 'gnk_stf_rt',
    path: '/api/v1/auth/staff',
    audience: STAFF_AUDIENCE,
    accessTtlSec: 10 * 60,
    refreshTtlMs: 12 * 3600_000,
  },
} as const;

export interface IssuedTokens {
  accessToken: string;
  expiresIn: number;
  sessionId: string;
}

/**
 * Access JWT (memory only on the client) + rotating refresh token in an
 * httpOnly SameSite=Strict cookie, stored hashed (plan 04 §2).
 * Each refresh creates a new session row in the same family and marks the old
 * row `rotated`. Presenting a rotated token again revokes the whole family.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly secure: boolean;
  private readonly allowedOrigins: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cache: AuthCacheService,
    private readonly audit: AuditService,
    config: ConfigService<EnvConfig, true>,
  ) {
    this.secure = config.get('NODE_ENV', { infer: true }) === 'production';
    this.allowedOrigins = new Set(
      config
        .get('CORS_ORIGINS', { infer: true })
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  async start(
    realm: Realm,
    userId: string,
    meta: RequestMeta,
    res: Response,
    accountId?: string,
  ): Promise<IssuedTokens> {
    return this.issue(realm, userId, meta, res, randomUUID(), accountId);
  }

  /** Rotates the refresh cookie. Returns the user id so the caller can rebuild the session DTO. */
  async refresh(realm: Realm, req: Request, res: Response, meta: RequestMeta, accountId?: string) {
    this.assertCsrf(req);
    const token = req.cookies?.[REALM[realm].cookie];
    if (!token)
      throw new UnauthorizedException({ message: 'Sign in to continue', code: 'NO_SESSION' });

    const hash = CryptoService.hash(token);
    const session = await this.prisma.session.findUnique({ where: { refreshHash: hash } });
    if (!session || session.realm !== realm) {
      this.clearCookie(realm, res);
      throw new UnauthorizedException({ message: 'Sign in to continue', code: 'NO_SESSION' });
    }

    const userId = (realm === 'PARTNER' ? session.partnerUserId : session.staffUserId)!;

    if (session.revokedAt) {
      if (session.revokedReason === 'rotated') {
        // A refresh token was used twice: assume it was stolen and end every session in the family.
        await this.revokeFamily(session.familyId, 'reuse_detected');
        await this.audit.log({
          actor: { realm, userId },
          action: 'auth.refresh_reuse',
          entityType: 'Session',
          entityId: session.id,
          meta,
        });
        this.logger.warn(
          `Refresh token reuse detected for ${realm} user ${userId}; family revoked`,
        );
      }
      this.clearCookie(realm, res);
      throw new UnauthorizedException({
        message: 'Your session has ended. Please sign in again.',
        code: 'NO_SESSION',
      });
    }

    if (session.expiresAt < new Date()) {
      this.clearCookie(realm, res);
      throw new UnauthorizedException({
        message: 'Your session has expired. Please sign in again.',
        code: 'NO_SESSION',
      });
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: 'rotated' },
    });
    const tokens = await this.issue(
      realm,
      userId,
      meta,
      res,
      session.familyId,
      accountId,
      session.expiresAt,
    );
    return { userId, tokens };
  }

  async logout(realm: Realm, req: Request, res: Response) {
    this.assertCsrf(req);
    const token = req.cookies?.[REALM[realm].cookie];
    if (token) {
      const session = await this.prisma.session.findUnique({
        where: { refreshHash: CryptoService.hash(token) },
      });
      if (session) await this.revokeFamily(session.familyId, 'logout');
    }
    this.clearCookie(realm, res);
  }

  async revokeAllForUser(realm: Realm, userId: string, reason: string) {
    await this.prisma.session.updateMany({
      where: {
        realm,
        ...(realm === 'PARTNER' ? { partnerUserId: userId } : { staffUserId: userId }),
        OR: [{ revokedAt: null }, { revokedReason: 'rotated' }],
      },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    this.cache.invalidateUser(userId);
  }

  async list(realm: Realm, userId: string, currentSessionId: string): Promise<SessionInfo[]> {
    const current = await this.prisma.session.findUnique({ where: { id: currentSessionId } });
    const rows = await this.prisma.session.findMany({
      where: {
        realm,
        ...(realm === 'PARTNER' ? { partnerUserId: userId } : { staffUserId: userId }),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });
    return rows.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: iso(s.createdAt)!,
      lastUsedAt: iso(s.lastUsedAt)!,
      current: s.familyId === current?.familyId,
    }));
  }

  async revokeOne(realm: Realm, userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    const owner = realm === 'PARTNER' ? session?.partnerUserId : session?.staffUserId;
    if (!session || owner !== userId) throw new ForbiddenException();
    await this.revokeFamily(session.familyId, 'revoked_by_user');
  }

  /** New access token for the same session (used when a partner switches accounts). */
  reissueAccess(realm: Realm, userId: string, sessionId: string, accountId?: string): IssuedTokens {
    const cfg = REALM[realm];
    const accessToken = this.jwt.sign(
      { sub: userId, sid: sessionId, ...(accountId ? { acc: accountId } : {}) },
      { audience: cfg.audience, issuer: ISSUER, expiresIn: cfg.accessTtlSec },
    );
    return { accessToken, expiresIn: cfg.accessTtlSec, sessionId };
  }

  private async issue(
    realm: Realm,
    userId: string,
    meta: RequestMeta,
    res: Response,
    familyId: string,
    accountId?: string,
    familyExpiresAt?: Date,
  ): Promise<IssuedTokens> {
    const cfg = REALM[realm];
    const { token, hash } = CryptoService.newToken();
    // Staff sessions have an absolute lifetime; partner sessions slide with each refresh.
    const expiresAt =
      realm === 'STAFF' && familyExpiresAt
        ? familyExpiresAt
        : new Date(Date.now() + cfg.refreshTtlMs);

    const session = await this.prisma.session.create({
      data: {
        realm,
        partnerUserId: realm === 'PARTNER' ? userId : null,
        staffUserId: realm === 'STAFF' ? userId : null,
        refreshHash: hash,
        familyId,
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        expiresAt,
      },
    });

    res.cookie(cfg.cookie, token, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict',
      path: cfg.path,
      expires: expiresAt,
    });

    return this.reissueAccess(realm, userId, session.id, accountId);
  }

  private async revokeFamily(familyId: string, reason: string) {
    const rows = await this.prisma.session.findMany({ where: { familyId }, select: { id: true } });
    await this.prisma.session.updateMany({
      where: { familyId },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    for (const r of rows) this.cache.invalidateSession(r.id);
  }

  private clearCookie(realm: Realm, res: Response) {
    res.clearCookie(REALM[realm].cookie, {
      path: REALM[realm].path,
      httpOnly: true,
      sameSite: 'strict',
      secure: this.secure,
    });
  }

  /** Cookie-authenticated routes need a custom header (forces CORS preflight) and an allowed Origin. */
  private assertCsrf(req: Request) {
    const origin = req.headers.origin;
    if (req.headers['x-gnk-csrf'] !== '1' || (origin && !this.allowedOrigins.has(origin))) {
      throw new ForbiddenException({ message: 'Request blocked', code: 'CSRF' });
    }
  }
}
