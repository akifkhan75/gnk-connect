import { isChildPassengerRatioValid } from './booking-passenger-rules';

/** Seat mix committed at checkout (inventory + fare basis). */
export type BookingSeatManifest = Readonly<{
  adults: number;
  children: number;
  infants: number;
}>;

export function totalBookedSeats(manifest: BookingSeatManifest): number {
  return manifest.adults + manifest.children + manifest.infants;
}

/** Inventory / PNR seats only — infants sit on a lap and do not consume adult stock. */
export function inventorySeatCount(manifest: BookingSeatManifest): number {
  return manifest.adults + manifest.children;
}

/** Inventoried seats: adults + children + platform-granted infant seats. */
export function resolveInventorySeatCount(
  params: Readonly<{
    bookedAdults: number | null | undefined;
    bookedChildren: number | null | undefined;
    bookedInfants: number | null | undefined;
    grantedInfantSeats?: number | null | undefined;
    passengerCount: number;
    pnrAssignedSeatCount?: number | null | undefined;
  }>,
): number {
  const manifest = resolveBookedSeatManifest({
    bookedAdults: params.bookedAdults,
    bookedChildren: params.bookedChildren,
    bookedInfants: params.bookedInfants,
  });
  if (manifest) {
    const granted =
      typeof params.grantedInfantSeats === 'number' && params.grantedInfantSeats > 0
        ? params.grantedInfantSeats
        : 0;
    return inventorySeatCount(manifest) + granted;
  }
  if (params.passengerCount > 0) {
    return params.passengerCount;
  }
  if (typeof params.pnrAssignedSeatCount === 'number' && params.pnrAssignedSeatCount > 0) {
    return params.pnrAssignedSeatCount;
  }
  return 0;
}

/** Inventory + payable seat count: booked manifest → passengers → PNR snapshot. */
export function resolveCommittedSeatCount(
  params: Readonly<{
    bookedAdults: number | null | undefined;
    bookedChildren: number | null | undefined;
    bookedInfants: number | null | undefined;
    passengerCount: number;
    pnrAssignedSeatCount?: number | null | undefined;
  }>,
): number {
  const manifest = resolveBookedSeatManifest({
    bookedAdults: params.bookedAdults,
    bookedChildren: params.bookedChildren,
    bookedInfants: params.bookedInfants,
  });
  if (manifest) {
    return totalBookedSeats(manifest);
  }
  if (params.passengerCount > 0) {
    return params.passengerCount;
  }
  if (typeof params.pnrAssignedSeatCount === 'number' && params.pnrAssignedSeatCount > 0) {
    return params.pnrAssignedSeatCount;
  }
  return 0;
}

export function isSeatManifestValid(manifest: BookingSeatManifest, grantedChildSeats = 0): boolean {
  if (!Number.isInteger(manifest.adults) || manifest.adults < 1) {
    return false;
  }
  if (
    !Number.isInteger(manifest.children) ||
    manifest.children < 0 ||
    !Number.isInteger(manifest.infants) ||
    manifest.infants < 0
  ) {
    return false;
  }
  if (manifest.infants > manifest.adults) {
    return false;
  }
  return isChildPassengerRatioValid(manifest.adults, manifest.children, grantedChildSeats);
}

export type PassengerFulfillmentPhase =
  'HOLD' | 'BOOKED' | 'PASSENGER_PENDING' | 'READY_FOR_TICKETING' | 'TICKETED';

export type BookingPassengerKind = 'ADULT' | 'CHILD' | 'INFANT';

export function manifestFromPassengerKinds(
  passengers: readonly { passengerKind: BookingPassengerKind }[],
): BookingSeatManifest {
  let adults = 0;
  let children = 0;
  let infants = 0;
  for (const row of passengers) {
    if (row.passengerKind === 'CHILD') {
      children += 1;
    } else if (row.passengerKind === 'INFANT') {
      infants += 1;
    } else {
      adults += 1;
    }
  }
  return { adults, children, infants };
}

