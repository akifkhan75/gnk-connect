import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthResponse, MessageResponse, PartnerMembership, PartnerSession } from '@gnk/types';
import type {
  AcceptInviteInput,
  ChangePasswordInput,
  PartnerRegisterData,
  ResetPasswordInput,
  UpdateMyProfileInput,
} from '@gnk/validation';
import type { RequestMeta } from '../../core/http/request-meta';
import { SequencesService } from '../../core/sequences.service';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from './auth-cache.service';
import type { PartnerActor } from './auth.types';
import { LOCK_MINUTES, MAX_FAILED_LOGINS, PasswordService } from './password.service';
import { SessionService } from './session.service';

const ACCEPTED = {
  message: 'If the details are valid, we have sent you an email with the next step.',
};

@Injectable()
export class PartnerAuthService {
  private readonly logger = new Logger(PartnerAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly crypto: CryptoService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    private readonly sequences: SequencesService,
    private readonly cache: AuthCacheService,
  ) {}

  // ---------- Registration ----------

  /** Always answers the same way whether or not the email exists (plan 04 §3.1). */
  async register(dto: PartnerRegisterData, meta: RequestMeta): Promise<MessageResponse> {
    const existing = await this.prisma.partnerUser.findUnique({ where: { email: dto.email } });
    if (existing) {
      await this.mailer.registrationAttempt(dto.email);
      return { message: 'Account created. Check your email to verify your address, then sign in.' };
    }
    if (this.passwords.isWeakFor(dto.password, dto.email, dto.fullName)) {
      throw new UnprocessableEntityException({
        message: 'Choose a password that does not contain your name or email',
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'password', message: 'Password must not contain your name or email' }],
      });
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const account = await this.prisma.$transaction(async (tx) => {
      const code = await this.sequences.next('PARTNER', tx);
      return tx.partnerAccount.create({
        data: {
          code,
          type: dto.accountType,
          status: 'DRAFT',
          legalName: dto.accountType === 'AGENCY' ? dto.legalName! : dto.fullName,
          tradeName: dto.tradeName,
          dtsLicenseNo: dto.accountType === 'AGENCY' ? dto.dtsLicenseNo : null,
          ntn: dto.accountType === 'AGENCY' ? dto.ntn : null,
          iataCode: dto.iataCode,
          cnic: dto.accountType === 'INDIVIDUAL' && dto.cnic ? this.crypto.encrypt(dto.cnic) : null,
          city: dto.city,
          address: dto.address,
          phone: dto.officePhone ?? dto.mobile,
          email: dto.email,
          members: {
            create: {
              role: 'OWNER',
              user: {
                create: {
                  email: dto.email,
                  fullName: dto.fullName,
                  phone: dto.mobile,
                  passwordHash,
                  status: 'ACTIVE',
                },
              },
            },
          },
        },
        include: { members: { include: { user: true } } },
      });
    });

