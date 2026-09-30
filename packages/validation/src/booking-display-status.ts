import {
  isPassengerManifestCompleteForTicketing,
  resolveBookedSeatManifest,
  totalBookedSeats,
  type BookingPassengerKind,
} from './booking-seat-manifest';

/** User-facing booking lifecycle (internal DB statuses are mapped into this set). */
export type OperationalBookingDisplayStatus =
  'QUOTED' | 'PAYMENT_PENDING' | 'RECEIPT_ADDED' | 'SEATS_CONFIRMED' | 'TICKETED';

export type PassengerCompletionStatus = 'COMPLETE' | 'PENDING';

export type BookingTerminalDisplayStatus =
  | 'CANCELLED'
  | 'EXPIRED_HOLD'
  | 'REFUND_REQUESTED'
  | 'REFUNDED'
  | 'REFUNDED_PARTIAL'
  | 'REFUND_REJECTED';

export type BookingDisplayStatus = OperationalBookingDisplayStatus | BookingTerminalDisplayStatus;

export const OPERATIONAL_BOOKING_LIFECYCLE_STEPS: readonly {
  key: OperationalBookingDisplayStatus;
  label: string;
  description: string;
}[] = [
  {
    key: 'QUOTED',
    label: 'Quoted',
    description: 'Booking created and fare quoted',
  },
  {
    key: 'PAYMENT_PENDING',
    label: 'Payment Pending',
    description: 'Invoice issued — awaiting payment',
  },
  {
    key: 'RECEIPT_ADDED',
    label: 'Receipt Added',
    description: 'Payment receipt recorded',
  },
  {
    key: 'SEATS_CONFIRMED',
    label: 'Seats Confirmed',
    description: 'Receipt posted — inventory secured',
  },
  {
    key: 'TICKETED',
    label: 'Ticketed',
    description: 'Tickets issued to passengers',
  },
];

const OPERATIONAL_ORDER: OperationalBookingDisplayStatus[] = [
  'QUOTED',
  'PAYMENT_PENDING',
  'RECEIPT_ADDED',
  'SEATS_CONFIRMED',
  'TICKETED',
];

const TERMINAL_STATUSES = new Set<string>([
  'CANCELLED',
  'EXPIRED_HOLD',
  'REFUND_REQUESTED',
  'REFUNDED',
  'REFUNDED_PARTIAL',
  'REFUND_REJECTED',
]);

const HOLD_EXPIRABLE_STATUSES = new Set([
  'DRAFT',
  'QUOTED',
  'HELD',
  'PAYMENT_PENDING',
  'AWAITING_RECEIPT',
  'RECEIPT_ADDED',
]);

/** True when a booking's payment hold deadline has passed but seats were not confirmed. */
export function isBookingHoldExpired(
  params: Readonly<{
    internalStatus: string;
    heldUntil?: string | null;
    now?: Date;
  }>,
): boolean {
  if (params.internalStatus === 'EXPIRED_HOLD') {
    return true;
  }

  if (!params.heldUntil || !HOLD_EXPIRABLE_STATUSES.has(params.internalStatus)) {
    return false;
  }

  const deadlineMs = new Date(params.heldUntil).getTime();
  if (Number.isNaN(deadlineMs)) {
    return false;
  }

  return deadlineMs < (params.now ?? new Date()).getTime();
}

/** Maps persisted booking status to UI display, treating past hold deadlines as expired. */
export function resolveEffectiveBookingDisplayStatus(
  params: Readonly<{
    internalStatus: string;
    heldUntil?: string | null;
    now?: Date;
  }>,
): BookingDisplayStatus {
  if (isBookingHoldExpired(params)) {
    return 'EXPIRED_HOLD';
  }

  return resolveOperationalBookingDisplayStatus(params.internalStatus);
}

