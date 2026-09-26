import { Injectable, Logger } from '@nestjs/common';
import type { PartnerRole, Prisma, Realm } from '@prisma/client';
import {
  NOTIFICATION_CATEGORIES,
  notificationCategory,
  type NotificationCategory,
  type NotificationDto,
  type NotificationPrefsDto,
  type Permission,
} from '@gnk/types';
import { iso } from '../../core/money';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

interface NotifyInput {
  type: string;
  title: string;
  body: string;
  link?: string;
  /** Also email the recipients, unless they turned email off for this category. */
  email?: boolean;
}

const DEFAULT_PREFS = Object.fromEntries(
  Object.keys(NOTIFICATION_CATEGORIES).map((k) => [k, { email: true }]),
) as NotificationPrefsDto;

/** In-app notifications (bell + page, pushed live) with optional email copies. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Notify members of a partner account, optionally only some roles. */
  async notifyAccount(accountId: string, input: NotifyInput, roles?: PartnerRole[]) {
    const members = await this.prisma.partnerMember.findMany({
      where: {
        accountId,
        ...(roles ? { role: { in: roles } } : {}),
        user: { status: 'ACTIVE', deletedAt: null },
      },
      include: { user: true },
    });
    await this.create(
      'PARTNER',
      members.map((m) => m.userId),
      input,
    );
    if (input.email)
      await this.email(
        members.map((m) => m.user),
        input,
        'PARTNER',
      );
  }

  async notifyPartnerUser(userId: string, input: NotifyInput) {
    await this.create('PARTNER', [userId], input);
    if (input.email) {
      const user = await this.prisma.partnerUser.findUnique({ where: { id: userId } });
      if (user) await this.email([user], input, 'PARTNER');
    }
  }

  /** Notify every active staff member who holds the permission, optionally except one. */
  async notifyStaff(permission: Permission, input: NotifyInput, exceptUserId?: string) {
    const users = await this.prisma.staffUser.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
        roles: { some: { role: { permissions: { some: { permission: { key: permission } } } } } },
      },
    });
    await this.create(
      'STAFF',
      users.map((u) => u.id),
      input,
    );
    if (input.email) await this.email(users, input, 'STAFF');
  }

  async notifyStaffUser(userId: string, input: NotifyInput) {
    await this.create('STAFF', [userId], input);
    if (input.email) {
      const user = await this.prisma.staffUser.findUnique({ where: { id: userId } });
      if (user) await this.email([user], input, 'STAFF');
    }
  }

  async list(
    realm: Realm,
    userId: string,
    unreadOnly = false,
  ): Promise<{ items: NotificationDto[]; unread: number }> {
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { realm, userId, ...(unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { realm, userId, readAt: null } }),
    ]);
    return {
      unread,
      items: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        readAt: iso(n.readAt),
        createdAt: iso(n.createdAt)!,
      })),
    };
  }

  async markRead(realm: Realm, userId: string, id?: string) {
    await this.prisma.notification.updateMany({
      where: { realm, userId, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });
    this.realtime.publish({ topic: 'notification', action: 'read' }, { realm, userIds: [userId] });
  }

  async getPrefs(realm: Realm, userId: string): Promise<NotificationPrefsDto> {
    const user =
      realm === 'PARTNER'
        ? await this.prisma.partnerUser.findUniqueOrThrow({ where: { id: userId } })
        : await this.prisma.staffUser.findUniqueOrThrow({ where: { id: userId } });
    return prefsOf(user.notificationPrefs);
  }

  async setPrefs(realm: Realm, userId: string, prefs: Partial<NotificationPrefsDto>) {
    const merged = { ...(await this.getPrefs(realm, userId)), ...prefs };
    const data = { notificationPrefs: merged as Prisma.InputJsonValue };
    if (realm === 'PARTNER') await this.prisma.partnerUser.update({ where: { id: userId }, data });
    else await this.prisma.staffUser.update({ where: { id: userId }, data });
    return merged;
  }

  private async email(
    users: { email: string; notificationPrefs: Prisma.JsonValue }[],
    input: NotifyInput,
    realm: Realm,
  ) {
    const category = notificationCategory(input.type);
    for (const u of users) {
      if (!prefsOf(u.notificationPrefs)[category].email) continue;
      await this.mailer
        .notification(u.email, input.title, input.body, input.link, realm)
        .catch((e: Error) => this.logger.warn(`Email to ${u.email} failed: ${e.message}`));
    }
  }

  private async create(realm: Realm, userIds: string[], input: NotifyInput) {
    if (!userIds.length) return;
    try {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          realm,
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link,
        })),
      });
      this.realtime.publish({ topic: 'notification', action: 'created' }, { realm, userIds });
    } catch (err) {
      this.logger.error(`Failed to create notifications: ${(err as Error).message}`);
    }
  }
}

function prefsOf(raw: Prisma.JsonValue): NotificationPrefsDto {
  const stored = (raw && typeof raw === 'object' ? raw : {}) as Partial<NotificationPrefsDto>;
  const out = { ...DEFAULT_PREFS };
  for (const k of Object.keys(DEFAULT_PREFS) as NotificationCategory[])
    if (stored[k]) out[k] = { email: !!stored[k]!.email };
  return out;
}
