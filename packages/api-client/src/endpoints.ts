import type {
  AccountBalanceDto,
  AccountLedgerDto,
  AccountOption,
  AdminPartnerUserDto,
  ChartAccountDto,
  CurrencyDto,
  ExchangeRateDto,
  IncomeStatementDto,
  NotificationPrefsDto,
  NotificationPrefsPatch,
  PeriodDto,
  ReceiptDto,
  TrialBalanceDto,
  VoucherCounts,
  VoucherDto,
  VoucherListItem,
  AdminBookingDetailDto,
  AdminBookingListItem,
  AdminInventoryGroupDetail,
  AdminDashboardDto,
  AdminPartnerDetailDto,
  AdminPartnerListItem,
  AdminPaymentListItem,
  AdminProductDetailDto,
  AdminProductListItem,
  AdminQueueCounts,
  AuditLogDto,
  AuthResponse,
  BalanceDto,
  BankAccountDto,
  BookingConcessionRequestDto,
  BookingDetailDto,
  BookingListItem,
  BookingStatusCounts,
  CompanyInfoDto,
  GroupDetailDto,
  GroupFilters,
  GroupListItem,
  InvoiceDetailDto,
  InvoiceListItem,
  InventoryGroupDetail,
  InventoryGroupFilters,
  InventoryGroupListItem,
  MessageResponse,
  NotificationDto,
  Paginated,
  PartnerAccountDto,
  PartnerDashboardDto,
  PartnerInviteDto,
  PassportOcrExtraction,
  PartnerSession,
  PaymentDto,
  PricingRuleDto,
  PricingSimulationDto,
  PricingTierDto,
  PublicGroupDto,
  QuoteDto,
  RoleDto,
  SessionInfo,
  SettingsDto,
  StaffSession,
  StaffUserDto,
  StatementDto,
  SupplierCallDto,
  SupplierDto,
  SyncResultDto,
  TeamDto,
} from '@gnk/types';
import type {
  AccountCreateInput,
  AccountUpdateInput,
  AddMemberInput,
  AdminPartnerUserCreateInput,
  AdminPasswordResetInput,
  CurrencyInput,
  ExchangeRateInput,
  ForcedPasswordChangeInput,
  RoleInput,
  VoucherInput,
  VoucherListInput,
  VoucherReverseInput,
  AcceptInviteInput,
  AdminBookingListInput,
  BookingListInput,
  ChangePasswordInput,
  CreateBookingInput,
  CreditLimitInput,
  ExtensionRequestInput,
  GroupSearchInput,
  InviteMemberInput,
  LedgerAdjustmentInput,
  PartnerRegisterInput,
  PartnerReviewInput,
  PricingRuleInput,
  PricingSimulateInput,
  RecordPaymentInput,
  RefundRequestInput,
  ResetPasswordInput,
  SetBookingPassengersInput,
  SettingsInput,
  StaffInviteInput,
  SubmitPaymentInput,
  UpdateAccountProfileInput,
  UpdateMyProfileInput,
} from '@gnk/validation';
import type { HttpClient } from './http';

type Page = { page?: number; pageSize?: number; q?: string };
type ThemeBody = { theme: 'LIGHT' | 'DARK' | 'SYSTEM' };
type Range = { from?: string; to?: string };
export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface PartnerUsersDto {
  users: AdminPartnerUserDto[];
  invites: PartnerInviteDto[];
}
export interface PickerOption {
  id: string;
  label: string;
}

/** Endpoints that work without a session (both realms). */
export const publicApi = (http: HttpClient) => ({
  groups: (q: GroupSearchInput = {}) =>
    http.get<{ items: PublicGroupDto[]; total: number }>('public/groups', q as never),
  chat: (messages: { role: 'user' | 'model'; text: string }[]) =>
    http.post<{ text: string }>('public/ai/chat', { messages }),
});