/** Maps persisted booking status to the simplified operational label shown in UI. */
export function resolveOperationalBookingDisplayStatus(
  internalStatus: string,
): BookingDisplayStatus {
  switch (internalStatus) {
    case 'DRAFT':
    case 'QUOTED':
      return 'QUOTED';
    case 'HELD':
    case 'PAYMENT_PENDING':
    case 'AWAITING_RECEIPT':
      return 'PAYMENT_PENDING';
    case 'RECEIPT_ADDED':
      return 'RECEIPT_ADDED';
    case 'CONFIRMED':
      return 'SEATS_CONFIRMED';
    case 'TICKETED':
      return 'TICKETED';
    case 'CANCELLED':
    case 'EXPIRED_HOLD':
    case 'REFUND_REQUESTED':
    case 'REFUNDED':
    case 'REFUNDED_PARTIAL':
    case 'REFUND_REJECTED':
      return internalStatus as BookingTerminalDisplayStatus;
    default:
      return 'QUOTED';
  }
}

export function operationalBookingStatusLabel(status: BookingDisplayStatus): string {
  switch (status) {
    case 'QUOTED':
      return 'Quoted';
    case 'PAYMENT_PENDING':
      return 'Payment Pending';
    case 'RECEIPT_ADDED':
      return 'Receipt Added';
    case 'SEATS_CONFIRMED':
      return 'Seats Confirmed';
    case 'TICKETED':
      return 'Ticketed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'EXPIRED_HOLD':
      return 'Expired';
    case 'REFUND_REQUESTED':
      return 'Refund Requested';
    case 'REFUNDED':
      return 'Refunded';
    case 'REFUNDED_PARTIAL':
      return 'Partially Refunded';
    case 'REFUND_REJECTED':
      return 'Refund Rejected';
    default:
      return status;
  }
}

export function isTerminalBookingDisplayStatus(
  status: BookingDisplayStatus,
): status is BookingTerminalDisplayStatus {
  return TERMINAL_STATUSES.has(status);
}

export function operationalLifecycleIndex(status: OperationalBookingDisplayStatus): number {
  return OPERATIONAL_ORDER.indexOf(status);
}

export function resolveOperationalLifecycleStepState(
  step: OperationalBookingDisplayStatus,
  internalStatus: string,
): 'completed' | 'active' | 'upcoming' {
  const display = resolveOperationalBookingDisplayStatus(internalStatus);
  if (isTerminalBookingDisplayStatus(display)) {
    return 'upcoming';
  }
  const currentIdx = operationalLifecycleIndex(display);
  const stepIdx = operationalLifecycleIndex(step);
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'upcoming';
}

export function resolvePassengerCompletionStatus(
  params: Readonly<{
    bookedAdults: number | null | undefined;
    bookedChildren: number | null | undefined;
    bookedInfants: number | null | undefined;
    passengers?: readonly { passengerKind: BookingPassengerKind }[];
  }>,
): PassengerCompletionStatus {
  const manifest = resolveBookedSeatManifest({
    bookedAdults: params.bookedAdults,
    bookedChildren: params.bookedChildren,
    bookedInfants: params.bookedInfants,
    passengers: params.passengers,
  });
  const bookedSeats = manifest ? totalBookedSeats(manifest) : (params.passengers?.length ?? 0);
  const passengersAdded = params.passengers?.length ?? 0;

  if (bookedSeats <= 0) {
    return passengersAdded > 0 ? 'COMPLETE' : 'PENDING';
  }

  return passengersAdded >= bookedSeats ? 'COMPLETE' : 'PENDING';
}

export function passengerCompletionStatusLabel(status: PassengerCompletionStatus): string {
  return status === 'COMPLETE' ? 'Complete' : 'Pending';
}

export function isPassengerCompletionComplete(
  params: Readonly<{
    bookedAdults: number | null | undefined;
    bookedChildren: number | null | undefined;
    bookedInfants: number | null | undefined;
    passengers?: readonly { passengerKind: BookingPassengerKind }[];
  }>,
): boolean {
  return (
    resolvePassengerCompletionStatus(params) === 'COMPLETE' &&
    isPassengerManifestCompleteForTicketing(params)
  );
}
