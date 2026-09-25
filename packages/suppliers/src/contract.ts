// Supplier-neutral contract. Every supplier adapter (AirDesk today, hotels later)
// maps its own API onto these shapes, so the rest of the platform never sees
// supplier-specific payloads.

export type SupplierProductType = 'GROUP' | 'UMRAH' | 'HOTEL' | 'ZIARAT' | 'OTHER';

export interface FlightLeg {
  flightNo: string;
  from: string; // IATA
  to: string; // IATA
  departTime: string; // HH:mm local
  arriveTime: string; // HH:mm local
}

export interface SupplierProductContent {
  overview: string;
  inclusions: string[];
  exclusions: string[];
  itinerary: { day: number; title: string; description: string }[];
  outbound?: FlightLeg;
  inbound?: FlightLeg;
  hotels?: { city: string; name: string; stars: number; nights: number }[];
}

export interface SupplierDeparture {
  supplierDepartureId: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string | null;
  totalSeats: number;
  availableSeats: number;
  netFare: number; // PKR per seat, supplier cost — never shown to partners
  baggage: string | null;
}

export interface SupplierProduct {
  supplierProductId: string;
  type: SupplierProductType;
  title: string;
  sector: string | null; // LHE-JED
  airline: string | null;
  destination: string;
  country: string; // ISO-3166 alpha-2
  durationDays: number | null;
  content: SupplierProductContent;
  departures: SupplierDeparture[];
}

export interface AvailabilityResult {
  available: boolean;
  availableSeats: number;
  netFare: number;
}

export interface SupplierPassenger {
  type: 'ADULT' | 'CHILD' | 'INFANT';
  title: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
}

export interface SupplierBookingRequest {
  supplierProductId: string;
  supplierDepartureId: string;
  seats: number;
  passengers: SupplierPassenger[];
  /** Our reference, sent as the idempotency key so a retried push never double-books. */
  idempotencyKey: string;
  remarks?: string;
}

export type SupplierBookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'REJECTED';

export interface SupplierBookingResult {
  supplierBookingRef: string;
  status: SupplierBookingStatus;
  pnr: string | null;
}

export type SupplierErrorKind = 'SOLD_OUT' | 'NOT_FOUND' | 'REJECTED' | 'TIMEOUT' | 'UNAVAILABLE';

export class SupplierError extends Error {
  constructor(
    public readonly kind: SupplierErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'SupplierError';
  }
}

export interface SupplierAdapter {
  readonly key: string;
  readonly name: string;
  listProducts(): Promise<SupplierProduct[]>;
  checkAvailability(
    supplierProductId: string,
    supplierDepartureId: string,
    seats: number,
  ): Promise<AvailabilityResult>;
  createBooking(request: SupplierBookingRequest): Promise<SupplierBookingResult>;
  getBookingStatus(supplierBookingRef: string): Promise<SupplierBookingResult>;
  cancelBooking(supplierBookingRef: string): Promise<SupplierBookingResult>;
}