export function resolveBookedSeatManifest(
  params: Readonly<{
    bookedAdults: number | null | undefined;
    bookedChildren: number | null | undefined;
    bookedInfants: number | null | undefined;
    passengers?: readonly { passengerKind: BookingPassengerKind }[];
  }>,
): BookingSeatManifest | null {
  if (typeof params.bookedAdults === 'number' && params.bookedAdults >= 1) {
    return {
      adults: params.bookedAdults,
      children: params.bookedChildren ?? 0,
      infants: params.bookedInfants ?? 0,
    };
  }

  const passengers = params.passengers ?? [];
  if (passengers.length === 0) {
    return null;
  }

  return manifestFromPassengerKinds(passengers);
}

/** Remaining manifest slots by passenger kind for a partial passenger list. */
export function passengerSlotsRemaining(
  passengers: readonly { passengerKind: BookingPassengerKind }[],
  booked: BookingSeatManifest,
): BookingSeatManifest {
  const filled = manifestFromPassengerKinds(passengers);
  return {
    adults: Math.max(0, booked.adults - filled.adults),
    children: Math.max(0, booked.children - filled.children),
    infants: Math.max(0, booked.infants - filled.infants),
  };
}

/** Partial passenger payload must not exceed booked seats per kind. */
export function isPassengerPayloadWithinBookedManifest(
  passengers: readonly { passengerKind: BookingPassengerKind }[],
  booked: BookingSeatManifest,
): boolean {
  const filled = manifestFromPassengerKinds(passengers);
  return (
    filled.adults <= booked.adults &&
    filled.children <= booked.children &&
    filled.infants <= booked.infants
  );
}

export function resolvePassengerFulfillmentPhase(
  params: Readonly<{
    status: string;
    bookedAdults: number | null | undefined;
    bookedChildren: number | null | undefined;
    bookedInfants: number | null | undefined;
    passengers?: readonly { passengerKind: BookingPassengerKind }[];
  }>,
): PassengerFulfillmentPhase | null {
  const manifest = resolveBookedSeatManifest(params);
  const passengerCount = params.passengers?.length ?? 0;
  const bookedSeats = manifest ? totalBookedSeats(manifest) : passengerCount;

  if (params.status === 'TICKETED') {
    return 'TICKETED';
  }

  if (params.status === 'CONFIRMED') {
    if (bookedSeats > 0 && passengerCount < bookedSeats) {
      return 'PASSENGER_PENDING';
    }
    if (bookedSeats > 0 && passengerCount >= bookedSeats) {
      return 'READY_FOR_TICKETING';
    }
    return 'BOOKED';
  }

  const holdLike = new Set([
    'HELD',
    'PAYMENT_PENDING',
    'AWAITING_RECEIPT',
    'RECEIPT_ADDED',
    'QUOTED',
    'DRAFT',
  ]);
  if (holdLike.has(params.status)) {
    return 'HOLD';
  }

  return null;
}

export function isPassengerManifestCompleteForTicketing(
  params: Readonly<{
    bookedAdults: number | null | undefined;
    bookedChildren: number | null | undefined;
    bookedInfants: number | null | undefined;
    passengers?: readonly { passengerKind: BookingPassengerKind }[];
  }>,
): boolean {
  const manifest = resolveBookedSeatManifest(params);
  if (!manifest) {
    return (params.passengers?.length ?? 0) > 0;
  }
  return (params.passengers?.length ?? 0) === totalBookedSeats(manifest);
}

/** Parse checkout/quote body fields into a seat manifest (coerces numeric strings). */
export function coerceSeatManifestFromCounts(
  adults: unknown,
  children: unknown,
  infants: unknown,
  grantedChildSeats = 0,
): BookingSeatManifest | null {
  const adultsN = Number(adults);
  if (!Number.isFinite(adultsN) || adultsN < 1) {
    return null;
  }
  const manifest: BookingSeatManifest = {
    adults: Math.floor(adultsN),
    children: Math.max(0, Math.floor(Number(children) || 0)),
    infants: Math.max(0, Math.floor(Number(infants) || 0)),
  };
  return isSeatManifestValid(manifest, grantedChildSeats) ? manifest : null;
}

export function passengerFulfillmentLabel(phase: PassengerFulfillmentPhase | null): string | null {
  switch (phase) {
    case 'HOLD':
      return 'Hold';
    case 'BOOKED':
      return 'Booked';
    case 'PASSENGER_PENDING':
      return 'Passenger Pending';
    case 'READY_FOR_TICKETING':
      return 'Ready For Ticketing';
    case 'TICKETED':
      return 'Ticketed';
    default:
      return null;
  }
}
