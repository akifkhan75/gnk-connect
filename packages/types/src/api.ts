// Response shapes returned by the GNK Connect API (apps/api) and consumed by
// the portal and admin apps. Money is PKR as a JS number (stored as Decimal
// server-side); dates are ISO strings.
//
// Partner-realm DTOs must never carry supplier net fares, markup or supplier
// references. Those fields exist only on Admin* DTOs.

import type {
  BookingStatus,
  DepartureStatus,
  Gender,
  KycDocStatus,
  KycDocType,
  MarkupType,
  PartnerAccountStatus,
  PartnerAccountType,
  PartnerRole,
  PaxType,
  PaymentMethod,
  PaymentState,
  PaymentStatus,
  PricingScope,
  ProductType,
  Realm,
  RoundingMode,
  SupplierStatus,
  ThemePreference,
  Title,
  UserStatus,
} from './enums';
import type { Permission } from './permissions';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** RFC 7807 problem details, as returned by every error response. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code?: string;
  errors?: { path: string; message: string }[];
  traceId?: string;
}

// ---------- Auth ----------

export interface PartnerMembership {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountStatus: PartnerAccountStatus;
  accountType: PartnerAccountType;
  role: PartnerRole;
}

export interface PartnerSession {
  realm: 'PARTNER';
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    emailVerified: boolean;
    themePreference: ThemePreference;
  };
  account: PartnerMembership;
  memberships: PartnerMembership[];
}

export interface StaffSession {
  realm: 'STAFF';
  user: { id: string; email: string; fullName: string; themePreference: ThemePreference };
  roles: string[];
  permissions: Permission[];
}

export interface AuthResponse<S> {
  accessToken: string;
  expiresIn: number; // seconds
  session: S;
}

