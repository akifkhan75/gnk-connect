import { Injectable, Logger } from '@nestjs/common';
import type { PartnerRole, Realm } from '@prisma/client';
import type { NotificationDto, Permission } from '@gnk/types';
import { iso } from '../../core/money';
import { MailerService } from '../../infra/mailer/mailer.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface NotifyInput {
  type: string;
  title: string;
  body: string;
  link?: string;
  email?: boolean;
}

/** In-app notifications (bell + page) with optional email copy for partners. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
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
    if (input.email) {
      for (const m of members)
        await this.mailer.notification(m.user.email, input.title, input.body, input.link);
    }
  }

  async notifyPartnerUser(userId: string, input: NotifyInput) {
    await this.create('PARTNER', [userId], input);
  }

  /** Notify every active staff member who holds the permission. */
  async notifyStaff(permission: Permission, input: NotifyInput) {
    const users = await this.prisma.staffUser.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        roles: { some: { role: { permissions: { some: { permission: { key: permission } } } } } },
      },
      select: { id: true },
    });
    await this.create(
      'STAFF',
      users.map((u) => u.id),
      input,
    );
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
    } catch (err) {
      this.logger.error(`Failed to create notifications: ${(err as Error).message}`);
    }
  }
}
