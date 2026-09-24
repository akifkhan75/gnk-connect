export type SupplierType = 'AIRDESK' | 'HOTEL_BEDS' | 'UMRAH_DIRECT' | 'CUSTOM_API';

export interface Supplier {
  id: string;
  name: string;
  code: string;
  type: SupplierType;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  apiVersion: string;
  supportedProductTypes: ProductType[];
  syncIntervalMinutes: number;
  lastSyncAt: string;
}

export type ProductType = 'GROUP_TOUR' | 'HOTEL' | 'UMRAH' | 'ZIARAT' | 'FLIGHT';

export interface GroupDeparture {
  id: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string;    // YYYY-MM-DD
  totalSeats: number;
  availableSeats: number;
  supplierNetPricePKR: number;
  status: 'OPEN' | 'FILLING_FAST' | 'SOLD_OUT' | 'CLOSED';
}

export interface StandardGroupProduct {
  id: string;                      // Internal GNK Product ID
  supplierId: string;              // e.g. 'airdesk'
  supplierProductId: string;       // e.g. 'AD-DXB-7D-2026'
  supplierProductCode: string;
  productType: ProductType;
  title: string;
  destination: string;
  country: string;
  durationDays: number;
  durationNights: number;
  heroImage: string;
  galleryImages: string[];
  overview: string;
  inclusions: string[];
  exclusions: string[];
  itinerary: {
    day: number;
    title: string;
    description: string;
    meals?: string[];
  }[];
  departures: GroupDeparture[];
  featured?: boolean;
  airline?: string;
  visaIncluded?: boolean;
  hotelRating?: number;
}

// ---------------- Agent & Agency Schema ---------------- //

export type AgentAccountType = 'AGENCY' | 'INDIVIDUAL';
export type AgentRole = 'AGENCY_OWNER' | 'AGENCY_MANAGER' | 'AGENCY_STAFF' | 'INDIVIDUAL_AGENT' | 'GNK_ADMIN';
export type AdminRole = 'SUPER_ADMIN' | 'OPS_ADMIN' | 'FINANCE_ADMIN' | 'AGENT_MANAGER';
export type AgentApprovalStatus = 'PENDING_VERIFICATION' | 'ADMIN_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AgencyTeamMember {
  id: string;
  agencyId: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'AGENCY_OWNER' | 'AGENCY_MANAGER' | 'AGENCY_STAFF';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: string;
  totalBookingsCount: number;
  avatarUrl?: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminRole;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt: string;
  avatarUrl?: string;
}

export interface AgentUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: AgentRole;
  adminRole?: AdminRole; // For GNK Admin staff
  agencyId?: string;     // If part of an agency
  accountType: AgentAccountType;
  approvalStatus: AgentApprovalStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agency {
  id: string;
  name: string;
  tradeLicenseNumber?: string;
  ntnNumber?: string;
  city: string;
  country: string;
  officeAddress: string;
  phone: string;
  officialEmail: string;
  logoUrl?: string;
  verificationDocuments: {
    title: string;
    fileUrl: string;
    uploadedAt: string;
    status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  }[];
  ownerId: string;
  approvalStatus: AgentApprovalStatus;
  creditLimitPKR?: number;
  walletBalancePKR?: number;
  pricingProfileId?: string;
  createdAt: string;
}

// ---------------- Pricing Rules Engine Schema ---------------- //

export type MarkupType = 'FIXED' | 'PERCENTAGE';
export type RulePriority = 1 | 2 | 3 | 4 | 5; // 1 = Highest (Agent+Product Override), 5 = Lowest (Default)

export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  priority: RulePriority;
  supplierId?: string;       // Optional filter
  productType?: ProductType; // Optional filter
  productId?: string;        // Optional filter (GNK Product ID or supplierProductId)
  agentId?: string;          // Optional filter (Agent User ID)
  agencyId?: string;         // Optional filter (Agency ID)
  markupType: MarkupType;
  markupValue: number;       // e.g. 10000 for FIXED PKR or 5 for 5%
  currency: 'PKR' | 'USD';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceCalculationResult {
  supplierNetPricePKR: number;
  calculatedSellingPricePKR: number;
  markupAmountPKR: number;
  markupTypeApplied: MarkupType;
  markupValueApplied: number;
  appliedRuleId: string;
  appliedRuleName: string;
  priorityApplied: RulePriority;
  breakdown: string;
}

// ---------------- Booking Workflow Schema ---------------- //

export type GNKBookingStatus = 
  | 'PENDING_APPROVAL'       // Agent requested, GNK admin needs to review / verify payment
  | 'APPROVED'               // GNK approved, preparing push to supplier
  | 'SUBMITTED_TO_SUPPLIER'  // Transmitted to AirDesk API
  | 'SUPPLIER_CONFIRMED'     // AirDesk confirmed booking
  | 'SUPPLIER_FAILED'        // AirDesk API error/seat unavailable
  | 'REJECTED'               // GNK admin rejected
  | 'CANCELLED'              // Agent/Admin cancelled
  | 'COMPLETED';             // Travel completed

export type PaymentStatus = 
  | 'UNPAID' 
  | 'PAYMENT_SUBMITTED' 
  | 'PAYMENT_VERIFIED' 
  | 'REFUNDED';

export type PaymentMethod = 
  | 'BANK_TRANSFER' 
  | 'CASH_DEPOSIT' 
  | 'CREDIT_WALLET' 
  | 'PAYMENT_GATEWAY';

export interface Passenger {
  id: string;
  title: 'Mr' | 'Mrs' | 'Ms' | 'Mstr' | 'Inf';
  firstName: string;
  lastName: string;
  passportNumber: string;
  passportExpiry: string;
  dob: string;
  nationality: string;
  gender: 'MALE' | 'FEMALE';
  passengerType: 'ADULT' | 'CHILD' | 'INFANT';
}

