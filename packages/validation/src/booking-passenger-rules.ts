/** Operational rule: at most one child per ten adults on a booking manifest. */

export function maxChildrenForAdults(adultCount: number): number {
  if (!Number.isInteger(adultCount) || adultCount < 0) {
    return 0;
  }
  return Math.floor(adultCount / 10);
}

/** Max children allowed including platform-granted extra child seats beyond the auto rule. */
export function maxChildrenAllowed(adultCount: number, grantedChildSeats = 0): number {
  const grant =
    Number.isInteger(grantedChildSeats) && grantedChildSeats >= 0 ? grantedChildSeats : 0;
  return maxChildrenForAdults(adultCount) + grant;
}

export function isChildPassengerRatioValid(
  adults: number,
  children: number,
  grantedChildSeats = 0,
): boolean {
  return children <= maxChildrenAllowed(adults, grantedChildSeats);
}

export const CHILD_PER_ADULTS_RATIO_HELPER = '1 Child allowed per 10 Adults' as const;
