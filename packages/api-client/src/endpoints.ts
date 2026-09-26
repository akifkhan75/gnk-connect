import type {
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
  AcceptInviteInput,
  AdminBookingListInput,
  BookingListInput,
  ChangePasswordInput,
  CreateBookingInput,
  CreditLimitInput,
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

type Page = { page?: number; pageSize?: number; q?: string };
type ThemeBody = { theme: 'LIGHT' | 'DARK' | 'SYSTEM' };
export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
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
    revealPassport: (passengerId: string) =>
      http.post<{ passportNumber: string }>(`admin/bookings/passengers/${passengerId}/reveal`),
  },
  invoices: { get: (id: string) => http.get<InvoiceDetailDto>(`admin/invoices/${id}`) },
  payments: {
    list: (q: Page & { status?: string; accountId?: string }) =>
      http.get<Paginated<AdminPaymentListItem>>('admin/payments', q),
    counts: () => http.get<Record<string, number>>('admin/payments/counts'),
    verify: (id: string) => http.post<AdminPaymentListItem>(`admin/payments/${id}/verify`),
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
    update: (id: string, dto: { roles?: string[]; status?: 'ACTIVE' | 'DISABLED' }) =>
      http.patch<StaffUserDto>(`admin/staff/${id}`, dto),
    resendInvite: (id: string) => http.post<void>(`admin/staff/${id}/resend-invite`),
    roles: () => http.get<RoleDto[]>('admin/roles'),
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
  },
  files: { blob: (id: string) => http.blob(`admin/files/${id}`) },
});

export type PartnerApi = ReturnType<typeof partnerApi>;
export type AdminApi = ReturnType<typeof adminApi>;
