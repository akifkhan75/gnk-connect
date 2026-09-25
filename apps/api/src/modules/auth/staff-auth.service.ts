import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthResponse, MessageResponse, Permission, StaffSession } from '@gnk/types';
import type { AcceptInviteInput, ChangePasswordInput, ResetPasswordInput } from '@gnk/validation';
import type { RequestMeta } from '../../core/http/request-meta';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from './auth-cache.service';
import type { StaffActor } from './auth.types';
import { LOCK_MINUTES, MAX_FAILED_LOGINS, PasswordService } from './password.service';
import { SessionService } from './session.service';

/** Staff sign-in. Staff accounts are invite-only; there is no public signup. TOTP is planned but not enforced yet. */
@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    private readonly cache: AuthCacheService,
  ) {}

  async login(
    email: string,
    password: string,
    meta: RequestMeta,
    res: Response,
  ): Promise<AuthResponse<StaffSession>> {
    const user = await this.prisma.staffUser.findUnique({ where: { email } });
    const valid = await this.passwords.verify(user?.passwordHash, password);

    if (!user || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedException({
        message: 'Incorrect email or password',
        code: 'BAD_CREDENTIALS',
      });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException({
        message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        code: 'ACCOUNT_LOCKED',
      });
    }
    if (!valid) {
      const fails = user.failedLoginCount + 1;
      const lock = fails >= MAX_FAILED_LOGINS;
      await this.prisma.staffUser.update({
        where: { id: user.id },
        data: lock
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
          : { failedLoginCount: fails },
      });
      await this.audit.log({
        actor: { realm: 'STAFF', userId: user.id },
        action: lock ? 'auth.locked' : 'auth.login_failed',
        entityType: 'StaffUser',
        entityId: user.id,
        meta,
      });
      if (lock) await this.mailer.accountLocked(user.email, LOCK_MINUTES);
      throw new UnauthorizedException({
        message: 'Incorrect email or password',
        code: 'BAD_CREDENTIALS',
      });
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        message: 'Your staff account is disabled',
        code: 'USER_DISABLED',
      });
    }

    await this.prisma.staffUser.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const tokens = await this.sessions.start('STAFF', user.id, meta, res);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: user.id },
      action: 'auth.login',
      entityType: 'StaffUser',
      entityId: user.id,
      meta,
    });
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      session: await this.buildSession(user.id),
    };
  }

  async buildSession(userId: string): Promise<StaffSession> {
    const user = await this.prisma.staffUser.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    const permissions = new Set<Permission>();
    for (const r of user.roles)
      for (const p of r.role.permissions) permissions.add(p.permission.key as Permission);
    return {
      realm: 'STAFF',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        themePreference: user.themePreference,
      },
      roles: user.roles.map((r) => r.role.key),
      permissions: [...permissions].sort(),
    };
  }

  async forgotPassword(email: string): Promise<MessageResponse> {
    const user = await this.prisma.staffUser.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE' && !user.deletedAt) {
      const { token, hash } = CryptoService.newToken();
      await this.prisma.oneTimeToken.create({
        data: {
          realm: 'STAFF',
          userId: user.id,
          purpose: 'PASSWORD_RESET',
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      await this.mailer.passwordReset(user.email, 'STAFF', token);
    }
    return { message: 'If the details are valid, we have sent you an email with the next step.' };
  }

  async resetPassword(dto: ResetPasswordInput, meta: RequestMeta): Promise<MessageResponse> {
    const record = await this.consume(dto.token, 'PASSWORD_RESET');
    const user = await this.prisma.staffUser.findUniqueOrThrow({ where: { id: record.userId } });
    this.assertStrong(dto.password, user.email, user.fullName);
    await this.prisma.staffUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.passwords.hash(dto.password),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await this.sessions.revokeAllForUser('STAFF', user.id, 'password_reset');
    await this.audit.log({
      actor: { realm: 'STAFF', userId: user.id },
      action: 'auth.password_reset',
      entityType: 'StaffUser',
      entityId: user.id,
      meta,
    });
    return { message: 'Password updated. Sign in with your new password.' };
  }

  async lookupInvite(token: string) {
    const record = await this.findInvite(token);
    const user = await this.prisma.staffUser.findUniqueOrThrow({ where: { id: record.userId } });
    return { email: user.email, fullName: user.fullName };
  }

  async acceptInvite(
    dto: AcceptInviteInput,
    meta: RequestMeta,
    res: Response,
  ): Promise<AuthResponse<StaffSession>> {
    const record = await this.findInvite(dto.token);
    const user = await this.prisma.staffUser.findUniqueOrThrow({ where: { id: record.userId } });
    if (user.status !== 'INVITED')
      throw new BadRequestException({
        message: 'This invite has already been used',
        code: 'TOKEN_INVALID',
      });
    this.assertStrong(dto.password, user.email, dto.fullName);
    await this.prisma.$transaction([
      this.prisma.staffUser.update({
        where: { id: user.id },
        data: {
          fullName: dto.fullName,
          passwordHash: await this.passwords.hash(dto.password),
          status: 'ACTIVE',
          lastLoginAt: new Date(),
        },
      }),
      this.prisma.oneTimeToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: user.id },
      action: 'staff.invite_accepted',
      entityType: 'StaffUser',
      entityId: user.id,
      meta,
    });
    const tokens = await this.sessions.start('STAFF', user.id, meta, res);
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      session: await this.buildSession(user.id),
    };
  }

  async changePassword(
    actor: StaffActor,
    dto: ChangePasswordInput,
    meta: RequestMeta,
  ): Promise<MessageResponse> {
    const user = await this.prisma.staffUser.findUniqueOrThrow({ where: { id: actor.userId } });
    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnprocessableEntityException({
        message: 'Your current password is incorrect',
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'currentPassword', message: 'Incorrect password' }],
      });
    }
    this.assertStrong(dto.password, user.email, user.fullName);
    await this.prisma.staffUser.update({
      where: { id: user.id },
      data: { passwordHash: await this.passwords.hash(dto.password) },
    });
    const current = await this.prisma.session.findUnique({ where: { id: actor.sessionId } });
    await this.prisma.session.updateMany({
      where: { staffUserId: user.id, revokedAt: null, NOT: { familyId: current?.familyId } },
      data: { revokedAt: new Date(), revokedReason: 'password_changed' },
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: user.id },
      action: 'auth.password_changed',
      entityType: 'StaffUser',
      entityId: user.id,
      meta,
    });
    return { message: 'Password changed. Other devices have been signed out.' };
  }

  async setTheme(actor: StaffActor, theme: 'LIGHT' | 'DARK' | 'SYSTEM') {
    await this.prisma.staffUser.update({
      where: { id: actor.userId },
      data: { themePreference: theme },
    });
    this.cache.invalidateUser(actor.userId);
    return { theme };
  }

  private async findInvite(token: string) {
    const record = await this.prisma.oneTimeToken.findUnique({
      where: { tokenHash: CryptoService.hash(token) },
    });
    if (
      !record ||
      record.realm !== 'STAFF' ||
      record.purpose !== 'STAFF_INVITE' ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new NotFoundException({
        message: 'This invite is invalid or has expired. Ask an administrator for a new one.',
        code: 'TOKEN_INVALID',
      });
    }
    return record;
  }

  private async consume(token: string, purpose: 'PASSWORD_RESET') {
    const record = await this.prisma.oneTimeToken.findUnique({
      where: { tokenHash: CryptoService.hash(token) },
    });
    if (
      !record ||
      record.realm !== 'STAFF' ||
      record.purpose !== purpose ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException({
        message: 'This link is invalid or has expired. Request a new one.',
        code: 'TOKEN_INVALID',
      });
    }
    await this.prisma.oneTimeToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record;
  }

  private assertStrong(password: string, email: string, fullName: string) {
    if (this.passwords.isWeakFor(password, email, fullName)) {
      throw new UnprocessableEntityException({
        message: 'Choose a password that does not contain your name or email',
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'password', message: 'Password must not contain your name or email' }],
      });
    }
  }
}