export interface B2BBooking {
  id: string;                         // GNK Booking ID: e.g. 'GNK-2026-00481'
  supplierBookingId?: string;          // AirDesk Booking ID: e.g. 'AD-849302'
  supplierId: string;                 // 'airdesk'
  productId: string;                  // Internal GNK Product ID
  supplierProductId: string;          // 'AD-DXB-7D-2026'
  productTitle: string;
  departureId: string;
  departureDate: string;
  returnDate: string;
  
  // Agent Details
  agentId: string;
  agencyId?: string;
  agentName: string;
  agencyName?: string;
  agentEmail: string;
  agentPhone: string;
  
  // Passengers
  passengers: Passenger[];
  totalSeats: number;

  // Financial Breakdown (Immutably captured at booking time)
  currency: 'PKR';
  supplierNetPricePerSeatPKR: number;
  totalSupplierNetPKR: number;
  markupPerSeatPKR: number;
  totalMarkupPKR: number;
  sellingPricePerSeatPKR: number;
  totalAgentSellingPricePKR: number;
  pricingRuleSnapshot: {
    ruleId: string;
    ruleName: string;
    markupType: MarkupType;
    markupValue: number;
  };

  // Status & Lifecycle
  status: GNKBookingStatus;
  statusHistory: {
    status: GNKBookingStatus;
    changedAt: string;
    changedBy: string;
    notes?: string;
  }[];
  
  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentProofUrl?: string;
  paymentReferenceNumber?: string;
  paymentNotes?: string;
  
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  agentId: string;
  amountPKR: number;
  method: PaymentMethod;
  referenceNumber: string;
  bankName?: string;
  proofImageUrl?: string;
  notes?: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface SupplierSyncLog {
  id: string;
  supplierId: string;
  action: 'FETCH_GROUPS' | 'CHECK_AVAILABILITY' | 'CREATE_BOOKING' | 'STATUS_POLL';
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  requestPayload?: any;
  responsePayload?: any;
  durationMs: number;
  timestamp: string;
}

// ---------------- Document & Upload Subsystem ---------------- //

export type UploadCategory = 'DTS_LICENSE' | 'NTN_CERTIFICATE' | 'CNIC_DOCUMENT' | 'PAYMENT_SLIP' | 'AGENCY_LOGO' | 'GENERAL';

export interface UploadedFileMeta {
  id: string;
  originalName: string;
  filename: string;
  category: UploadCategory;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedByAgentId?: string;
  uploadedAt: string;
}

export interface UploadResponseDto {
  success: boolean;
  file: UploadedFileMeta;
  message?: string;
}

// ---------------- Financial Ledger & Statement of Account (SOA) ---------------- //

export type LedgerEntryType = 
  | 'CREDIT_DEPOSIT'              // Agency wired funds / bank deposit credited to wallet
  | 'BOOKING_DEBIT'               // Deducted for group booking allocation
  | 'BOOKING_REFUND'              // Refunded booking / cancellation reversal
  | 'CREDIT_LIMIT_ADJUSTMENT'     // GNK admin adjusted agency credit line
  | 'COMMISSION_PAYOUT';          // Monthly partner bonus/incentive

export interface LedgerTransaction {
  id: string;
  agencyId: string;
  agentId?: string;
  bookingId?: string;             // Optional link to GNK-2026-XXXXX
  type: LedgerEntryType;
  amountPKR: number;              // Positive number
  balanceAfterPKR: number;        // Running wallet balance after transaction
  reference: string;              // e.g. HBL-982410, GNK-2026-00481
  description: string;
  notes?: string;
  createdAt: string;
}

export interface StatementOfAccount {
  statementNumber: string;
  agencyId: string;
  agencyName: string;
  agencyNtn?: string;
  agencyDtsLicense?: string;
  officeAddress?: string;
  periodStart: string;
  periodEnd: string;
  openingBalancePKR: number;
  closingBalancePKR: number;
  totalDebitsPKR: number;
  totalCreditsPKR: number;
  creditLimitPKR: number;
  availableCreditPKR: number;
  transactions: LedgerTransaction[];
  generatedAt: string;
}

export interface AdminFinancialSummary {
  grossBookingsVolumePKR: number;
  totalSupplierCostPKR: number;
  retainedGnkMarginPKR: number;
  totalAgencyWalletDepositsPKR: number;
  totalOutstandingCreditPKR: number;
  activeAgenciesCount: number;
}

// ---------------- Notifications & B2B Travel E-Vouchers ---------------- //

export type NotificationType = 
  | 'AGENT_WELCOME'
  | 'AGENT_APPROVED'
  | 'BOOKING_REQUEST_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'PAYMENT_VERIFIED'
  | 'LEDGER_CREDIT';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
export type NotificationStatus = 'SENT' | 'QUEUED' | 'FAILED';

export interface B2BNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  status: NotificationStatus;
  sentAt: string;
}

export interface B2BVoucherData {
  voucherNumber: string;            // e.g. VCH-GNK-2026-00124
  gnkBookingId: string;             // GNK-2026-00124
  supplierBookingId: string;        // AD-849302
  supplierPnr: string;              // PNR-AD-9302
  tourTitle: string;
  destination: string;
  durationDays: number;
  departureDate: string;
  returnDate: string;
  airline: string;
  hotelDetails: string;
  agencyName: string;
  agentName: string;
  agentPhone: string;
  passengers: Passenger[];
  inclusions: string[];
  meetingPoint: string;
  emergencyCoordinator: string;
  verificationCode: string;
  issuedAt: string;
}