    const user = account.members[0].user;
    await this.sendVerification(user.id, user.email, user.fullName);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: user.id },
      action: 'partner.register',
      entityType: 'PartnerAccount',
      entityId: account.id,
      after: { code: account.code, type: account.type, legalName: account.legalName },
      meta,
    });
    return { message: 'Account created. Check your email to verify your address, then sign in.' };
  }

  async verifyEmail(token: string): Promise<MessageResponse> {
    const record = await this.consumeToken(token, 'EMAIL_VERIFY');
    await this.prisma.partnerUser.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    this.cache.invalidateUser(record.userId);
    return { message: 'Email verified. You can now submit your account for review.' };
  }

  async resendVerification(actor: PartnerActor): Promise<MessageResponse> {
    const user = await this.prisma.partnerUser.findUniqueOrThrow({ where: { id: actor.userId } });
    if (user.emailVerifiedAt) return { message: 'Your email is already verified.' };
    await this.sendVerification(user.id, user.email, user.fullName);
    return { message: 'We sent a new verification link to your email.' };
  }

  // ---------- Sign in ----------

  async login(
    email: string,
    password: string,
    meta: RequestMeta,
    res: Response,
  ): Promise<AuthResponse<PartnerSession>> {
    const user = await this.prisma.partnerUser.findUnique({ where: { email } });
    const valid = await this.passwords.verify(user?.passwordHash, password);

    if (!user || user.deletedAt)
      throw new UnauthorizedException({
        message: 'Incorrect email or password',
        code: 'BAD_CREDENTIALS',
      });

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
      await this.prisma.partnerUser.update({
        where: { id: user.id },
        data: lock
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
          : { failedLoginCount: fails },
      });
      await this.audit.log({
        actor: { realm: 'PARTNER', userId: user.id },
        action: lock ? 'auth.locked' : 'auth.login_failed',
        entityType: 'PartnerUser',
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
        message: 'This user has been disabled. Contact your account owner.',
        code: 'USER_DISABLED',
      });
    }

    await this.prisma.partnerUser.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const session = await this.buildSession(user.id);
    const tokens = await this.sessions.start(
      'PARTNER',
      user.id,
      meta,
      res,
      session.account.accountId,
    );
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: user.id },
      action: 'auth.login',
      entityType: 'PartnerUser',
      entityId: user.id,
      meta,
    });
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, session };
  }

  async buildSession(userId: string, accountId?: string): Promise<PartnerSession> {
    const user = await this.prisma.partnerUser.findUniqueOrThrow({
      where: { id: userId },
      include: { memberships: { include: { account: true }, orderBy: { createdAt: 'asc' } } },
    });
    const memberships: PartnerMembership[] = user.memberships
      .filter((m) => !m.account.deletedAt)
      .map((m) => ({
        accountId: m.accountId,
        accountCode: m.account.code,
        accountName: m.account.tradeName || m.account.legalName,
        accountStatus: m.account.status,
        accountType: m.account.type,
        role: m.role,
      }));
    if (!memberships.length)
      throw new ForbiddenException('You are not a member of any partner account');
    const account = memberships.find((m) => m.accountId === accountId) ?? memberships[0];
    return {
      realm: 'PARTNER',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        emailVerified: !!user.emailVerifiedAt,
        themePreference: user.themePreference,
      },
      account,
      memberships,
    };
  }

  // ---------- Password reset ----------

  async forgotPassword(email: string): Promise<MessageResponse> {
    const user = await this.prisma.partnerUser.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE' && !user.deletedAt) {
      const { token, hash } = CryptoService.newToken();
      await this.prisma.oneTimeToken.create({
        data: {
          realm: 'PARTNER',
          userId: user.id,
          purpose: 'PASSWORD_RESET',
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      await this.mailer.passwordReset(user.email, 'PARTNER', token);
    }
    return ACCEPTED;
  }

  async resetPassword(dto: ResetPasswordInput, meta: RequestMeta): Promise<MessageResponse> {
    const record = await this.consumeToken(dto.token, 'PASSWORD_RESET');
    const user = await this.prisma.partnerUser.findUniqueOrThrow({ where: { id: record.userId } });
    this.assertStrong(dto.password, user.email, user.fullName);
    await this.prisma.partnerUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.passwords.hash(dto.password),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await this.sessions.revokeAllForUser('PARTNER', user.id, 'password_reset');
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: user.id },
      action: 'auth.password_reset',
      entityType: 'PartnerUser',
      entityId: user.id,
      meta,
    });
    return { message: 'Password updated. Sign in with your new password.' };
  }

  // ---------- Team invites ----------

  async lookupInvite(token: string) {
    const invite = await this.findOpenInvite(token);
    const account = await this.prisma.partnerAccount.findUniqueOrThrow({
      where: { id: invite.accountId },
    });
    const existingUser = await this.prisma.partnerUser.findUnique({
      where: { email: invite.email },
    });
    return {
      email: invite.email,
      role: invite.role,
      accountName: account.tradeName || account.legalName,
      existingUser: !!existingUser,
    };
  }

  async acceptInvite(
    dto: AcceptInviteInput | { token: string; password: string },
    meta: RequestMeta,
    res: Response,
  ): Promise<AuthResponse<PartnerSession>> {
    const invite = await this.findOpenInvite(dto.token);
    let user = await this.prisma.partnerUser.findUnique({ where: { email: invite.email } });

    if (user) {
      // Existing user joins another account: prove it's them with their current password.
      if (!(await this.passwords.verify(user.passwordHash, dto.password))) {
        throw new UnauthorizedException({
          message: 'Incorrect password for this email',
          code: 'BAD_CREDENTIALS',
        });
      }
    } else {
      const full = dto as AcceptInviteInput;
      if (!full.fullName) throw new BadRequestException('Enter your full name');
      this.assertStrong(full.password, invite.email, full.fullName);
      user = await this.prisma.partnerUser.create({
        data: {
          email: invite.email,
          fullName: full.fullName.trim(),
          phone: (full.phone as string | undefined) ?? '',
          passwordHash: await this.passwords.hash(full.password),
          emailVerifiedAt: new Date(), // the invite link proves the address
          status: 'ACTIVE',
        },
      });
    }

    const already = await this.prisma.partnerMember.findUnique({
      where: { accountId_userId: { accountId: invite.accountId, userId: user.id } },
    });
    await this.prisma.$transaction([
      ...(already
        ? []
        : [
            this.prisma.partnerMember.create({
              data: {
                accountId: invite.accountId,
                userId: user.id,
                role: invite.role,
                invitedById: invite.createdById,
              },
            }),
          ]),
      this.prisma.partnerInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: user.id },
      action: 'partner.invite_accepted',
      entityType: 'PartnerAccount',
      entityId: invite.accountId,
      after: { email: invite.email, role: invite.role },
      meta,
    });

    const session = await this.buildSession(user.id, invite.accountId);
    const tokens = await this.sessions.start('PARTNER', user.id, meta, res, invite.accountId);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, session };
  }

  // ---------- Profile & security ----------

  async updateMe(actor: PartnerActor, dto: UpdateMyProfileInput) {
    await this.prisma.partnerUser.update({
      where: { id: actor.userId },
      data: { fullName: dto.fullName, phone: dto.phone as string },
    });
    this.cache.invalidateUser(actor.userId);
    return this.buildSession(actor.userId, actor.accountId);
  }

  async changePassword(
    actor: PartnerActor,
    dto: ChangePasswordInput,
    meta: RequestMeta,
  ): Promise<MessageResponse> {
    const user = await this.prisma.partnerUser.findUniqueOrThrow({ where: { id: actor.userId } });
    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnprocessableEntityException({
        message: 'Your current password is incorrect',
        code: 'VALIDATION_FAILED',
        errors: [{ path: 'currentPassword', message: 'Incorrect password' }],
      });
    }
    this.assertStrong(dto.password, user.email, user.fullName);
    await this.prisma.partnerUser.update({
      where: { id: user.id },
      data: { passwordHash: await this.passwords.hash(dto.password) },
    });
    // End every other session; the current one keeps working.
    const current = await this.prisma.session.findUnique({ where: { id: actor.sessionId } });
    await this.prisma.session.updateMany({
      where: { partnerUserId: user.id, revokedAt: null, NOT: { familyId: current?.familyId } },
      data: { revokedAt: new Date(), revokedReason: 'password_changed' },
    });
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: user.id },
      action: 'auth.password_changed',
      entityType: 'PartnerUser',
      entityId: user.id,
      meta,
    });
    return { message: 'Password changed. Other devices have been signed out.' };
  }

  async setTheme(actor: PartnerActor, theme: 'LIGHT' | 'DARK' | 'SYSTEM') {
    await this.prisma.partnerUser.update({
      where: { id: actor.userId },
      data: { themePreference: theme },
    });
    return { theme };
  }

  // ---------- helpers ----------

  private async sendVerification(userId: string, email: string, name: string) {
    await this.prisma.oneTimeToken.updateMany({
      where: { userId, purpose: 'EMAIL_VERIFY', usedAt: null },
      data: { usedAt: new Date() },
    });
    const { token, hash } = CryptoService.newToken();
    await this.prisma.oneTimeToken.create({
      data: {
        realm: 'PARTNER',
        userId,
        purpose: 'EMAIL_VERIFY',
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
    });
    await this.mailer.verifyEmail(email, name, token);
  }

  private async consumeToken(token: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET') {
    const record = await this.prisma.oneTimeToken.findUnique({
      where: { tokenHash: CryptoService.hash(token) },
    });
    if (
      !record ||
      record.realm !== 'PARTNER' ||
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

  private async findOpenInvite(token: string) {
    const invite = await this.prisma.partnerInvite.findUnique({
      where: { tokenHash: CryptoService.hash(token) },
    });
    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
      throw new NotFoundException({
        message: 'This invite is invalid or has expired. Ask for a new one.',
        code: 'TOKEN_INVALID',
      });
    }
    return invite;
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