export const partnerAuthApi = (http: HttpClient) => ({
  register: (dto: PartnerRegisterInput) => http.post<MessageResponse>('auth/partner/register', dto),
  verifyEmail: (token: string) =>
    http.post<MessageResponse>('auth/partner/verify-email', { token }),
  resendVerification: () => http.post<MessageResponse>('auth/partner/resend-verification'),
  forgotPassword: (email: string) =>
    http.post<MessageResponse>('auth/partner/forgot-password', { email }),
  resetPassword: (dto: ResetPasswordInput) =>
    http.post<MessageResponse>('auth/partner/reset-password', dto),
  lookupInvite: (token: string) =>
    http.get<{ email: string; role: string; accountName: string; existingUser: boolean }>(
      `auth/partner/invites/${encodeURIComponent(token)}`,
    ),
  acceptInvite: (dto: AcceptInviteInput | { token: string; password: string }) =>
    http.post<AuthResponse<PartnerSession>>('auth/partner/accept-invite', dto),
  updateMe: (dto: UpdateMyProfileInput) => http.patch<PartnerSession>('auth/partner/me', dto),
  changePassword: (dto: ChangePasswordInput) =>
    http.post<MessageResponse>('auth/partner/change-password', dto),
  setPassword: (dto: ForcedPasswordChangeInput) =>
    http.post<MessageResponse>('auth/partner/set-password', dto),
  setTheme: (dto: ThemeBody) => http.patch<ThemeBody>('auth/partner/preferences', dto),
  sessions: () => http.get<SessionInfo[]>('auth/partner/sessions'),
  revokeSession: (id: string) => http.delete<void>(`auth/partner/sessions/${id}`),
});

