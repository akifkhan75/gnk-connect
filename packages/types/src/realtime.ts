// Live updates pushed over Server-Sent Events, and the notification catalogue.

/** What changed. Clients refetch the matching queries; payloads never carry data. */
export type RealtimeTopic =
  'booking' | 'payment' | 'voucher' | 'notification' | 'partner' | 'team' | 'queues';

export interface RealtimeEvent {
  topic: RealtimeTopic;
  /** Entity id, when the change concerns one record. */
  id?: string;
  /** e.g. "status_changed", "created". */
  action?: string;
}

export const NOTIFICATION_CATEGORIES = {
  bookings: 'Bookings',
  payments: 'Payments and receipts',
  accounting: 'Accounting approvals',
  team: 'Team and users',
  account: 'Account and verification',
} as const;
export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

/** Maps a notification type to its preference category. */
export const notificationCategory = (type: string): NotificationCategory => {
  if (type.startsWith('BOOKING') || type.startsWith('SUPPLIER')) return 'bookings';
  if (type.startsWith('PAYMENT') || type.startsWith('RECEIPT')) return 'payments';
  if (type.startsWith('VOUCHER') || type.startsWith('JV')) return 'accounting';
  if (type.startsWith('TEAM') || type.startsWith('USER')) return 'team';
  return 'account';
};

/**
 * Per-user switches. In-app notifications are always on; email is on by default; WhatsApp
 * (partners only) is opt-in and goes to the user's mobile number.
 */
export type NotificationPrefsDto = Record<
  NotificationCategory,
  { email: boolean; whatsapp: boolean }
>;

/** A change to some switches, e.g. { payments: { whatsapp: true } }. */
export type NotificationPrefsPatch = Partial<
  Record<NotificationCategory, Partial<{ email: boolean; whatsapp: boolean }>>
>;
