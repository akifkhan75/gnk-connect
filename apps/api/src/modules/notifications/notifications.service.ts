import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Realm } from '@prisma/client';

export interface SendNotificationParams {
  realm: Realm;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async getMyNotifications(userId: string, realm: Realm) {
    return this.prisma.notification.findMany({
      where: { userId, realm },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  public async getUnreadCount(userId: string, realm: Realm) {
    return this.prisma.notification.count({
      where: { userId, realm, readAt: null },
    });
  }

  public async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  public async markAllAsRead(userId: string, realm: Realm) {
    return this.prisma.notification.updateMany({
      where: { userId, realm, readAt: null },
      data: { readAt: new Date() },
    });
  }

  public async sendNotification(params: SendNotificationParams) {
    const notif = await this.prisma.notification.create({
      data: {
        realm: params.realm,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
      },
    });

    // In a real system, we might also dispatch an email here depending on user preferences
    this.logger.log(`[${params.realm}] Notification sent to ${params.userId}: "${params.title}"`);
    return notif;
  }

  public async notifyAgencyApproval(userId: string, agencyName: string) {
    return this.sendNotification({
      realm: 'PARTNER',
      userId,
      type: 'KYC_APPROVED',
      title: 'Agency Account Approved! 🎉',
      body: `Congratulations! ${agencyName} has been fully verified and approved. You can now access wholesale rates and make bookings.`,
      link: '/dashboard',
    });
  }

  public async notifyBookingConfirmed(userId: string, bookingId: string, pnr: string) {
    return this.sendNotification({
      realm: 'PARTNER',
      userId,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      body: `Your booking ${bookingId} has been confirmed. PNR: ${pnr}`,
      link: `/bookings/${bookingId}/voucher`,
    });
  }

  public async notifyWalletTopup(userId: string, amount: number) {
    return this.sendNotification({
      realm: 'PARTNER',
      userId,
      type: 'WALLET_CREDITED',
      title: 'Wallet Top-up Successful',
      body: `Your wallet has been credited with Rs ${amount.toLocaleString()}. The funds are now available for bookings.`,
      link: '/payments',
    });
  }
}
