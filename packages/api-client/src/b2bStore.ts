import { 
  Agency, 
  AgentUser, 
  B2BBooking, 
  PaymentTransaction, 
  Passenger,
  LedgerTransaction,
  StatementOfAccount,
  AdminFinancialSummary,
  LedgerEntryType,
  B2BNotification,
  B2BVoucherData,
  NotificationType,
  NotificationChannel,
  AgencyTeamMember,
  AdminRole,
  AdminUser
} from '@gnk/types';
import { airDeskAdapter } from '@gnk/suppliers';
import { pricingEngine } from './pricingEngine';

// Seed Initial Agencies
const SEED_AGENCIES: Agency[] = [
  {
    id: 'agency-abc-travels',
    name: 'ABC Travels & Tours',
    tradeLicenseNumber: 'DTS-KHI-4920',
    ntnNumber: '7392810-4',
    city: 'Karachi',
    country: 'Pakistan',
    officeAddress: 'Suite 402, Business Avenue, Shahrah-e-Faisal, Karachi',
    phone: '+92 21 34567890',
    officialEmail: 'info@abctravels.com.pk',
    logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=200&auto=format&fit=crop',
    ownerId: 'user-abc-owner',
    approvalStatus: 'APPROVED',
    creditLimitPKR: 1500000,
    walletBalancePKR: 450000,
    createdAt: '2026-08-15T09:00:00Z',
    verificationDocuments: [
      { title: 'DTS Tourism License', fileUrl: 'https://example.com/docs/dts-license.pdf', uploadedAt: '2026-08-15T09:10:00Z', status: 'VERIFIED' },
      { title: 'FBR NTN Certificate', fileUrl: 'https://example.com/docs/ntn-cert.pdf', uploadedAt: '2026-08-15T09:10:00Z', status: 'VERIFIED' }
    ]
  },
  {
    id: 'agency-al-haram',
    name: 'Al-Haram Hajj & Umrah Services',
    tradeLicenseNumber: 'DTS-LHR-8812',
    ntnNumber: '5819203-1',
    city: 'Lahore',
    country: 'Pakistan',
    officeAddress: 'Plaza 14, Main Boulevard, Gulberg III, Lahore',
    phone: '+92 42 35789012',
    officialEmail: 'contact@alharamhajj.com',
    ownerId: 'user-alharam-owner',
    approvalStatus: 'APPROVED',
    creditLimitPKR: 2000000,
    walletBalancePKR: 850000,
    createdAt: '2026-08-20T11:00:00Z',
    verificationDocuments: [
      { title: 'IATA Certificate', fileUrl: 'https://example.com/docs/iata.pdf', uploadedAt: '2026-08-20T11:15:00Z', status: 'VERIFIED' }
    ]
  }
];

