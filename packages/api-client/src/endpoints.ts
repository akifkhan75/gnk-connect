import type {
  AccountBalanceDto,
  AccountLedgerDto,
  AccountOption,
  AdminPartnerUserDto,
  ChartAccountDto,
  CurrencyDto,
  ExchangeRateDto,
  IncomeStatementDto,
  BalanceSheetDto,
  CashBankReportDto,
  ExpenseReportDto,
  SalesGroupReportDto,
  SalesReportDto,
  NotificationPrefsDto,
  PeriodDto,
  PublicCurrenciesDto,
  ReceiptDto,
  TrialBalanceDto,
  VoucherCounts,
  VoucherDto,
  VoucherListItem,
  AdminBookingDetailDto,
  AdminBookingListItem,
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
  BookingDetailDto,
  BookingListItem,
  BookingStatusCounts,
  CompanyInfoDto,
  GroupDetailDto,
  GroupFilters,
  GroupListItem,
  InvoiceDetailDto,
  InvoiceListItem,
  MessageResponse,
  NotificationDto,
  Paginated,
  PartnerAccountDto,
  PartnerDashboardDto,
  PartnerInviteDto,
  PartnerSession,
  PassportScanDto,
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
  OpeningBalanceSetInput,
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
  AddPassengersInput,
  CreateBookingInput,
  CreditLimitInput,
  PassportScanInput,
  GroupSearchInput,
  InviteMemberInput,
  LedgerAdjustmentInput,
  PartnerRegisterInput,
  PartnerReviewInput,
  PricingRuleInput,
  PricingSimulateInput,
  RecordPaymentInput,
  ResetPasswordInput,
  SettingsInput,
  StaffInviteInput,
  SubmitPaymentInput,
  UpdateAccountProfileInput,
  UpdateMyProfileInput,
} from '@gnk/validation';
import type { HttpClient } from './http';

type Page = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  type?: string;
  balance?: string;
};
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
  currencies: () => http.get<PublicCurrenciesDto>('public/currencies'),
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
    addPassengers: (id: string, dto: AddPassengersInput) =>
      http.post<BookingDetailDto>(`partner/bookings/${id}/passengers`, dto),
    scanPassport: (dto: PassportScanInput) =>
      http.post<PassportScanDto>('partner/bookings/scan-passport', dto),
    cancel: (id: string, reason: string) =>
      http.post<BookingDetailDto>(`partner/bookings/${id}/cancel`, { reason }),
  },
  invoices: {
    list: () => http.get<InvoiceListItem[]>('partner/invoices'),
    get: (id: string) => http.get<InvoiceDetailDto>(`partner/invoices/${id}`),
  },
  payments: {
    list: () => http.get<PaymentDto[]>('partner/payments'),
    submit: (dto: SubmitPaymentInput) => http.post<PaymentDto>('partner/payments', dto),
    receipt: (id: string) => http.get<ReceiptDto>(`partner/payments/${id}/receipt`),
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
    setPreferences: (dto: Partial<NotificationPrefsDto>) =>
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
    setNotes: (id: string, internalNotes: string) =>
      http.patch<AdminBookingDetailDto>(`admin/bookings/${id}/notes`, { internalNotes }),
    assign: (id: string, staffId: string | null) =>
      http.patch<AdminBookingDetailDto>(`admin/bookings/${id}/assign`, { staffId }),
    revealPassport: (passengerId: string) =>
      http.post<{ passportNumber: string }>(`admin/bookings/passengers/${passengerId}/reveal`),
  },
  invoices: { get: (id: string) => http.get<InvoiceDetailDto>(`admin/invoices/${id}`) },
  payments: {
    list: (q: Page & { status?: string; accountId?: string }) =>
      http.get<Paginated<AdminPaymentListItem>>('admin/payments', q),
    counts: () => http.get<Record<string, number>>('admin/payments/counts'),
    get: (id: string) => http.get<AdminPaymentListItem>(`admin/payments/${id}`),
    receipt: (id: string) => http.get<ReceiptDto>(`admin/payments/${id}/receipt`),
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
    deleteAccount: (id: string) => http.delete<void>(`admin/accounting/accounts/${id}`),
    setOpeningBalance: (id: string, dto: OpeningBalanceSetInput) =>
      http.post<ChartAccountDto>(`admin/accounting/accounts/${id}/opening-balance`, dto),
    vouchers: (q: VoucherListInput) =>
      http.get<Paginated<VoucherListItem>>('admin/accounting/vouchers', q as never),
    voucherCounts: (type?: VoucherListInput['type']) =>
      http.get<VoucherCounts>('admin/accounting/vouchers/counts', type ? { type } : undefined),
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
    balanceSheet: (asOf?: string) =>
      http.get<BalanceSheetDto>('admin/accounting/reports/balance-sheet', { asOf }),
    sales: (q: Range) => http.get<SalesReportDto>('admin/accounting/reports/sales', q),
    commission: (q: Range) =>
      http.get<SalesGroupReportDto>('admin/accounting/reports/commission', q),
    salesByPartner: (q: Range) =>
      http.get<SalesGroupReportDto>('admin/accounting/reports/sales-by-partner', q),
    salesBySupplier: (q: Range) =>
      http.get<SalesGroupReportDto>('admin/accounting/reports/sales-by-supplier', q),
    expenses: (q: Range) => http.get<ExpenseReportDto>('admin/accounting/reports/expenses', q),
    cashBank: (q: Range) => http.get<CashBankReportDto>('admin/accounting/reports/cash-bank', q),
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
    setPreferences: (dto: Partial<NotificationPrefsDto>) =>
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