export const partnerApi = (http: HttpClient) => ({
  auth: partnerAuthApi(http),
  dashboard: () => http.get<PartnerDashboardDto>('partner/dashboard'),
  account: {
    get: () => http.get<PartnerAccountDto>('partner/account'),
    update: (dto: UpdateAccountProfileInput) =>
      http.patch<PartnerAccountDto>('partner/account', dto),
    addDocument: (type: string, fileId: string) =>
      http.put<PartnerAccountDto>('partner/account/documents', { type, fileId }),
    removeDocument: (id: string) =>
      http.delete<PartnerAccountDto>(`partner/account/documents/${id}`),
    submit: () => http.post<PartnerAccountDto>('partner/account/submit'),
  },
  team: {
    get: () => http.get<TeamDto>('partner/team'),
    invite: (dto: InviteMemberInput) => http.post<PartnerInviteDto>('partner/team/invites', dto),
    revokeInvite: (id: string) => http.delete<void>(`partner/team/invites/${id}`),
    updateRole: (userId: string, role: string) =>
      http.patch<TeamDto>(`partner/team/members/${userId}`, { role }),
    remove: (userId: string) => http.delete<TeamDto>(`partner/team/members/${userId}`),
    addMember: (dto: AddMemberInput) => http.post<TeamDto>('partner/team/members', dto),
    setStatus: (userId: string, status: 'ACTIVE' | 'DISABLED') =>
      http.patch<TeamDto>(`partner/team/members/${userId}/status`, { status }),
  },
  groups: {
    search: (q: GroupSearchInput) =>
      http.get<Paginated<GroupListItem>>('partner/groups', q as never),
    filters: () => http.get<GroupFilters>('partner/groups/filters'),
    get: (productId: string) => http.get<GroupDetailDto>(`partner/groups/${productId}`),
  },
  quotes: {
    create: (departureId: string, seats: number) =>
      http.post<QuoteDto>('partner/quotes', { departureId, seats }),
    get: (id: string) => http.get<QuoteDto>(`partner/quotes/${id}`),
  },
  bookings: {
    list: (q: BookingListInput) =>
      http.get<Paginated<BookingListItem>>('partner/bookings', q as never),
    counts: () => http.get<BookingStatusCounts>('partner/bookings/counts'),
    get: (id: string) => http.get<BookingDetailDto>(`partner/bookings/${id}`),
    create: (dto: CreateBookingInput, idempotencyKey: string) =>
      http.post<BookingDetailDto>('partner/bookings', dto, { 'Idempotency-Key': idempotencyKey }),
    setPassengers: (id: string, dto: SetBookingPassengersInput) =>
      http.put<BookingDetailDto>(`partner/bookings/${id}/passengers`, dto),
    requestConcession: (id: string, dto: unknown) =>
      http.post(`partner/bookings/${id}/concession-requests`, dto),
    concessions: (id: string) =>
      http.get<BookingConcessionRequestDto[]>(`partner/bookings/${id}/concession-requests`),
    requestExtension: (id: string, dto: ExtensionRequestInput) =>
      http.post<MessageResponse>(`partner/bookings/${id}/extension-request`, dto),
    documents: {
      reservationPdf: (id: string) => http.blob(`partner/bookings/${id}/documents/reservation`),
      confirmationPdf: (id: string) => http.blob(`partner/bookings/${id}/documents/confirmation`),
      ticketPdf: (id: string) => http.blob(`partner/bookings/${id}/documents/ticket`),
    },
    emailTicket: (id: string, to?: string) =>
      http.post<MessageResponse>(`partner/bookings/${id}/ticket/email`, { to }),
    passportOcrExtractText: (ocrText: string) =>
      http.post<PassportOcrExtraction>('partner/bookings/passport-ocr/extract-text', { ocrText }),
    attachPassportScan: (id: string, passengerId: string, fileId: string) =>
      http.post<{ passportScanFileId: string }>(
        `partner/bookings/${id}/passengers/${passengerId}/passport-scan`,
        { fileId },
      ),
    concessionQueue: () =>
      http.get<BookingConcessionRequestDto[]>('partner/bookings/concession-requests'),
    cancel: (id: string, reason: string) =>
      http.post<BookingDetailDto>(`partner/bookings/${id}/cancel`, { reason }),
    requestRefund: (id: string, dto: RefundRequestInput) =>
      http.post<BookingDetailDto>(`partner/bookings/${id}/refund-request`, dto),
  },
  inventory: {
    groups: {
      list: (q: Record<string, unknown> = {}) =>
        http.get<{ items: InventoryGroupListItem[]; total: number }>(
          'partner/inventory/groups',
          q as never,
        ),
      filters: () => http.get<InventoryGroupFilters>('partner/inventory/groups/filters'),
      get: (id: string) => http.get<InventoryGroupDetail>('partner/inventory/groups/' + id),
    },
  },
  invoices: {
    list: () => http.get<InvoiceListItem[]>('partner/invoices'),
    get: (id: string) => http.get<InvoiceDetailDto>(`partner/invoices/${id}`),
  },
  payments: {
    list: () => http.get<PaymentDto[]>('partner/payments'),
    submit: (dto: SubmitPaymentInput) => http.post<PaymentDto>('partner/payments', dto),
    receipt: (id: string) => http.get<ReceiptDto>(`partner/payments/${id}/receipt`),
    receiptPdf: (id: string) => http.blob(`partner/payments/${id}/receipt/pdf`),
    instructions: () =>
      http.get<{ bankAccounts: BankAccountDto[]; note: string; company: CompanyInfoDto }>(
        'partner/payment-instructions',
      ),
  },
  ledger: {
    balance: () => http.get<BalanceDto>('partner/ledger/balance'),
    statement: (q: { from?: string; to?: string }) =>
      http.get<StatementDto>('partner/ledger/statement', q),
  },
  notifications: {
    list: () => http.get<{ items: NotificationDto[]; unread: number }>('partner/notifications'),
    read: (id: string) => http.post<void>(`partner/notifications/${id}/read`),
    readAll: () => http.post<void>('partner/notifications/read-all'),
    preferences: () => http.get<NotificationPrefsDto>('partner/notifications/preferences'),
    setPreferences: (dto: NotificationPrefsPatch) =>
      http.put<NotificationPrefsDto>('partner/notifications/preferences', dto),
  },
  files: {
    upload: (file: File, purpose: 'KYC' | 'PAYMENT_PROOF' | 'PASSPORT_COPY' | 'LOGO') =>
      http.upload<UploadedFile>('partner/files', file, { purpose }),
    blob: (id: string) => http.blob(`partner/files/${id}`),
  },
});