export interface MessageResponse {
  message: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

// ---------- Shared ----------

export interface FlightLegDto {
  flightNo: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
}

export interface ProductContentDto {
  overview: string;
  inclusions: string[];
  exclusions: string[];
  itinerary: { day: number; title: string; description: string }[];
  outbound?: FlightLegDto;
  inbound?: FlightLegDto;
  hotels?: { city: string; name: string; stars: number; nights: number }[];
}

export interface TimelineEvent {
  status: BookingStatus;
  at: string;
  note: string | null;
  actor?: string | null;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface BankAccountDto {
  bank: string;
  title: string;
  accountNo: string;
  iban: string;
  branch?: string;
}

export interface CompanyInfoDto {
  name: string;
  address: string;
  phone: string;
  email: string;
  ntn?: string;
}

// ---------- Partner: account & team ----------

export interface KycDocumentDto {
  id: string;
  type: KycDocType;
  status: KycDocStatus;
  fileId: string;
  fileName: string;
  mimeType: string;
  reviewNote: string | null;
  createdAt: string;
}

export interface PartnerAccountDto {
  id: string;
  code: string;
  type: PartnerAccountType;
  status: PartnerAccountStatus;
  legalName: string;
  tradeName: string | null;
  dtsLicenseNo: string | null;
  iataCode: string | null;
  ntn: string | null;
  cnicMasked: string | null;
  city: string;
  address: string | null;
  phone: string;
  email: string;
  creditLimit: number;
  reviewNote: string | null;
  rejectionReason: string | null;
  suspendedReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  documents: KycDocumentDto[];
  /** Documents this account type must upload before submitting for review. */
  requiredDocuments: KycDocType[];
  ownerEmailVerified: boolean;
}

export interface TeamMemberDto {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: PartnerRole;
  status: UserStatus;
  lastLoginAt: string | null;
  joinedAt: string;
  isYou: boolean;
}

export interface PartnerInviteDto {
  id: string;
  email: string;
  role: PartnerRole;
  expiresAt: string;
  createdAt: string;
}

export interface TeamDto {
  members: TeamMemberDto[];
  invites: PartnerInviteDto[];
}

// ---------- Partner: groups, quotes, bookings ----------

export interface GroupListItem {
  productId: string;
  departureId: string;
  type: ProductType;
  title: string;
  sector: string | null;
  airline: string | null;
  destination: string;
  country: string;
  departureDate: string;
  returnDate: string | null;
  durationDays: number | null;
  baggage: string | null;
  seatsAvailable: number;
  status: DepartureStatus;
  /** Selling price per seat for this partner. Null until the account is approved. */
  price: number | null;
  outbound: FlightLegDto | null;
  inbound: FlightLegDto | null;
}

export interface GroupDepartureDto {
  id: string;
  departureDate: string;
  returnDate: string | null;
  seatsAvailable: number;
  baggage: string | null;
  status: DepartureStatus;
  price: number | null;
}

export interface GroupDetailDto {
  id: string;
  type: ProductType;
  title: string;
  sector: string | null;
  airline: string | null;
  destination: string;
  country: string;
  durationDays: number | null;
  content: ProductContentDto;
  departures: GroupDepartureDto[];
}

export interface GroupFilters {
  sectors: string[];
  airlines: string[];
  types: ProductType[];
}

export interface QuoteDto {
  id: string;
  departureId: string;
  seats: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  expiresAt: string;
  group: {
    productId: string;
    title: string;
    sector: string | null;
    airline: string | null;
    departureDate: string;
    returnDate: string | null;
    baggage: string | null;
  };
}

export interface BookingListItem {
  id: string;
  reference: string;
  status: BookingStatus;
  paymentState: PaymentState;
  title: string;
  sector: string | null;
  airline: string | null;
  departureDate: string;
  seats: number;
  totalPrice: number;
  createdAt: string;
  createdByName: string;
  leadPassenger: string | null;
}

export interface PassengerDto {
  id: string;
  type: PaxType;
  title: Title;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  nationality: string;
  passportMasked: string;
  passportExpiry: string;
}

export interface BookingDetailDto extends BookingListItem {
  productId: string;
  returnDate: string | null;
  baggage: string | null;
  unitPrice: number;
  amountPaid: number;
  pnr: string | null;
  agentNotes: string | null;
  rejectionReason: string | null;
  passengers: PassengerDto[];
  timeline: TimelineEvent[];
  invoice: { id: string; number: string } | null;
  outbound: FlightLegDto | null;
  inbound: FlightLegDto | null;
  canCancel: boolean;
}

export interface BookingStatusCounts {
  all: number;
  PENDING_APPROVAL: number;
  APPROVED: number;
  PROCESSING: number;
  CONFIRMED: number;
  CLOSED: number;
}

// ---------- Partner: money ----------

export interface PaymentDto {
  id: string;
  reference: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  bankName: string | null;
  transactionRef: string | null;
  paidAt: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  proofFileId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

export interface StatementLine {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  creditLimit: number;
  /** closingBalance + creditLimit: what the partner can spend on bookings right now. */
  availableFunds: number;
  lines: StatementLine[];
}

export interface BalanceDto {
  balance: number;
  creditLimit: number;
  availableFunds: number;
}

export interface InvoiceListItem {
  id: string;
  number: string;
  issuedAt: string;
  total: number;
  bookingId: string;
  bookingReference: string;
  voided: boolean;
}

export interface InvoiceDetailDto extends InvoiceListItem {
  company: CompanyInfoDto;
  billTo: {
    name: string;
    code: string;
    address: string | null;
    city: string;
    phone: string;
    email: string;
    ntn: string | null;
  };
  booking: {
    title: string;
    sector: string | null;
    airline: string | null;
    departureDate: string;
    returnDate: string | null;
    pnr: string | null;
    seats: number;
    unitPrice: number;
    passengers: { name: string; type: PaxType }[];
  };
  amountPaid: number;
}

export interface PartnerDashboardDto {
  stats: {
    pendingApproval: number;
    awaitingPayment: number;
    confirmed: number;
    total: number;
    upcomingDepartures: number;
  };
  balance: BalanceDto;
  upcomingGroups: GroupListItem[];
  recentBookings: BookingListItem[];
  actions: { label: string; link: string; tone: 'warning' | 'info' | 'danger' }[];
}

// ---------- Admin ----------

export interface AdminPartnerListItem {
  id: string;
  code: string;
  type: PartnerAccountType;
  status: PartnerAccountStatus;
  legalName: string;
  city: string;
  email: string;
  phone: string;
  ownerName: string | null;
  bookingsCount: number;
  balance: number;
  creditLimit: number;
  createdAt: string;
}

export interface AdminPartnerDetailDto extends PartnerAccountDto {
  members: TeamMemberDto[];
  balance: BalanceDto;
  pricingTier: { id: string; name: string } | null;
  stats: { bookings: number; confirmed: number; gmv: number };
  recentBookings: BookingListItem[];
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface AdminBookingListItem extends BookingListItem {
  accountId: string;
  accountName: string;
  accountCode: string;
  supplierBookingRef: string | null;
  margin: number | null; // null without bookings:view_supplier_net
}

export interface SupplierCallDto {
  id: string;
  operation: string;
  responseCode: number | null;
  errorKind: string | null;
  durationMs: number;
  requestBody: unknown;
  responseBody: unknown;
  createdAt: string;
}

export interface AdminBookingDetailDto extends Omit<BookingDetailDto, 'canCancel'> {
  account: { id: string; code: string; name: string; phone: string; email: string };
  balance: BalanceDto;
  supplierName: string;
  supplierBookingRef: string | null;
  departureId: string;
  /** Present only with bookings:view_supplier_net. */
  priceAudit: {
    supplierNetUnit: number;
    markupUnit: number;
    margin: number;
    snapshot: unknown;
    quotedAt: string;
  } | null;
  internalNotes: string | null;
  payments: PaymentDto[];
  supplierCalls: SupplierCallDto[];
  allowedActions: (
    'approve' | 'reject' | 'push' | 'retry_push' | 'sync_status' | 'cancel' | 'complete'
  )[];
}

export interface AdminPaymentListItem extends PaymentDto {
  accountId: string;
  accountName: string;
  accountCode: string;
  submittedByName: string | null;
  verifiedByName: string | null;
  duplicateOf: string | null;
}

export interface PricingRuleDto {
  id: string;
  name: string;
  scope: PricingScope;
  supplierId: string | null;
  productType: ProductType | null;
  productId: string | null;
  departureId: string | null;
  accountId: string | null;
  pricingTierId: string | null;
  markupType: MarkupType;
  markupValue: number;
  minMarkup: number | null;
  maxMarkup: number | null;
  stackable: boolean;
  priority: number;
  rounding: RoundingMode;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  updatedAt: string;
  targetLabel: string;
  conflictsWith: string[];
}

export interface PricingTierDto {
  id: string;
  name: string;
  description: string | null;
  partnersCount: number;
}

export interface PricingSimulationDto {
  supplierNet: number;
  markup: number;
  unitPrice: number;
  seats: number;
  totalPrice: number;
  applied: { id: string; name: string; scope: PricingScope; amount: number }[];
  evaluated: {
    id: string;
    name: string;
    scope: PricingScope;
    outcome: 'applied' | 'stacked' | 'overridden' | 'not_matching' | 'inactive' | 'expired';
  }[];
}

export interface AdminProductListItem {
  id: string;
  type: ProductType;
  title: string;
  sector: string | null;
  airline: string | null;
  destination: string;
  supplierName: string;
  isPublished: boolean;
  isFeatured: boolean;
  departuresCount: number;
  nextDeparture: string | null;
  seatsAvailable: number;
  syncedAt: string;
}

export interface AdminDepartureDto {
  id: string;
  departureDate: string;
  returnDate: string | null;
  totalSeats: number;
  supplierAvailable: number;
  heldSeats: number;
  status: DepartureStatus;
  baggage: string | null;
  supplierNet: number | null;
  defaultPrice: number | null;
}

export interface AdminProductDetailDto extends AdminProductListItem {
  country: string;
  durationDays: number | null;
  content: ProductContentDto;
  departures: AdminDepartureDto[];
}

export interface SupplierDto {
  id: string;
  code: string;
  name: string;
  adapterKey: string;
  status: SupplierStatus;
  mode: 'mock' | 'live';
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  productsCount: number;
  calls24h: number;
  failures24h: number;
}

export interface SyncResultDto {
  products: number;
  departures: number;
  durationMs: number;
}

export interface StaffUserDto {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
  isYou: boolean;
}

export interface RoleDto {
  key: string;
  name: string;
  permissions: Permission[];
  usersCount: number;
}

export interface AuditLogDto {
  id: string;
  actorRealm: Realm | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
}

export interface SettingsDto {
  company: CompanyInfoDto;
  bankAccounts: BankAccountDto[];
  booking: { quoteTtlMinutes: number; paymentTermsNote: string };
}

export interface AdminDashboardDto {
  kpis: {
    bookings30d: number;
    confirmed30d: number;
    gmv30d: number;
    margin30d: number | null;
    activePartners: number;
    pendingPartners: number;
    pendingBookings: number;
    pendingPayments: number;
  };
  daily: { date: string; bookings: number; gmv: number }[];
  funnel: { requested: number; approved: number; confirmed: number; rejected: number };
  topPartners: { id: string; name: string; code: string; bookings: number; gmv: number }[];
  upcomingDepartures: {
    departureId: string;
    title: string;
    departureDate: string;
    bookings: number;
    seats: number;
  }[];
  supplier: {
    name: string;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    failures24h: number;
  } | null;
}

export interface AdminQueueCounts {
  partners: number;
  bookings: number;
  payments: number;
}

// ---------- Public website ----------

/** What the public website may see: no prices, no supplier data. */
export type PublicGroupDto = Omit<GroupListItem, 'price' | 'outbound' | 'inbound' | 'country'>;