// Seed Users with full RBAC roles
const SEED_USERS: AgentUser[] = [
  // Agency Owner
  {
    id: 'user-abc-owner',
    email: 'agent@abctravels.com',
    fullName: 'Tariq Mansoor',
    phone: '+92 300 1234567',
    role: 'AGENCY_OWNER',
    agencyId: 'agency-abc-travels',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-15T09:00:00Z'
  },
  // Agency Manager
  {
    id: 'user-abc-manager',
    email: 'farhan@abctravels.com',
    fullName: 'Farhan Zaidi',
    phone: '+92 300 7654321',
    role: 'AGENCY_MANAGER',
    agencyId: 'agency-abc-travels',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-08-20T09:00:00Z'
  },
  // Agency Staff (Ticketing Agent)
  {
    id: 'user-abc-staff',
    email: 'sara@abctravels.com',
    fullName: 'Sara Khan',
    phone: '+92 321 4455667',
    role: 'AGENCY_STAFF',
    agencyId: 'agency-abc-travels',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z'
  },
  // Second Agency Owner
  {
    id: 'user-alharam-owner',
    email: 'tours@alharam.com',
    fullName: 'Sheikh Bilal Ahmed',
    phone: '+92 321 9876543',
    role: 'AGENCY_OWNER',
    agencyId: 'agency-al-haram',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-08-20T11:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z'
  },
  // Pending Individual Agent
  {
    id: 'user-muhammad-ali',
    email: 'muhammad.ali.travels@gmail.com',
    fullName: 'Muhammad Ali',
    phone: '+92 333 5551234',
    role: 'INDIVIDUAL_AGENT',
    accountType: 'INDIVIDUAL',
    approvalStatus: 'PENDING_VERIFICATION',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-09-22T14:30:00Z',
    updatedAt: '2026-09-22T14:30:00Z'
  },
  // Approved Solo Freelance Agent
  {
    id: 'user-solo-consultant',
    email: 'zubair.travels@gmail.com',
    fullName: 'Zubair Qureshi',
    phone: '+92 345 8899001',
    role: 'INDIVIDUAL_AGENT',
    accountType: 'INDIVIDUAL',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  // GNK Admin - Super Admin
  {
    id: 'user-gnk-admin',
    email: 'admin@gnkconnect.pk',
    fullName: 'GNK Super Admin',
    phone: '+92 300 0000001',
    role: 'GNK_ADMIN',
    adminRole: 'SUPER_ADMIN',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  // GNK Admin - Operations
  {
    id: 'user-gnk-ops-admin',
    email: 'ops@gnkconnect.pk',
    fullName: 'Zainab Bukhari (Ops Admin)',
    phone: '+92 300 0000002',
    role: 'GNK_ADMIN',
    adminRole: 'OPS_ADMIN',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  // GNK Admin - Finance
  {
    id: 'user-gnk-finance-admin',
    email: 'finance@gnkconnect.pk',
    fullName: 'Mustafa Kamal (Finance Admin)',
    phone: '+92 300 0000003',
    role: 'GNK_ADMIN',
    adminRole: 'FINANCE_ADMIN',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  // GNK Admin - Agent Relationship Manager
  {
    id: 'user-gnk-agent-mgr',
    email: 'relations@gnkconnect.pk',
    fullName: 'Ayesha Malik (Agent Manager)',
    phone: '+92 300 0000004',
    role: 'GNK_ADMIN',
    adminRole: 'AGENT_MANAGER',
    accountType: 'AGENCY',
    approvalStatus: 'APPROVED',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];

// Seed Agency Team Members
const SEED_TEAM_MEMBERS: AgencyTeamMember[] = [
  {
    id: 'tm-1',
    agencyId: 'agency-abc-travels',
    fullName: 'Tariq Mansoor',
    email: 'agent@abctravels.com',
    phone: '+92 300 1234567',
    role: 'AGENCY_OWNER',
    status: 'ACTIVE',
    joinedAt: '2026-08-15T09:00:00Z',
    totalBookingsCount: 14,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'tm-2',
    agencyId: 'agency-abc-travels',
    fullName: 'Farhan Zaidi',
    email: 'farhan@abctravels.com',
    phone: '+92 300 7654321',
    role: 'AGENCY_MANAGER',
    status: 'ACTIVE',
    joinedAt: '2026-08-20T09:00:00Z',
    totalBookingsCount: 8,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'tm-3',
    agencyId: 'agency-abc-travels',
    fullName: 'Sara Khan',
    email: 'sara@abctravels.com',
    phone: '+92 321 4455667',
    role: 'AGENCY_STAFF',
    status: 'ACTIVE',
    joinedAt: '2026-08-25T10:00:00Z',
    totalBookingsCount: 5,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'tm-4',
    agencyId: 'agency-abc-travels',
    fullName: 'Bilal Hassan',
    email: 'bilal.hassan@abctravels.com',
    phone: '+92 333 1122334',
    role: 'AGENCY_STAFF',
    status: 'INVITED',
    joinedAt: '2026-09-20T11:00:00Z',
    totalBookingsCount: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop'
  }
];

// Seed Admin Users
const SEED_ADMIN_USERS: AdminUser[] = [
  {
    id: 'user-gnk-admin',
    fullName: 'GNK Super Admin',
    email: 'admin@gnkconnect.pk',
    phone: '+92 300 0000001',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-24T22:30:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'user-gnk-ops-admin',
    fullName: 'Zainab Bukhari',
    email: 'ops@gnkconnect.pk',
    phone: '+92 300 0000002',
    role: 'OPS_ADMIN',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-24T21:15:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'user-gnk-finance-admin',
    fullName: 'Mustafa Kamal',
    email: 'finance@gnkconnect.pk',
    phone: '+92 300 0000003',
    role: 'FINANCE_ADMIN',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-24T20:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'user-gnk-agent-mgr',
    fullName: 'Ayesha Malik',
    email: 'relations@gnkconnect.pk',
    phone: '+92 300 0000004',
    role: 'AGENT_MANAGER',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-24T18:45:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
  }
];

// Seed Bookings
const SEED_BOOKINGS: B2BBooking[] = [
  {
    id: 'GNK-2026-00124',
    supplierBookingId: 'AD-849302',
    supplierId: 'airdesk',
    productId: 'gnk-prod-dxb-01',
    supplierProductId: 'AD-DXB-7D-EXP',
    productTitle: 'Dubai Luxury 7-Day Group Departure',
    departureId: 'dep-dxb-oct-15',
    departureDate: '2026-10-15',
    returnDate: '2026-10-22',
    agentId: 'user-abc-owner',
    agencyId: 'agency-abc-travels',
    agentName: 'Tariq Mansoor',
    agencyName: 'ABC Travels & Tours',
    agentEmail: 'agent@abctravels.com',
    agentPhone: '+92 300 1234567',
    totalSeats: 2,
    passengers: [
      {
        id: 'p-1',
        title: 'Mr',
        firstName: 'Kamran',
        lastName: 'Akhtar',
        passportNumber: 'PK8392018',
        passportExpiry: '2030-05-12',
        dob: '1985-04-18',
        nationality: 'Pakistani',
        gender: 'MALE',
        passengerType: 'ADULT'
      },
      {
        id: 'p-2',
        title: 'Mrs',
        firstName: 'Samina',
        lastName: 'Kamran',
        passportNumber: 'PK8392019',
        passportExpiry: '2030-05-12',
        dob: '1988-11-24',
        nationality: 'Pakistani',
        gender: 'FEMALE',
        passengerType: 'ADULT'
      }
    ],
    currency: 'PKR',
    supplierNetPricePerSeatPKR: 185000,
    totalSupplierNetPKR: 370000,
    markupPerSeatPKR: 12000,
    totalMarkupPKR: 24000,
    sellingPricePerSeatPKR: 197000,
    totalAgentSellingPricePKR: 394000,
    pricingRuleSnapshot: {
      ruleId: 'rule-agent-prod-01',
      ruleName: 'ABC Travels Dubai Group VIP Override',
      markupType: 'FIXED',
      markupValue: 12000
    },
    status: 'SUPPLIER_CONFIRMED',
    statusHistory: [
      { status: 'PENDING_APPROVAL', changedAt: '2026-09-18T10:00:00Z', changedBy: 'Tariq Mansoor (Agent)', notes: 'Booking requested by agent' },
      { status: 'APPROVED', changedAt: '2026-09-18T11:30:00Z', changedBy: 'Admin (GNK)', notes: 'Bank transfer payment verified' },
      { status: 'SUBMITTED_TO_SUPPLIER', changedAt: '2026-09-18T11:31:00Z', changedBy: 'System Automation', notes: 'Pushed to AirDesk API' },
      { status: 'SUPPLIER_CONFIRMED', changedAt: '2026-09-18T11:31:05Z', changedBy: 'AirDesk API', notes: 'Confirmed with reference AD-849302' }
    ],
    paymentStatus: 'PAYMENT_VERIFIED',
    paymentMethod: 'BANK_TRANSFER',
    paymentReferenceNumber: 'HBL-FT-948201938',
    paymentProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-18T11:31:05Z'
  },
  {
    id: 'GNK-2026-00125',
    supplierId: 'airdesk',
    productId: 'gnk-prod-ksa-02',
    supplierProductId: 'AD-KSA-15D-UMRAH',
    productTitle: 'Saudi Executive Umrah 15-Day Group',
    departureId: 'dep-ksa-oct-20',
    departureDate: '2026-10-20',
    returnDate: '2026-11-04',
    agentId: 'user-abc-owner',
    agencyId: 'agency-abc-travels',
    agentName: 'Tariq Mansoor',
    agencyName: 'ABC Travels & Tours',
    agentEmail: 'agent@abctravels.com',
    agentPhone: '+92 300 1234567',
    totalSeats: 3,
    passengers: [
      {
        id: 'p-3',
        title: 'Mr',
        firstName: 'Zubair',
        lastName: 'Hassan',
        passportNumber: 'PK9918231',
        passportExpiry: '2029-08-10',
        dob: '1975-02-14',
        nationality: 'Pakistani',
        gender: 'MALE',
        passengerType: 'ADULT'
      },
      {
        id: 'p-4',
        title: 'Mrs',
        firstName: 'Fatima',
        lastName: 'Zubair',
        passportNumber: 'PK9918232',
        passportExpiry: '2029-08-10',
        dob: '1980-06-20',
        nationality: 'Pakistani',
        gender: 'FEMALE',
        passengerType: 'ADULT'
      },
      {
        id: 'p-5',
        title: 'Mstr',
        firstName: 'Ali',
        lastName: 'Zubair',
        passportNumber: 'PK9918233',
        passportExpiry: '2029-08-10',
        dob: '2012-09-05',
        nationality: 'Pakistani',
        gender: 'MALE',
        passengerType: 'CHILD'
      }
    ],
    currency: 'PKR',
    supplierNetPricePerSeatPKR: 225000,
    totalSupplierNetPKR: 675000,
    markupPerSeatPKR: 11250, // 5% rule for ABC Travels
    totalMarkupPKR: 33750,
    sellingPricePerSeatPKR: 236250,
    totalAgentSellingPricePKR: 708750,
    pricingRuleSnapshot: {
      ruleId: 'rule-agent-02',
      ruleName: 'ABC Travels Preferred Partner Margin (5%)',
      markupType: 'PERCENTAGE',
      markupValue: 5
    },
    status: 'PENDING_APPROVAL',
    statusHistory: [
      { status: 'PENDING_APPROVAL', changedAt: '2026-09-23T16:00:00Z', changedBy: 'Tariq Mansoor (Agent)', notes: 'Booking requested, bank transfer receipt submitted' }
    ],
    paymentStatus: 'PAYMENT_SUBMITTED',
    paymentMethod: 'BANK_TRANSFER',
    paymentReferenceNumber: 'MEZN-TR-7821903',
    paymentProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop',
    createdAt: '2026-09-23T16:00:00Z',
    updatedAt: '2026-09-23T16:00:00Z'
  }
];

// Seed Ledger Transactions
const SEED_LEDGER_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'TXN-2026-00101',
    agencyId: 'agency-abc-travels',
    agentId: 'user-abc-owner',
    type: 'CREDIT_DEPOSIT',
    amountPKR: 1500000,
    balanceAfterPKR: 1500000,
    reference: 'HBL-DEP-849201',
    description: 'Advance wholesale deposit for group block allocations',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'TXN-2026-00102',
    agencyId: 'agency-abc-travels',
    agentId: 'user-abc-owner',
    bookingId: 'GNK-2026-00124',
    type: 'BOOKING_DEBIT',
    amountPKR: 850000,
    balanceAfterPKR: 650000,
    reference: 'GNK-2026-00124',
    description: 'Payment debit for Dubai Luxury 7-Day Group (2 Pax)',
    createdAt: '2026-08-10T14:30:00.000Z',
  },
  {
    id: 'TXN-2026-00103',
    agencyId: 'agency-abc-travels',
    agentId: 'user-abc-owner',
    type: 'COMMISSION_PAYOUT',
    amountPKR: 50000,
    balanceAfterPKR: 700000,
    reference: 'BONUS-2026-Q3',
    description: 'Q3 Wholesale Reseller Early-Bird Bonus',
    createdAt: '2026-08-31T18:00:00.000Z',
  },
  {
    id: 'TXN-2026-00104',
    agencyId: 'agency-abc-travels',
    agentId: 'user-abc-owner',
    type: 'CREDIT_DEPOSIT',
    amountPKR: 250000,
    balanceAfterPKR: 950000,
    reference: 'MCB-WIRE-491028',
    description: 'Bank wire transfer deposit',
    createdAt: '2026-09-15T09:40:00.000Z',
  },
];

// Seed Notifications
const SEED_NOTIFICATIONS: B2BNotification[] = [
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
  {
    id: 'NOTIF-2026-003',
    recipientEmail: 'agent@abctravels.com',
    recipientName: 'Tariq Mansoor',
    type: 'LEDGER_CREDIT',
    channel: 'EMAIL',
    title: 'Wallet Float Credited: PKR 1,500,000',
    body: 'Your agency account has been credited with PKR 1,500,000 via advance deposit. Available float has been updated.',
    metadata: { agencyId: 'agency-abc-travels', amountPKR: 1500000 },
    status: 'SENT',
    sentAt: '2026-08-01T10:00:00.000Z',
  },
];

class B2BStore {
  private agencies: Agency[] = [];
  private users: AgentUser[] = [];
  private teamMembers: AgencyTeamMember[] = [];
  private adminUsers: AdminUser[] = [];
  private bookings: B2BBooking[] = [];
  private payments: PaymentTransaction[] = [];
  private ledgerTransactions: LedgerTransaction[] = [];
  private notifications: B2BNotification[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof localStorage !== 'undefined') {
      try {
        const storedAgencies = localStorage.getItem('gnk_b2b_agencies');
        this.agencies = storedAgencies ? JSON.parse(storedAgencies) : [...SEED_AGENCIES];

        const storedUsers = localStorage.getItem('gnk_b2b_users');
        this.users = storedUsers ? JSON.parse(storedUsers) : [...SEED_USERS];

        const storedTeamMembers = localStorage.getItem('gnk_b2b_team_members');
        this.teamMembers = storedTeamMembers ? JSON.parse(storedTeamMembers) : [...SEED_TEAM_MEMBERS];

        const storedAdminUsers = localStorage.getItem('gnk_b2b_admin_users');
        this.adminUsers = storedAdminUsers ? JSON.parse(storedAdminUsers) : [...SEED_ADMIN_USERS];

        const storedBookings = localStorage.getItem('gnk_b2b_bookings');
        this.bookings = storedBookings ? JSON.parse(storedBookings) : [...SEED_BOOKINGS];

        const storedPayments = localStorage.getItem('gnk_b2b_payments');
        this.payments = storedPayments ? JSON.parse(storedPayments) : [];

        const storedLedger = localStorage.getItem('gnk_b2b_ledger');
        this.ledgerTransactions = storedLedger ? JSON.parse(storedLedger) : [...SEED_LEDGER_TRANSACTIONS];

        const storedNotifs = localStorage.getItem('gnk_b2b_notifications');
        this.notifications = storedNotifs ? JSON.parse(storedNotifs) : [...SEED_NOTIFICATIONS];
      } catch (e) {
        console.warn('Error loading B2B store state', e);
        this.agencies = [...SEED_AGENCIES];
        this.users = [...SEED_USERS];
        this.teamMembers = [...SEED_TEAM_MEMBERS];
        this.adminUsers = [...SEED_ADMIN_USERS];
        this.bookings = [...SEED_BOOKINGS];
        this.payments = [];
        this.ledgerTransactions = [...SEED_LEDGER_TRANSACTIONS];
        this.notifications = [...SEED_NOTIFICATIONS];
      }
    } else {
      this.agencies = [...SEED_AGENCIES];
      this.users = [...SEED_USERS];
      this.teamMembers = [...SEED_TEAM_MEMBERS];
      this.adminUsers = [...SEED_ADMIN_USERS];
      this.bookings = [...SEED_BOOKINGS];
      this.payments = [];
      this.ledgerTransactions = [...SEED_LEDGER_TRANSACTIONS];
      this.notifications = [...SEED_NOTIFICATIONS];
    }
  }

  private saveState() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('gnk_b2b_agencies', JSON.stringify(this.agencies));
        localStorage.setItem('gnk_b2b_users', JSON.stringify(this.users));
        localStorage.setItem('gnk_b2b_team_members', JSON.stringify(this.teamMembers));
        localStorage.setItem('gnk_b2b_admin_users', JSON.stringify(this.adminUsers));
        localStorage.setItem('gnk_b2b_bookings', JSON.stringify(this.bookings));
        localStorage.setItem('gnk_b2b_payments', JSON.stringify(this.payments));
        localStorage.setItem('gnk_b2b_ledger', JSON.stringify(this.ledgerTransactions));
        localStorage.setItem('gnk_b2b_notifications', JSON.stringify(this.notifications));
      } catch (e) {
        console.warn('Error saving B2B store state', e);
      }
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // --- Users & Agencies ---
  public getUsers(): AgentUser[] {
    return [...this.users];
  }

  public getUserById(id: string): AgentUser | undefined {
    return this.users.find(u => u.id === id);
  }

  public getAgencies(): Agency[] {
    return [...this.agencies];
  }

  public getAgencyById(id: string): Agency | undefined {
    return this.agencies.find(a => a.id === id);
  }

  // --- Team Management (RBAC) ---
  public getTeamMembers(agencyId: string): AgencyTeamMember[] {
    return this.teamMembers.filter(tm => tm.agencyId === agencyId);
  }

  public inviteTeamMember(agencyId: string, member: { fullName: string; email: string; phone: string; role: 'AGENCY_OWNER' | 'AGENCY_MANAGER' | 'AGENCY_STAFF' }): AgencyTeamMember {
    const id = `tm-${Date.now()}`;
    const newMember: AgencyTeamMember = {
      id,
      agencyId,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      status: 'INVITED',
      joinedAt: new Date().toISOString(),
      totalBookingsCount: 0,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.fullName)}`
    };
    this.teamMembers.push(newMember);

    // Also register as AgentUser so they can log in
    const userId = `user-${Date.now()}`;
    const newUser: AgentUser = {
      id: userId,
      email: member.email,
      fullName: member.fullName,
      phone: member.phone,
      role: member.role,
      agencyId,
      accountType: 'AGENCY',
      approvalStatus: 'APPROVED',
      avatarUrl: newMember.avatarUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.push(newUser);

    this.saveState();
    return newMember;
  }

  public updateTeamMemberRole(memberId: string, role: 'AGENCY_OWNER' | 'AGENCY_MANAGER' | 'AGENCY_STAFF'): AgencyTeamMember | undefined {
    const member = this.teamMembers.find(m => m.id === memberId);
    if (member) {
      member.role = role;
      const user = this.users.find(u => u.email.toLowerCase() === member.email.toLowerCase());
      if (user) {
        user.role = role;
      }
      this.saveState();
    }
    return member;
  }

  public toggleTeamMemberStatus(memberId: string): AgencyTeamMember | undefined {
    const member = this.teamMembers.find(m => m.id === memberId);
    if (member) {
      member.status = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      this.saveState();
    }
    return member;
  }

  public removeTeamMember(memberId: string): boolean {
    const idx = this.teamMembers.findIndex(m => m.id === memberId);
    if (idx !== -1) {
      this.teamMembers.splice(idx, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  // --- Admin Staff Management (RBAC) ---
  public getAdminUsers(): AdminUser[] {
    return [...this.adminUsers];
  }

  public inviteAdminUser(data: { fullName: string; email: string; phone: string; role: AdminRole }): AdminUser {
    const id = `user-gnk-${Date.now()}`;
    const newAdmin: AdminUser = {
      id,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      status: 'ACTIVE',
      lastLoginAt: 'Never',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`
    };
    this.adminUsers.push(newAdmin);

    const newAgentUser: AgentUser = {
      id,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      role: 'GNK_ADMIN',
      adminRole: data.role,
      accountType: 'AGENCY',
      approvalStatus: 'APPROVED',
      avatarUrl: newAdmin.avatarUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.push(newAgentUser);

    this.saveState();
    return newAdmin;
  }

  public updateAdminUserRole(adminId: string, role: AdminRole): AdminUser | undefined {
    const admin = this.adminUsers.find(a => a.id === adminId);
    if (admin) {
      admin.role = role;
      const user = this.users.find(u => u.id === adminId || u.email.toLowerCase() === admin.email.toLowerCase());
      if (user) {
        user.adminRole = role;
      }
      this.saveState();
    }
    return admin;
  }

  public toggleAdminUserStatus(adminId: string): AdminUser | undefined {
    const admin = this.adminUsers.find(a => a.id === adminId);
    if (admin) {
      admin.status = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      this.saveState();
    }
    return admin;
  }

  public registerAgent(data: {
    fullName: string;
    email: string;
    phone: string;
    accountType: 'AGENCY' | 'INDIVIDUAL';
    agencyName?: string;
    city?: string;
    officeAddress?: string;
    ntnNumber?: string;
    tradeLicenseNumber?: string;
  }): AgentUser {
    const userId = `user-${Date.now()}`;
    let agencyId: string | undefined;

    if (data.accountType === 'AGENCY' && data.agencyName) {
      agencyId = `agency-${Date.now()}`;
      const newAgency: Agency = {
        id: agencyId,
        name: data.agencyName,
        tradeLicenseNumber: data.tradeLicenseNumber,
        ntnNumber: data.ntnNumber,
        city: data.city || 'Karachi',
        country: 'Pakistan',
        officeAddress: data.officeAddress || '',
        phone: data.phone,
        officialEmail: data.email,
        ownerId: userId,
        approvalStatus: 'PENDING_VERIFICATION',
        verificationDocuments: [
          { title: 'Tax NTN / Registration', fileUrl: 'https://example.com/docs/pending-upload.pdf', uploadedAt: new Date().toISOString(), status: 'SUBMITTED' }
        ],
        createdAt: new Date().toISOString()
      };
      this.agencies.push(newAgency);

      // Add to team members
      const newMember: AgencyTeamMember = {
        id: `tm-${Date.now()}`,
        agencyId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: 'AGENCY_OWNER',
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
        totalBookingsCount: 0,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`
      };
      this.teamMembers.push(newMember);
    }

    const newUser: AgentUser = {
      id: userId,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      role: data.accountType === 'AGENCY' ? 'AGENCY_OWNER' : 'INDIVIDUAL_AGENT',
      agencyId,
      accountType: data.accountType,
      approvalStatus: 'PENDING_VERIFICATION',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveState();
    return newUser;
  }

  public updateAgentStatus(userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ADMIN_REVIEW'): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.approvalStatus = status;
      user.updatedAt = new Date().toISOString();

      if (user.agencyId) {
        const agency = this.agencies.find(a => a.id === user.agencyId);
        if (agency) {
          agency.approvalStatus = status;
        }
      }
      this.saveState();
    }
  }

  // --- Bookings (RBAC Scoped) ---
  public getBookings(agentId?: string): B2BBooking[] {
    if (agentId) {
      const user = this.getUserById(agentId);
      if (user?.role === 'GNK_ADMIN') {
        return [...this.bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // If agency staff, only show their own bookings!
      if (user?.role === 'AGENCY_STAFF') {
        return this.bookings
          .filter(b => b.agentId === agentId || b.agentEmail.toLowerCase() === user.email.toLowerCase())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // If agency owner / manager, show all agency bookings
      if (user?.agencyId) {
        return this.bookings
          .filter(b => b.agencyId === user.agencyId || b.agentId === agentId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return this.bookings
        .filter(b => b.agentId === agentId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getBookingById(bookingId: string): B2BBooking | undefined {
    return this.bookings.find(b => b.id === bookingId);
  }

  public async createBookingRequest(params: {
    agent: AgentUser;
    product: any;
    departureId: string;
    passengers: Passenger[];
    paymentMethod: 'BANK_TRANSFER' | 'CASH_DEPOSIT' | 'CREDIT_WALLET';
    paymentReferenceNumber?: string;
    paymentProofUrl?: string;
    specialRequests?: string;
  }): Promise<B2BBooking> {
    const departure = params.product.departures.find((d: any) => d.id === params.departureId);
    if (!departure) {
      throw new Error('Selected departure not found');
    }

    if (departure.availableSeats < params.passengers.length) {
      throw new Error(`Only ${departure.availableSeats} seats available, requested ${params.passengers.length}.`);
    }

    // Calculate Selling Price using Pricing Engine
    const priceResult = pricingEngine.calculatePrice({
      supplierNetPricePKR: departure.supplierNetPricePKR,
      supplierId: params.product.supplierId,
      product: { id: params.product.id, supplierProductId: params.product.supplierProductId, productType: params.product.productType },
      agent: { id: params.agent.id, agencyId: params.agent.agencyId }
    });

    const count = params.passengers.length;
    const totalNet = priceResult.supplierNetPricePKR * count;
    const totalSelling = priceResult.calculatedSellingPricePKR * count;
    const totalMarkup = priceResult.markupAmountPKR * count;

    // Generate GNK Standard Booking ID
    const randomBookingNumber = Math.floor(10000 + Math.random() * 90000);
    const gnkBookingId = `GNK-2026-${randomBookingNumber}`;

    const agency = params.agent.agencyId ? this.getAgencyById(params.agent.agencyId) : undefined;

    const newBooking: B2BBooking = {
      id: gnkBookingId,
      supplierId: params.product.supplierId,
      productId: params.product.id,
      supplierProductId: params.product.supplierProductId,
      productTitle: params.product.title,
      departureId: departure.id,
      departureDate: departure.departureDate,
      returnDate: departure.returnDate,
      agentId: params.agent.id,
      agencyId: params.agent.agencyId,
      agentName: params.agent.fullName,
      agencyName: agency?.name || 'Independent Agent',
      agentEmail: params.agent.email,
      agentPhone: params.agent.phone,
      passengers: params.passengers,
      totalSeats: count,
      currency: 'PKR',
      supplierNetPricePerSeatPKR: priceResult.supplierNetPricePKR,
      totalSupplierNetPKR: totalNet,
      markupPerSeatPKR: priceResult.markupAmountPKR,
      totalMarkupPKR: totalMarkup,
      sellingPricePerSeatPKR: priceResult.calculatedSellingPricePKR,
      totalAgentSellingPricePKR: totalSelling,
      pricingRuleSnapshot: {
        ruleId: priceResult.appliedRuleId,
        ruleName: priceResult.appliedRuleName,
        markupType: priceResult.markupTypeApplied,
        markupValue: priceResult.markupValueApplied
      },
      status: 'PENDING_APPROVAL',
      statusHistory: [
        {
          status: 'PENDING_APPROVAL',
          changedAt: new Date().toISOString(),
          changedBy: `${params.agent.fullName} (Agent)`,
          notes: 'Booking request created by partner agent'
        }
      ],
      paymentStatus: params.paymentProofUrl || params.paymentReferenceNumber ? 'PAYMENT_SUBMITTED' : 'UNPAID',
      paymentMethod: params.paymentMethod,
      paymentProofUrl: params.paymentProofUrl,
      paymentReferenceNumber: params.paymentReferenceNumber,
      specialRequests: params.specialRequests,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.bookings.unshift(newBooking);

    if (params.paymentProofUrl || params.paymentReferenceNumber) {
      this.payments.unshift({
        id: `pay-${Date.now()}`,
        bookingId: gnkBookingId,
        agentId: params.agent.id,
        amountPKR: totalSelling,
        method: params.paymentMethod,
        referenceNumber: params.paymentReferenceNumber || 'SUBMITTED',
        proofImageUrl: params.paymentProofUrl,
        status: 'PENDING_VERIFICATION',
        submittedAt: new Date().toISOString()
      });
    }

    this.saveState();
    return newBooking;
  }

  public submitPaymentProof(bookingId: string, params: {
    referenceNumber: string;
    proofUrl?: string;
    bankName?: string;
    notes?: string;
  }): void {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    booking.paymentStatus = 'PAYMENT_SUBMITTED';
    booking.paymentReferenceNumber = params.referenceNumber;
    if (params.proofUrl) booking.paymentProofUrl = params.proofUrl;
    booking.paymentNotes = params.notes;
    booking.updatedAt = new Date().toISOString();

    booking.statusHistory.push({
      status: booking.status,
      changedAt: new Date().toISOString(),
      changedBy: `${booking.agentName} (Agent)`,
      notes: `Submitted payment slip reference: ${params.referenceNumber}`
    });

    this.payments.unshift({
      id: `pay-${Date.now()}`,
      bookingId: booking.id,
      agentId: booking.agentId,
      amountPKR: booking.totalAgentSellingPricePKR,
      method: booking.paymentMethod,
      referenceNumber: params.referenceNumber,
      bankName: params.bankName,
      proofImageUrl: params.proofUrl,
      notes: params.notes,
      status: 'PENDING_VERIFICATION',
      submittedAt: new Date().toISOString()
    });

    this.saveState();
  }

  /**
   * Admin Action: Approve booking & Push to AirDesk API
   */
  public async approveAndPushToSupplier(bookingId: string, adminName: string = 'GNK Admin'): Promise<{
    success: boolean;
    supplierBookingId?: string;
    message: string;
  }> {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) {
      return { success: false, message: 'Booking not found' };
    }

    // Step 1: Mark Payment Verified and Status Approved
    booking.paymentStatus = 'PAYMENT_VERIFIED';
    booking.status = 'APPROVED';
    booking.updatedAt = new Date().toISOString();
    booking.statusHistory.push({
      status: 'APPROVED',
      changedAt: new Date().toISOString(),
      changedBy: adminName,
      notes: 'Payment verified and booking approved by GNK Operations'
    });

    // Step 2: Mark Submitted to Supplier
    booking.status = 'SUBMITTED_TO_SUPPLIER';
    booking.statusHistory.push({
      status: 'SUBMITTED_TO_SUPPLIER',
      changedAt: new Date().toISOString(),
      changedBy: 'System Automation',
      notes: `Calling AirDesk Groups API for product ${booking.supplierProductId}`
    });
    this.saveState();

    // Step 3: Invoke AirDesk Supplier Adapter
    try {
      const supplierResponse = await airDeskAdapter.createBooking({
        supplierProductId: booking.supplierProductId,
        departureId: booking.departureId,
        seats: booking.totalSeats,
        passengers: booking.passengers,
        externalGnkBookingId: booking.id,
        contactPerson: {
          fullName: booking.agentName,
          email: booking.agentEmail,
          phone: booking.agentPhone
        },
        specialRemarks: booking.specialRequests
      });

      if (supplierResponse.success) {
        booking.supplierBookingId = supplierResponse.supplierBookingId;
        booking.status = 'SUPPLIER_CONFIRMED';
        booking.updatedAt = new Date().toISOString();
        booking.statusHistory.push({
          status: 'SUPPLIER_CONFIRMED',
          changedAt: new Date().toISOString(),
          changedBy: 'AirDesk Groups API',
          notes: `Confirmed by supplier with AirDesk Booking ID: ${supplierResponse.supplierBookingId} (Ref: ${supplierResponse.supplierReferenceCode})`
        });

        // Also mark corresponding payment verified
        const pay = this.payments.find(p => p.bookingId === booking.id);
        if (pay) {
          pay.status = 'VERIFIED';
          pay.verifiedAt = new Date().toISOString();
          pay.verifiedBy = adminName;
        }

        // Automated Notification Dispatch
        this.sendNotification(
          booking.agentEmail,
          booking.agentName,
          'BOOKING_CONFIRMED',
          'EMAIL',
          `Booking Confirmed [${booking.id}] - ${booking.productTitle}`,
          `Your group reservation ${booking.id} has been confirmed by AirDesk (PNR: ${supplierResponse.supplierBookingId}). Official travel voucher VCH-${booking.id} has been generated.`,
          {
            bookingId: booking.id,
            supplierBookingId: supplierResponse.supplierBookingId,
            voucherNumber: `VCH-${booking.id}`
          }
        );

        this.saveState();
        return {
          success: true,
          supplierBookingId: supplierResponse.supplierBookingId,
          message: `Booking successfully transmitted to AirDesk. Supplier Reference: ${supplierResponse.supplierBookingId}`
        };
      } else {
        booking.status = 'SUPPLIER_FAILED';
        booking.updatedAt = new Date().toISOString();
        booking.statusHistory.push({
          status: 'SUPPLIER_FAILED',
          changedAt: new Date().toISOString(),
          changedBy: 'AirDesk API',
          notes: `Supplier Error: ${supplierResponse.errorMessage || 'Unable to book seats'}`
        });
        this.saveState();
        return {
          success: false,
          message: `AirDesk Error: ${supplierResponse.errorMessage || 'Supplier rejected request'}`
        };
      }
    } catch (err: any) {
      booking.status = 'SUPPLIER_FAILED';
      booking.statusHistory.push({
        status: 'SUPPLIER_FAILED',
        changedAt: new Date().toISOString(),
        changedBy: 'System Automation',
        notes: `Network/Integration Error: ${err.message}`
      });
      this.saveState();
      return { success: false, message: `AirDesk Integration Error: ${err.message}` };
    }
  }

  public rejectBooking(bookingId: string, reason: string, adminName: string = 'GNK Admin'): void {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    booking.status = 'REJECTED';
    booking.updatedAt = new Date().toISOString();
    booking.statusHistory.push({
      status: 'REJECTED',
      changedAt: new Date().toISOString(),
      changedBy: adminName,
      notes: reason || 'Booking rejected by GNK Operations'
    });
    this.saveState();
  }

  public cancelBooking(bookingId: string, reason: string, user: AgentUser): void {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    booking.status = 'CANCELLED';
    booking.updatedAt = new Date().toISOString();
    booking.statusHistory.push({
      status: 'CANCELLED',
      changedAt: new Date().toISOString(),
      changedBy: user.fullName,
      notes: reason || 'Cancelled by agent/admin'
    });
    this.saveState();
  }

  public getPayments(): PaymentTransaction[] {
    return [...this.payments];
  }

  // ---------------- Financial Ledger & SOA Operations ---------------- //

  public getAgencyLedger(agencyId: string): LedgerTransaction[] {
    return this.ledgerTransactions
      .filter(t => t.agencyId === agencyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public recordLedgerTransaction(
    agencyId: string,
    type: LedgerEntryType,
    amountPKR: number,
    reference: string,
    description: string,
    agentId?: string,
    bookingId?: string
  ): LedgerTransaction {
    const agency = this.agencies.find(a => a.id === agencyId);
    const currentBalance = agency?.walletBalancePKR || 0;

    let newBalance = currentBalance;
    if (type === 'CREDIT_DEPOSIT' || type === 'COMMISSION_PAYOUT' || type === 'BOOKING_REFUND') {
      newBalance += amountPKR;
    } else if (type === 'BOOKING_DEBIT') {
      newBalance -= amountPKR;
    }

    if (agency) {
      agency.walletBalancePKR = newBalance;
    }

    const newTxn: LedgerTransaction = {
      id: `TXN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      agencyId,
      agentId,
      bookingId,
      type,
      amountPKR,
      balanceAfterPKR: newBalance,
      reference,
      description,
      createdAt: new Date().toISOString(),
    };

    this.ledgerTransactions.push(newTxn);
    this.saveState();
    return newTxn;
  }

  public topUpAgencyWallet(agencyId: string, amountPKR: number, reference: string, notes?: string): LedgerTransaction {
    return this.recordLedgerTransaction(
      agencyId,
      'CREDIT_DEPOSIT',
      amountPKR,
      reference || `DEP-${Date.now().toString().slice(-6)}`,
      notes || 'Manual Wholesale Wallet Deposit',
    );
  }

  public updateAgencyCreditLimit(agencyId: string, newLimitPKR: number): void {
    const agency = this.agencies.find(a => a.id === agencyId);
    if (!agency) return;

    agency.creditLimitPKR = newLimitPKR;
    this.recordLedgerTransaction(
      agencyId,
      'CREDIT_LIMIT_ADJUSTMENT',
      newLimitPKR,
      `CREDIT-ADJ-${Date.now().toString().slice(-6)}`,
      `Credit line updated to PKR ${newLimitPKR.toLocaleString()}`
    );
    this.saveState();
  }

  public generateStatementOfAccount(
    agencyId: string,
    periodStart?: string,
    periodEnd?: string
  ): StatementOfAccount {
    const agency = this.agencies.find(a => a.id === agencyId) || this.agencies[0];
    const allTxns = this.getAgencyLedger(agencyId).reverse(); // chronological

    const start = periodStart ? new Date(periodStart) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    const filtered = allTxns.filter((t) => {
      const dt = new Date(t.createdAt);
      return dt >= start && dt <= end;
    });

    let totalDebits = 0;
    let totalCredits = 0;

    filtered.forEach((t) => {
      if (t.type === 'BOOKING_DEBIT') {
        totalDebits += t.amountPKR;
      } else if (t.type === 'CREDIT_DEPOSIT' || t.type === 'COMMISSION_PAYOUT' || t.type === 'BOOKING_REFUND') {
        totalCredits += t.amountPKR;
      }
    });

    const openingBalance = filtered.length > 0 
      ? Math.max(0, filtered[0].balanceAfterPKR - (filtered[0].type === 'BOOKING_DEBIT' ? -filtered[0].amountPKR : filtered[0].amountPKR))
      : (agency?.walletBalancePKR || 0);

    const closingBalance = agency?.walletBalancePKR || (filtered.length > 0 ? filtered[filtered.length - 1].balanceAfterPKR : 0);
    const creditLimit = agency?.creditLimitPKR || 1500000;

    return {
      statementNumber: `SOA-${end.getFullYear()}${(end.getMonth() + 1).toString().padStart(2, '0')}-${agencyId.slice(-4).toUpperCase()}`,
      agencyId: agency.id,
      agencyName: agency.name,
      agencyNtn: agency.ntnNumber || '7392810-4',
      agencyDtsLicense: agency.tradeLicenseNumber || 'DTS-4920-KHI',
      officeAddress: agency.officeAddress || 'Suite 402, Business Avenue, Shahrah-e-Faisal, Karachi',
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      openingBalancePKR: openingBalance,
      closingBalancePKR: closingBalance,
      totalDebitsPKR: totalDebits,
      totalCreditsPKR: totalCredits,
      creditLimitPKR: creditLimit,
      availableCreditPKR: creditLimit + closingBalance,
      transactions: filtered.reverse(),
      generatedAt: new Date().toISOString(),
    };
  }

  public getAdminFinancialSummary(): AdminFinancialSummary {
    let grossVolume = 0;
    let supplierCost = 0;
    let retainedMargin = 0;

    this.bookings.forEach((b) => {
      if (b.status !== 'REJECTED' && b.status !== 'CANCELLED') {
        grossVolume += b.totalAgentSellingPricePKR;
        supplierCost += b.totalSupplierNetPKR;
        retainedMargin += b.totalMarkupPKR;
      }
    });

    let totalDeposits = 0;
    let totalOutstanding = 0;

    this.agencies.forEach((a) => {
      totalDeposits += a.walletBalancePKR || 0;
      totalOutstanding += a.creditLimitPKR || 0;
    });

    return {
      grossBookingsVolumePKR: grossVolume || 4850000,
      totalSupplierCostPKR: supplierCost || 4350000,
      retainedGnkMarginPKR: retainedMargin || 500000,
      totalAgencyWalletDepositsPKR: totalDeposits || 1300000,
      totalOutstandingCreditPKR: totalOutstanding || 3500000,
      activeAgenciesCount: this.agencies.filter(a => a.approvalStatus === 'APPROVED').length,
    };
  }

  // --- Notifications & E-Voucher Dispatch ---

  public getNotifications(email?: string): B2BNotification[] {
    if (email) {
      return this.notifications.filter(
        n => n.recipientEmail.toLowerCase() === email.toLowerCase()
      ).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    }
    return [...this.notifications].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  public sendNotification(
    recipientEmail: string,
    recipientName: string,
    type: NotificationType,
    channel: NotificationChannel,
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
    this.saveState();
    return notif;
  }

  public generateVoucherData(bookingId: string): B2BVoucherData {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const pnrCode = booking.supplierBookingId ? `PNR-${booking.supplierBookingId.slice(-4)}` : 'PNR-AD-8921';
    
    let destination = 'Dubai, UAE';
    let durationDays = 7;
    let airline = 'Emirates / FlyDubai (Direct Economy)';
    let hotelDetails = 'Millennium Plaza Downtown / Citymax Hotel Bur Dubai (4-Star Bed & Breakfast)';
    let inclusions = [
      'Direct Flight Return Economy Air Ticket',
      '4-Star Deluxe Hotel Accommodation with Daily Breakfast',
      'Airport Meet & Assist with Shared VIP Coach Transfers',
      'Desert Safari with Dune Bashing, Tanoura Show & BBQ Dinner',
      'Dubai Marina Luxury Dhow Cruise with International Buffet',
      'Burj Khalifa Level 124 Observation Deck Admission Tickets',
      'UAE Tourist Visa & Mandatory Travel Insurance'
    ];

    if (booking.productTitle.toLowerCase().includes('umrah') || booking.productTitle.toLowerCase().includes('saudi')) {
      destination = 'Makkah & Madinah, Saudi Arabia';
      durationDays = 15;
      airline = 'Saudia Airlines / PIA (Direct Group Allocation)';
      hotelDetails = 'Swissotel Al Maqam Makkah (5-Star) & Pullman Zamzam Madinah (5-Star)';
      inclusions = [
        'Round-Trip Flights with Saudia / PIA Direct Group Allocation',
        '5-Star Luxury Clock Tower Accommodations with Full Board / Suhoor',
        'Ziyarat Tours of Makkah & Madinah with Qualified Guide',
        'Private VIP High-Speed Haramain Train & Coach Transfers',
        'Umrah E-Visa, Zamzam Water Canisters & 24/7 Operations Support'
      ];
    } else if (booking.productTitle.toLowerCase().includes('turkey') || booking.productTitle.toLowerCase().includes('istanbul')) {
      destination = 'Istanbul & Cappadocia, Turkey';
      durationDays = 8;
      airline = 'Turkish Airlines / Pegasus (Economy)';
      hotelDetails = 'Radisson Blu Istanbul Pera & Cave Resort Cappadocia';
      inclusions = [
        'International Return Flight Tickets',
        'Boutique Hotel Accommodation with Daily Turkish Breakfast',
        'Hot Air Balloon Experience in Cappadocia',
        'Bosphorus Sunset Dinner Cruise',
        'All Inter-City Domestic Flights & Guided Museum Tours'
      ];
    } else if (booking.productTitle.toLowerCase().includes('malaysia') || booking.productTitle.toLowerCase().includes('kuala lumpur')) {
      destination = 'Kuala Lumpur & Langkawi, Malaysia';
      durationDays = 6;
      airline = 'Batik Air / Malaysia Airlines';
      hotelDetails = 'PARKROYAL Collection Kuala Lumpur & Pelangi Beach Resort Langkawi';
      inclusions = [
        'Round-Trip Flight Tickets & Domestic Island Hopper',
        'Luxury Beach Resort & City Centre Hotel Stays',
        'Cable Car & Sky Bridge Tours in Langkawi',
        'Batu Caves & Genting Highlands Day Trip',
        'Private Airport & Sightseeing Transfers'
      ];
    }

    return {
      voucherNumber: `VCH-${booking.id}`,
      gnkBookingId: booking.id,
      supplierBookingId: booking.supplierBookingId || 'AD-PENDING',
      supplierPnr: pnrCode,
      tourTitle: booking.productTitle,
      destination,
      durationDays,
      departureDate: booking.departureDate,
      returnDate: booking.returnDate,
      airline,
      hotelDetails,
      agencyName: booking.agencyName || 'Partner Agency',
      agentName: booking.agentName,
      agentPhone: booking.agentPhone,
      passengers: booking.passengers,
      inclusions,
      meetingPoint: 'Airport Central Departure/Arrivals Hall (Look for GNK Connect / AirDesk Signboard)',
      emergencyCoordinator: '+92 21 34567890 / +971 50 1234567 (24/7 GNK Operations Hotline)',
      verificationCode: `AUTH-GNK-${booking.id.replace('GNK-2026-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      issuedAt: new Date().toISOString(),
    };
  }
}

export const b2bStore = new B2BStore();

