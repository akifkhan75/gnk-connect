import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PartnerRole, UserStatus } from '@prisma/client';
import type { AdminPartnerUserDto, PartnerInviteDto, TeamDto } from '@gnk/types';
import type { z } from 'zod';
import type {
  addMemberSchema,
  adminPartnerUserCreateSchema,
  adminPartnerUserUpdateSchema,
  adminPasswordResetSchema,
} from '@gnk/validation';
import type { RequestMeta } from '../../core/http/request-meta';
import { iso } from '../../core/money';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from '../auth/auth-cache.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PartnersService } from './partners.service';

interface NewUser {
  email: string;
  fullName: string;
  phone: string;
  role: PartnerRole;
  password: string;
}

/**
 * Adding partner users directly (temporary password, changed at first sign-in),
 * enabling/disabling them, and GNK staff managing any partner's users.
 * Email invites for agents live in PartnersService.invite.
 */
@Injectable()
export class PartnerUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partners: PartnersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly cache: AuthCacheService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  // =============== Partner (team owners and managers) ===============

  async addMember(
    actor: PartnerActor,
    dto: z.output<typeof addMemberSchema>,
    meta: RequestMeta,
  ): Promise<TeamDto> {
    if (actor.accountType !== 'AGENCY')
      throw new BadRequestException('Individual accounts cannot add team members');
    const role = dto.role as PartnerRole;
    if (role === 'OWNER' || (actor.role === 'MANAGER' && role === 'MANAGER'))
      throw new ForbiddenException('Managers can add staff and accountants only');
    const userId = await this.addUser(
      actor.accountId,
      { ...dto, role },
      actor.userId,
      actor.fullName,
    );
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'partner.member_add',
      entityType: 'PartnerAccount',
      entityId: actor.accountId,
      after: { userId, email: dto.email, role },
      meta,
    });
    return this.partners.getTeam(actor);
  }

  async setMemberStatus(
    actor: PartnerActor,
    userId: string,
    status: 'ACTIVE' | 'DISABLED',
    meta: RequestMeta,
  ) {
    if (userId === actor.userId) throw new BadRequestException('You cannot disable yourself');
    const member = await this.member(actor.accountId, userId);
    if (member.role === 'OWNER')
      throw new ForbiddenException('The account owner cannot be disabled');
    if (actor.role === 'MANAGER' && member.role === 'MANAGER')
      throw new ForbiddenException('Managers cannot change other managers');
    await this.setStatus(actor.accountId, userId, status);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: `partner.member_${status === 'ACTIVE' ? 'enable' : 'disable'}`,
      entityType: 'PartnerMember',
      entityId: member.id,
      meta,
    });
    return this.partners.getTeam(actor);
  }

  // =============== Admin (GNK staff) ===============

  async adminList(
    accountId: string,
  ): Promise<{ users: AdminPartnerUserDto[]; invites: PartnerInviteDto[] }> {
    await this.account(accountId);
    const [members, invites] = await Promise.all([
      this.prisma.partnerMember.findMany({
        where: { accountId },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.partnerInvite.findMany({
        where: { accountId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      users: members.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        status: m.user.status,
        lastLoginAt: iso(m.user.lastLoginAt),
        joinedAt: iso(m.createdAt)!,
        mustChangePassword: m.user.mustChangePassword,
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: iso(i.expiresAt)!,
        createdAt: iso(i.createdAt)!,
      })),
    };
  }

  async adminCreate(
    staff: StaffActor,
    accountId: string,
    dto: z.output<typeof adminPartnerUserCreateSchema>,
    meta: RequestMeta,
  ) {
    const account = await this.account(accountId);
    if (
      account.type !== 'AGENCY' &&
      (await this.prisma.partnerMember.count({ where: { accountId } }))
    )
      throw new BadRequestException('Individual accounts have a single user');
    if (dto.mode === 'password') {
      await this.addUser(
        accountId,
        { ...dto, password: dto.password! },
        null,
        `${staff.fullName} (GNK Connect)`,
      );
    } else {
      if (
        await this.prisma.partnerMember.findFirst({
          where: { accountId, user: { email: dto.email } },
        })
      )
        throw this.fieldError('email', 'This person is already a member');
      await this.prisma.partnerInvite.updateMany({
        where: { accountId, email: dto.email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const { token, hash } = CryptoService.newToken();
      await this.prisma.partnerInvite.create({
        data: {
          accountId,
          email: dto.email,
          role: dto.role,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 7 * 86_400_000),
          createdById: staff.userId,
        },
      });
      await this.mailer.partnerInvite(
        dto.email,
        account.tradeName || account.legalName,
        `${staff.fullName} (GNK Connect)`,
        token,
      );
    }
    await this.staffLog(
      staff,
      dto.mode === 'password' ? 'partner_user.create' : 'partner_user.invite',
      accountId,
      { email: dto.email, role: dto.role },
      meta,
    );
    return this.adminList(accountId);
  }

  async adminUpdate(
    staff: StaffActor,
    accountId: string,
    userId: string,
    dto: z.output<typeof adminPartnerUserUpdateSchema>,
    meta: RequestMeta,
  ) {
    const member = await this.member(accountId, userId);
    if (dto.role && dto.role !== member.role) {
      if (member.role === 'OWNER' && (await this.owners(accountId)) <= 1)
        throw new ConflictException('The account needs at least one owner');
      await this.prisma.partnerMember.update({
        where: { id: member.id },
        data: { role: dto.role },
      });
      this.cache.invalidateUser(userId);
    }
    if (dto.status) {
      if (
        dto.status === 'DISABLED' &&
        member.role === 'OWNER' &&
        (await this.owners(accountId, true)) <= 1
      )
        throw new ConflictException('Disabling the only active owner would lock the account out');
      await this.setStatus(accountId, userId, dto.status);
    }
    await this.staffLog(staff, 'partner_user.update', accountId, { userId, ...dto }, meta, {
      role: member.role,
    });
    return this.adminList(accountId);
  }

  async adminResetPassword(
    staff: StaffActor,
    accountId: string,
    userId: string,
    dto: z.output<typeof adminPasswordResetSchema>,
    meta: RequestMeta,
  ) {
    await this.member(accountId, userId);
    const user = await this.prisma.partnerUser.findUniqueOrThrow({ where: { id: userId } });
    if (dto.mode === 'link') {
      const { token, hash } = CryptoService.newToken();
      await this.prisma.oneTimeToken.create({
        data: {
          realm: 'PARTNER',
          userId,
          purpose: 'PASSWORD_RESET',
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      await this.mailer.passwordReset(user.email, 'PARTNER', token);
    } else {
      await this.prisma.partnerUser.update({
        where: { id: userId },
        data: {
          passwordHash: await this.passwords.hash(dto.password!),
          mustChangePassword: true,
          failedLoginCount: 0,
          lockedUntil: null,
          ...(user.status === 'INVITED' ? { status: 'ACTIVE' as UserStatus } : {}),
        },
      });
      await this.sessions.revokeAllForUser('PARTNER', userId, 'password_reset_by_admin');
      this.cache.invalidateUser(userId);
    }
    await this.staffLog(
      staff,
      'partner_user.password_reset',
      accountId,
      { userId, mode: dto.mode },
      meta,
    );
    return { message: dto.mode === 'link' ? 'Reset link sent.' : 'Temporary password set.' };
  }

  async adminRevokeInvite(
    staff: StaffActor,
    accountId: string,
    inviteId: string,
    meta: RequestMeta,
  ) {
    const { count } = await this.prisma.partnerInvite.updateMany({
      where: { id: inviteId, accountId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) throw new NotFoundException('Invite not found');
    await this.staffLog(staff, 'partner_user.invite_revoke', accountId, { inviteId }, meta);
    return this.adminList(accountId);
  }

  // =============== internals ===============

  /**
   * Creates the user (or reuses one who already belongs to another agency) and adds the
   * membership. New users get the temporary password and must change it at first sign-in.
   */
  private async addUser(
    accountId: string,
    dto: NewUser,
    addedById: string | null,
    addedByName: string,
  ) {
    const existing = await this.prisma.partnerUser.findUnique({
      where: { email: dto.email },
      include: { memberships: true },
    });
    if (existing?.memberships.some((m) => m.accountId === accountId))
      throw this.fieldError('email', 'This person is already a member');
    if (existing?.deletedAt) throw this.fieldError('email', 'This email cannot be used');

    const userId = await this.prisma.$transaction(async (tx) => {
      const user =
        existing ??
        (await tx.partnerUser.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            phone: dto.phone,
            passwordHash: await this.passwords.hash(dto.password),
            mustChangePassword: true,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(), // vouched for by the person who added them
          },
        }));
      await tx.partnerMember.create({
        data: { accountId, userId: user.id, role: dto.role, invitedById: addedById },
      });
      await tx.partnerInvite.updateMany({
        where: { accountId, email: dto.email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return user.id;
    });

    if (existing) {
      const account = await this.account(accountId);
      await this.notifications.notifyPartnerUser(existing.id, {
        type: 'TEAM_ADDED',
        title: `You were added to ${account.tradeName || account.legalName}`,
        body: `${addedByName} added you as ${dto.role.toLowerCase()}. Switch accounts from the account menu.`,
        email: true,
      });
    } else await this.mailer.accountCreated(dto.email, dto.fullName, 'PARTNER', addedByName);
    this.changed(accountId);
    return userId;
  }

  /** A user's status is global; only users who belong to this account alone can be disabled. */
  private async setStatus(accountId: string, userId: string, status: 'ACTIVE' | 'DISABLED') {
    const user = await this.prisma.partnerUser.findUniqueOrThrow({
      where: { id: userId },
      include: { memberships: true },
    });
    if (status === 'DISABLED' && user.memberships.length > 1)
      throw new ConflictException(
        'This person also works with another agency. Remove them from this team instead.',
      );
    if (user.status === 'INVITED') throw new ConflictException('This person has not signed in yet');
    await this.prisma.partnerUser.update({ where: { id: userId }, data: { status } });
    if (status === 'DISABLED') await this.sessions.revokeAllForUser('PARTNER', userId, 'disabled');
    this.cache.invalidateUser(userId);
    this.changed(accountId);
  }

  private async member(accountId: string, userId: string) {
    const member = await this.prisma.partnerMember.findUnique({
      where: { accountId_userId: { accountId, userId } },
    });
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }

  private async account(accountId: string) {
    const account = await this.prisma.partnerAccount.findUnique({ where: { id: accountId } });
    if (!account || account.deletedAt) throw new NotFoundException('Partner not found');
    return account;
  }

  private owners(accountId: string, activeOnly = false) {
    return this.prisma.partnerMember.count({
      where: { accountId, role: 'OWNER', ...(activeOnly ? { user: { status: 'ACTIVE' } } : {}) },
    });
  }

  private changed(accountId: string) {
    this.realtime.publish({ topic: 'team' }, { realm: 'PARTNER', accountId });
    this.realtime.publish(
      { topic: 'partner', id: accountId },
      { realm: 'STAFF', permission: 'partners:read' },
    );
  }

  private fieldError(path: string, message: string) {
    return new BadRequestException({
      message,
      code: 'VALIDATION_FAILED',
      errors: [{ path, message }],
    });
  }

  private staffLog(
    staff: StaffActor,
    action: string,
    accountId: string,
    after: unknown,
    meta: RequestMeta,
    before?: unknown,
  ) {
    return this.audit.log({
      actor: { realm: 'STAFF', userId: staff.userId },
      action,
      entityType: 'PartnerAccount',
      entityId: accountId,
      before,
      after,
      meta,
    });
  }
}
