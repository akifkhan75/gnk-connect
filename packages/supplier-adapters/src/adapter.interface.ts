import { 
  StandardGroupProduct, 
  GroupDeparture, 
  Passenger, 
  ProductType 
} from '@gnk/types';

export interface ProductFilter {
  destination?: string;
  country?: string;
  month?: string;
  minSeats?: number;
  productType?: ProductType;
}

export interface SupplierAvailabilityCheck {
  supplierProductId: string;
  departureId: string;
  requestedSeats: number;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  availableSeats: number;
  currentSupplierNetPricePKR: number;
  currency: string;
  departure: GroupDeparture;
  message?: string;
}

export interface SupplierBookingRequest {
  supplierProductId: string;
  departureId: string;
  seats: number;
  passengers: Passenger[];
  externalGnkBookingId: string;
  contactPerson: {
    fullName: string;
    email: string;
    phone: string;
  };
  specialRemarks?: string;
}

export interface SupplierBookingResponse {
  success: boolean;
  supplierBookingId: string;
  supplierStatus: 'CONFIRMED' | 'PENDING' | 'WAITLISTED' | 'REJECTED';
  supplierReferenceCode: string;
  confirmedSeats: number;
  totalSupplierCostPKR: number;
  supplierPnrOrVoucher?: string;
  errorMessage?: string;
  rawSupplierResponse?: any;
}

export interface SupplierBookingStatusResponse {
  supplierBookingId: string;
  supplierStatus: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'REJECTED';
  ticketOrVoucherUrl?: string;
  pnr?: string;
  updatedAt: string;
}

export interface CancellationResult {
  success: boolean;
  supplierRefundAmountPKR?: number;
  cancellationFeePKR?: number;
  supplierCancellationReference?: string;
  message: string;
}

export interface ISupplierAdapter {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly supportedTypes: ProductType[];

  getProducts(filter?: ProductFilter): Promise<StandardGroupProduct[]>;
  getProductDetails(supplierProductId: string): Promise<StandardGroupProduct | null>;
  checkAvailability(check: SupplierAvailabilityCheck): Promise<AvailabilityResult>;
  createBooking(request: SupplierBookingRequest): Promise<SupplierBookingResponse>;
  getBookingStatus(supplierBookingId: string): Promise<SupplierBookingStatusResponse>;
  cancelBooking(supplierBookingId: string, reason: string): Promise<CancellationResult>;
}