export const staffAuthApi = (http: HttpClient) => ({
  forgotPassword: (email: string) =>
    http.post<MessageResponse>('auth/staff/forgot-password', { email }),
  resetPassword: (dto: ResetPasswordInput) =>
    http.post<MessageResponse>('auth/staff/reset-password', dto),
  lookupInvite: (token: string) =>
    http.get<{ email: string; fullName: string }>(
      `auth/staff/invites/${encodeURIComponent(token)}`,
    ),
  acceptInvite: (dto: AcceptInviteInput) =>
    http.post<AuthResponse<StaffSession>>('auth/staff/accept-invite', dto),
  changePassword: (dto: ChangePasswordInput) =>
    http.post<MessageResponse>('auth/staff/change-password', dto),
  setPassword: (dto: ForcedPasswordChangeInput) =>
    http.post<MessageResponse>('auth/staff/set-password', dto),
  setTheme: (dto: ThemeBody) => http.patch<ThemeBody>('auth/staff/preferences', dto),
  sessions: () => http.get<SessionInfo[]>('auth/staff/sessions'),
  revokeSession: (id: string) => http.delete<void>(`auth/staff/sessions/${id}`),
});

export const adminApi = (http: HttpClient) => ({
  auth: staffAuthApi(http),
  dashboard: () => http.get<AdminDashboardDto>('admin/dashboard'),
  queues: () => http.get<AdminQueueCounts>('admin/queues'),
  partners: {
    list: (q: Page & { status?: string }) =>
      http.get<Paginated<AdminPartnerListItem>>('admin/partners', q),
    counts: () => http.get<Record<string, number>>('admin/partners/counts'),
    get: (id: string) => http.get<AdminPartnerDetailDto>(`admin/partners/${id}`),
    review: (id: string, dto: PartnerReviewInput) =>
      http.post<AdminPartnerDetailDto>(`admin/partners/${id}/review`, dto),
    setCredit: (id: string, dto: CreditLimitInput) =>
      http.patch<AdminPartnerDetailDto>(`admin/partners/${id}/credit`, dto),
    reviewDocument: (documentId: string, status: 'VERIFIED' | 'REJECTED', note?: string) =>
      http.patch<AdminPartnerDetailDto>(`admin/partners/documents/${documentId}`, { status, note }),
    users: (id: string) => http.get<PartnerUsersDto>(`admin/partners/${id}/users`),
    createUser: (id: string, dto: AdminPartnerUserCreateInput) =>
      http.post<PartnerUsersDto>(`admin/partners/${id}/users`, dto),
    updateUser: (
      id: string,
      userId: string,
      dto: { role?: string; status?: 'ACTIVE' | 'DISABLED' },
    ) => http.patch<PartnerUsersDto>(`admin/partners/${id}/users/${userId}`, dto),
    resetUserPassword: (id: string, userId: string, dto: AdminPasswordResetInput) =>
      http.post<MessageResponse>(`admin/partners/${id}/users/${userId}/reset-password`, dto),
    revokeInvite: (id: string, inviteId: string) =>
      http.delete<PartnerUsersDto>(`admin/partners/${id}/invites/${inviteId}`),
  },
  bookings: {
    list: (q: AdminBookingListInput) =>
      http.get<Paginated<AdminBookingListItem>>('admin/bookings', q as never),
    counts: () => http.get<Record<string, number>>('admin/bookings/counts'),
    get: (id: string) => http.get<AdminBookingDetailDto>(`admin/bookings/${id}`),
    approve: (id: string, note?: string) =>
      http.post<AdminBookingDetailDto>(`admin/bookings/${id}/approve`, { note }),
    reject: (id: string, reason: string) =>
      http.post<AdminBookingDetailDto>(`admin/bookings/${id}/reject`, { reason }),
    push: (id: string) => http.post<AdminBookingDetailDto>(`admin/bookings/${id}/push`),
    sync: (id: string) => http.post<AdminBookingDetailDto>(`admin/bookings/${id}/sync`),
    cancel: (id: string, reason: string) =>
      http.post<AdminBookingDetailDto>(`admin/bookings/${id}/cancel`, { reason }),
    complete: (id: string) => http.post<AdminBookingDetailDto>(`admin/bookings/${id}/complete`),
    approveRefund: (id: string) =>
      http.post<AdminBookingDetailDto>(`admin/bookings/${id}/refund-approve`),
    rejectRefund: (id: string, reason: string) =>
      http.post<AdminBookingDetailDto>(`admin/bookings/${id}/refund-reject`, { reason }),
    setNotes: (id: string, internalNotes: string) =>
      http.patch<AdminBookingDetailDto>(`admin/bookings/${id}/notes`, { internalNotes }),
    assign: (id: string, staffId: string | null) =>
      http.patch<AdminBookingDetailDto>(`admin/bookings/${id}/assign`, { staffId }),
    revealPassport: (passengerId: string) =>
      http.post<{ passportNumber: string }>(`admin/bookings/passengers/${passengerId}/reveal`),
    // Inventory (AirDesk) group-booking lifecycle.
    confirm: (id: string) => http.post<AdminBookingDetailDto>(`admin/bookings/${id}/confirm`),
    ticket: (
      id: string,
      dto: { passengerTickets: { passengerId: string; ticketNumber: string }[] },
    ) => http.post<AdminBookingDetailDto>(`admin/bookings/${id}/ticket`, dto),
    extendDeadline: (id: string, dto: { extensionMinutes: number }) =>
      http.post<AdminBookingDetailDto>(`admin/bookings/${id}/extension-approve`, dto),
    rejectExtension: (id: string, note?: string) =>
      http.post(`admin/bookings/${id}/extension-reject`, { note }),
    requestPassengers: (id: string) => http.post(`admin/bookings/${id}/request-passengers`),
    concessions: (id: string) =>
      http.get<BookingConcessionRequestDto[]>(`admin/bookings/${id}/concession-requests`),
    concessionQueue: () =>
      http.get<
        (BookingConcessionRequestDto & { bookingReference?: string; bookingStatus?: string })[]
      >('admin/bookings/concession-requests'),
    decideConcession: (
      requestId: string,
      dto: {
        decision: 'APPROVED' | 'REJECTED';
        approvedChildSeats?: number;
        approvedInfantSeats?: number;
        approvedDiscountAmount?: number;
        decisionNote?: string;
        pnrCode?: string;
      },
    ) => http.post(`admin/bookings/concession-requests/${requestId}/decide`, dto),
    assignConcessionPnr: (requestId: string, pnrCode: string) =>
      http.post<AdminBookingDetailDto>(`admin/bookings/concession-requests/${requestId}/pnr`, {
        pnrCode,
      }),
    grantConcession: (
      id: string,
      dto: {
        kind: 'CHILD_SEATS' | 'INFANT_SEATS' | 'DISCOUNT';
        childSeats?: number;
        infantSeats?: number;
        discountAmount?: number;
        pnrCode?: string;
        reason?: string;
      },
    ) => http.post<AdminBookingDetailDto>(`admin/bookings/${id}/concessions`, dto),
    reviseDiscount: (id: string, dto: { approvedDiscountAmount: number; reason?: string }) =>
      http.patch<AdminBookingDetailDto>(`admin/bookings/${id}/concessions/discount`, dto),
    assignPassengerSeatPnr: (
      id: string,
      dto: { pnrCode: string; seats: number; kind: 'child' | 'infant' },
    ) => http.post<AdminBookingDetailDto>(`admin/bookings/${id}/passenger-seat-pnr`, dto),
    emailTicket: (id: string, to?: string) =>
      http.post<MessageResponse>(`admin/bookings/${id}/ticket/email`, { to }),
    passportOcrExtractText: (ocrText: string) =>
      http.post<PassportOcrExtraction>('admin/bookings/passport-ocr/extract-text', { ocrText }),
    documents: {
      reservationPdf: (id: string) => http.blob(`admin/bookings/${id}/documents/reservation`),
      confirmationPdf: (id: string) => http.blob(`admin/bookings/${id}/documents/confirmation`),
      ticketPdf: (id: string) => http.blob(`admin/bookings/${id}/documents/ticket`),
    },
    exportPassengers: (id: string, format: 'pdf' | 'xlsx') =>
      http.blob(`admin/bookings/${id}/passengers/export?format=${format}`),
    exportPassengersBulk: (bookingIds: string[], format: 'pdf' | 'xlsx') =>
      http.blob(
        `admin/bookings/export/passengers?bookingIds=${encodeURIComponent(bookingIds.join(','))}&format=${format}`,
      ),
    exportAirline: (airline: 'airblue' | 'airsial' | 'saudi', bookingIds: string[]) =>
      http.blob(
        `admin/bookings/export/${airline}?bookingIds=${encodeURIComponent(bookingIds.join(','))}`,
      ),
  },
  inventory: {
    groups: {
      list: (q: Record<string, unknown> = {}) =>
        http.get<{ items: InventoryGroupListItem[]; total: number }>(
          'admin/inventory/groups',
          q as never,
        ),
      get: (id: string) => http.get<AdminInventoryGroupDetail>('admin/inventory/groups/' + id),
      create: (dto: Record<string, unknown>) =>
        http.post<AdminInventoryGroupDetail>('admin/inventory/groups', dto),
      update: (id: string, dto: Record<string, unknown>) =>
        http.patch<AdminInventoryGroupDetail>(`admin/inventory/groups/${id}`, dto),
      addSegment: (id: string, dto: Record<string, unknown>) =>
        http.post<AdminInventoryGroupDetail>(`admin/inventory/groups/${id}/segments`, dto),
      createLot: (id: string, dto: Record<string, unknown>) =>
        http.post(`admin/inventory/groups/${id}/lots`, dto),
      updateLotStatus: (lotId: string, status: 'OPEN' | 'FROZEN' | 'CLOSED') =>
        http.patch<AdminInventoryGroupDetail>(`admin/inventory/groups/lots/${lotId}`, { status }),
      upsertPnrs: (
        lotId: string,
        pnrs: {
          pnrCode: string;
          allocatedSeats: number;
          sortOrder?: number;
          paxKind?: 'ADULT' | 'CHILD' | 'INFANT' | null;
        }[],
      ) => http.put(`admin/inventory/groups/lots/${lotId}/pnrs`, { pnrs }),
    },
  },
  invoices: { get: (id: string) => http.get<InvoiceDetailDto>(`admin/invoices/${id}`) },
  payments: {
    list: (q: Page & { status?: string; accountId?: string }) =>
      http.get<Paginated<AdminPaymentListItem>>('admin/payments', q),
    counts: () => http.get<Record<string, number>>('admin/payments/counts'),
    get: (id: string) => http.get<AdminPaymentListItem>(`admin/payments/${id}`),
    receipt: (id: string) => http.get<ReceiptDto>(`admin/payments/${id}/receipt`),
    receiptPdf: (id: string) => http.blob(`admin/payments/${id}/receipt/pdf`),
    verify: (id: string, depositAccountId?: string) =>
      http.post<AdminPaymentListItem>(`admin/payments/${id}/verify`, { depositAccountId }),
    reject: (id: string, reason: string) =>
      http.post<AdminPaymentListItem>(`admin/payments/${id}/reject`, { reason }),
    record: (dto: RecordPaymentInput) => http.post<AdminPaymentListItem>('admin/payments', dto),
  },
  ledger: {
    accounts: (q: Page) => http.get<Paginated<AdminPartnerListItem>>('admin/ledger/accounts', q),
    statement: (accountId: string, q: { from?: string; to?: string }) =>
      http.get<StatementDto>(`admin/ledger/${accountId}/statement`, q),
    adjust: (accountId: string, dto: LedgerAdjustmentInput) =>
      http.post<BalanceDto>(`admin/ledger/${accountId}/adjustments`, dto),
  },
  accounting: {
    accounts: (asOf?: string) => http.get<ChartAccountDto[]>('admin/accounting/accounts', { asOf }),
    options: () => http.get<AccountOption[]>('admin/accounting/accounts/options'),
    balance: (id: string) => http.get<AccountBalanceDto>(`admin/accounting/accounts/${id}/balance`),
    accountLedger: (id: string, q: Range) =>
      http.get<AccountLedgerDto>(`admin/accounting/accounts/${id}/ledger`, q),
    createAccount: (dto: AccountCreateInput) =>
      http.post<ChartAccountDto>('admin/accounting/accounts', dto),
    updateAccount: (id: string, dto: AccountUpdateInput) =>
      http.patch<ChartAccountDto>(`admin/accounting/accounts/${id}`, dto),
    vouchers: (q: VoucherListInput) =>
      http.get<Paginated<VoucherListItem>>('admin/accounting/vouchers', q as never),
    voucherCounts: () => http.get<VoucherCounts>('admin/accounting/vouchers/counts'),
    voucher: (id: string) => http.get<VoucherDto>(`admin/accounting/vouchers/${id}`),
    createVoucher: (dto: VoucherInput, action: 'draft' | 'submit' | 'post') =>
      http.post<VoucherDto>('admin/accounting/vouchers', { ...dto, action }),
    updateVoucher: (id: string, dto: VoucherInput) =>
      http.put<VoucherDto>(`admin/accounting/vouchers/${id}`, dto),
    submitVoucher: (id: string) => http.post<VoucherDto>(`admin/accounting/vouchers/${id}/submit`),
    postVoucher: (id: string) => http.post<VoucherDto>(`admin/accounting/vouchers/${id}/post`),
    approveVoucher: (id: string, selfApprovalReason?: string) =>
      http.post<VoucherDto>(`admin/accounting/vouchers/${id}/approve`, { selfApprovalReason }),
    rejectVoucher: (id: string, reason: string) =>
      http.post<VoucherDto>(`admin/accounting/vouchers/${id}/reject`, { reason }),
    reverseVoucher: (id: string, dto: VoucherReverseInput) =>
      http.post<VoucherDto>(`admin/accounting/vouchers/${id}/reverse`, dto),
    deleteVoucher: (id: string) => http.delete<void>(`admin/accounting/vouchers/${id}`),
    trialBalance: (asOf?: string) =>
      http.get<TrialBalanceDto>('admin/accounting/reports/trial-balance', { asOf }),
    incomeStatement: (q: Range) =>
      http.get<IncomeStatementDto>('admin/accounting/reports/income-statement', q),
    currencies: () => http.get<CurrencyDto[]>('admin/accounting/currencies'),
    saveCurrency: (dto: CurrencyInput) =>
      http.put<CurrencyDto[]>('admin/accounting/currencies', dto),
    rates: (currency?: string) =>
      http.get<ExchangeRateDto[]>('admin/accounting/rates', { currency }),
    addRate: (dto: ExchangeRateInput) =>
      http.post<ExchangeRateDto[]>('admin/accounting/rates', dto),
    periods: () => http.get<PeriodDto[]>('admin/accounting/periods'),
    closePeriod: (month: string) =>
      http.post<PeriodDto[]>('admin/accounting/periods/close', { month }),
    reopenPeriod: (month: string) =>
      http.post<PeriodDto[]>('admin/accounting/periods/reopen', { month }),
  },
  pricing: {
    rules: () => http.get<PricingRuleDto[]>('admin/pricing/rules'),
    create: (dto: PricingRuleInput) => http.post<PricingRuleDto[]>('admin/pricing/rules', dto),
    update: (id: string, dto: PricingRuleInput) =>
      http.put<PricingRuleDto[]>(`admin/pricing/rules/${id}`, dto),
    remove: (id: string) => http.delete<PricingRuleDto[]>(`admin/pricing/rules/${id}`),
    simulate: (dto: PricingSimulateInput) =>
      http.post<PricingSimulationDto>('admin/pricing/simulate', dto),
    tiers: () => http.get<PricingTierDto[]>('admin/pricing/tiers'),
    createTier: (name: string, description?: string) =>
      http.post<PricingTierDto[]>('admin/pricing/tiers', { name, description }),
    deleteTier: (id: string) => http.delete<PricingTierDto[]>(`admin/pricing/tiers/${id}`),
  },
  catalog: {
    list: (q: Page & { type?: string; published?: string }) =>
      http.get<Paginated<AdminProductListItem>>('admin/catalog/products', q),
    get: (id: string) => http.get<AdminProductDetailDto>(`admin/catalog/products/${id}`),
    setVisibility: (id: string, dto: { isPublished?: boolean; isFeatured?: boolean }) =>
      http.patch<AdminProductDetailDto>(`admin/catalog/products/${id}`, dto),
    options: () =>
      http.get<{
        partners: PickerOption[];
        products: (PickerOption & { type: string })[];
        suppliers: PickerOption[];
        departures: (PickerOption & { productId: string })[];
      }>('admin/catalog/options'),
  },
  suppliers: {
    list: () => http.get<SupplierDto[]>('admin/suppliers'),
    sync: (id: string) => http.post<SyncResultDto>(`admin/suppliers/${id}/sync`),
    setStatus: (id: string, status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') =>
      http.patch<SupplierDto>(`admin/suppliers/${id}`, { status }),
    setPayable: (id: string, payableAccountId: string | null) =>
      http.patch<SupplierDto>(`admin/suppliers/${id}/payable`, { payableAccountId }),
    calls: (id: string, q: Page & { failed?: 'true' | 'false' }) =>
      http.get<Paginated<SupplierCallDto & { bookingId: string | null }>>(
        `admin/suppliers/${id}/calls`,
        q,
      ),
  },
  staff: {
    list: () => http.get<StaffUserDto[]>('admin/staff'),
    invite: (dto: StaffInviteInput) => http.post<StaffUserDto>('admin/staff', dto),
    update: (
      id: string,
      dto: { fullName?: string; roles?: string[]; status?: 'ACTIVE' | 'DISABLED' },
    ) => http.patch<StaffUserDto>(`admin/staff/${id}`, dto),
    resendInvite: (id: string) => http.post<void>(`admin/staff/${id}/resend-invite`),
    resetPassword: (id: string, dto: AdminPasswordResetInput) =>
      http.post<MessageResponse>(`admin/staff/${id}/reset-password`, dto),
    roles: () => http.get<RoleDto[]>('admin/roles'),
    createRole: (dto: RoleInput) => http.post<RoleDto>('admin/roles', dto),
    updateRole: (id: string, dto: RoleInput) => http.patch<RoleDto>(`admin/roles/${id}`, dto),
    deleteRole: (id: string) => http.delete<void>(`admin/roles/${id}`),
  },
  audit: (q: Page & { action?: string; entityType?: string; entityId?: string }) =>
    http.get<Paginated<AuditLogDto>>('admin/audit', q),
  settings: {
    get: () => http.get<SettingsDto>('admin/settings'),
    update: (dto: SettingsInput) => http.put<SettingsDto>('admin/settings', dto),
  },
  notifications: {
    list: () => http.get<{ items: NotificationDto[]; unread: number }>('admin/notifications'),
    read: (id: string) => http.post<void>(`admin/notifications/${id}/read`),
    readAll: () => http.post<void>('admin/notifications/read-all'),
    preferences: () => http.get<NotificationPrefsDto>('admin/notifications/preferences'),
    setPreferences: (dto: NotificationPrefsPatch) =>
      http.put<NotificationPrefsDto>('admin/notifications/preferences', dto),
  },
  files: {
    blob: (id: string) => http.blob(`admin/files/${id}`),
    upload: (file: File, purpose: 'PAYMENT_PROOF' | 'VOUCHER', accountId?: string) =>
      http.upload<UploadedFile>('admin/files', file, { purpose, accountId }),
  },
});

export type PartnerApi = ReturnType<typeof partnerApi>;
export type AdminApi = ReturnType<typeof adminApi>;
