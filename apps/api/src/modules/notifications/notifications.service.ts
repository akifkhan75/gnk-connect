import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { 
  B2BNotification, 
  B2BVoucherData, 
  B2BBooking, 
  AgentUser, 
  Agency, 
  PaymentTransaction 
} from '@gnk/types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // In-memory notification dispatch log
  private notifications: B2BNotification[] = [
    {
      id: 'NOTIF-2026-001',
      recipientEmail: 'agent@abctravels.com',
      recipientName: 'Tariq Mansoor',
      type: 'AGENT_APPROVED',
      channel: 'EMAIL',
      title: 'GNK Connect Partner Account Approved & Activated',
      body: 'Your agency ABC Travels & Tours has been verified by GNK Operations. You now have full access to wholesale group departures and instant AirDesk allocations.',
      metadata: { agencyId: 'agency-abc-travels' },
      status: 'SENT',
      sentAt: '2026-08-16T10:00:00.000Z',
    },
    {
      id: 'NOTIF-2026-002',
      recipientEmail: 'agent@abctravels.com',
      recipientName: 'Tariq Mansoor',
      type: 'BOOKING_CONFIRMED',
      channel: 'EMAIL',
      title: 'Booking Confirmed: GNK-2026-00124 (Dubai Luxury 7-Day Group)',
      body: 'Your group reservation has been confirmed by AirDesk (PNR: AD-849302). Your official wholesale B2B travel voucher is attached.',
      metadata: { bookingId: 'GNK-2026-00124', voucherNumber: 'VCH-GNK-2026-00124' },
      status: 'SENT',
      sentAt: '2026-08-10T15:00:00.000Z',
    },
  ];

  public getNotificationHistory(email?: string): B2BNotification[] {
    if (email) {
      return this.notifications.filter((n) => n.recipientEmail.toLowerCase() === email.toLowerCase());
    }
    return [...this.notifications].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  public sendNotification(
    recipientEmail: string,
    recipientName: string,
    type: B2BNotification['type'],
    channel: B2BNotification['channel'],
    title: string,
    body: string,
    metadata?: Record<string, any>
  ): B2BNotification {
    const notif: B2BNotification = {
      id: `NOTIF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientEmail,
      recipientName,
      type,
      channel,
      title,
      body,
      metadata,
      status: 'SENT',
      sentAt: new Date().toISOString(),
    };

    this.notifications.unshift(notif);
    this.logger.log(`[${notif.channel}] Dispatched ${notif.type} to ${notif.recipientEmail}: "${notif.title}"`);
    return notif;
  }

  public sendAgentWelcome(agent: AgentUser, agency?: Agency): B2BNotification {
    return this.sendNotification(
      agent.email,
      agent.fullName,
      'AGENT_WELCOME',
      'EMAIL',
      'Welcome to GNK Connect B2B Reseller Network',
      `Dear ${agent.fullName}, your registration for ${agency?.name || 'your agency'} has been received. Our compliance team is verifying your DTS tourism license and tax certificates.`,
      { agentId: agent.id, agencyId: agency?.id }
    );
  }

  public sendAgentApproval(agent: AgentUser, agency?: Agency): B2BNotification {
    return this.sendNotification(
      agent.email,
      agent.fullName,
      'AGENT_APPROVED',
      'EMAIL',
      'Your GNK Connect Wholesale Account is Approved! 🎉',
      `Dear ${agent.fullName}, congratulations! Your agency ${agency?.name || ''} has been approved. You can now book wholesale group departures directly on the partner portal.`,
      { agentId: agent.id, agencyId: agency?.id }
    );
  }

  public sendBookingConfirmation(booking: B2BBooking): { notification: B2BNotification; voucher: B2BVoucherData } {
    const voucher = this.generateVoucherData(booking);
    const notification = this.sendNotification(
      booking.agentEmail,
      booking.agentName,
      'BOOKING_CONFIRMED',
      'EMAIL',
      `Booking Confirmed [${booking.id}] - ${booking.productTitle}`,
      `Your booking ${booking.id} has been confirmed by supplier ${booking.supplierId.toUpperCase()} with PNR ${booking.supplierBookingId || 'AD-CONFIRMED'}. Your B2B travel voucher ${voucher.voucherNumber} has been generated.`,
      {
        bookingId: booking.id,
        supplierBookingId: booking.supplierBookingId,
        voucherNumber: voucher.voucherNumber,
      }
    );

    return { notification, voucher };
  }

  public generateVoucherData(booking: B2BBooking): B2BVoucherData {
    const pnrCode = booking.supplierBookingId ? `PNR-${booking.supplierBookingId.slice(-4)}` : 'PNR-AD-8921';

    return {
      voucherNumber: `VCH-${booking.id}`,
      gnkBookingId: booking.id,
      supplierBookingId: booking.supplierBookingId || 'AD-PENDING',
      supplierPnr: pnrCode,
      tourTitle: booking.productTitle,
      destination: 'Dubai, UAE',
      durationDays: 7,
      departureDate: booking.departureDate,
      returnDate: booking.returnDate,
      airline: 'Emirates / FlyDubai (Direct)',
      hotelDetails: 'Millennium Plaza Downtown / Citymax Hotel Bur Dubai (4-Star Bed & Breakfast)',
      agencyName: booking.agencyName || 'Partner Agency',
      agentName: booking.agentName,
      agentPhone: booking.agentPhone,
      passengers: booking.passengers,
      inclusions: [
        'Direct Flight Return Economy Air Ticket',
        '4-Star Deluxe Hotel Accommodation with Daily Breakfast',
        'Airport Meet & Assist with Shared VIP Coach Transfers',
        'Desert Safari with Dune Bashing, Tanoura Show & BBQ Dinner',
        'Dubai Marina Luxury Dhow Cruise with International Buffet',
        'Burj Khalifa Level 124 Observation Deck Admission Tickets',
        'UAE Tourist Visa & Mandatory Travel Insurance'
      ],
      meetingPoint: 'Terminal 3 Arrivals Hall, Exit Gate 2 (Look for GNK / AirDesk Signboard)',
      emergencyCoordinator: '+971 50 1234567 / +92 21 34567890 (24/7 Operations Hotline)',
      verificationCode: `VERIFY-${Date.now().toString(36).toUpperCase()}`,
      issuedAt: new Date().toISOString(),
    };
  }
}
