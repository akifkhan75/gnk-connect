import {
  AdminBookingsController,
  AdminInvoicesController,
  PartnerBookingsController,
  PartnerInvoicesController,
} from './bookings/bookings.controller';
import {
  AdminCatalogController,
  PartnerGroupsController,
  PublicGroupsController,
} from './catalog/catalog.controller';
import { PartnerFilesController, AdminFilesController } from './files/files.controller';
import {
  PartnerNotificationsController,
  AdminNotificationsController,
} from './notifications/notifications.controller';
import { PartnerPaymentsController, AdminPaymentsController } from './payments/payments.controller';
import { PartnerQuotesController, AdminPricingController } from './pricing/pricing.controller';
import { PartnerLedgerController, AdminLedgerController } from './ledger/ledger.controller';
import { AdminAccountingController } from './ledger/accounting.controller';
import {
  PartnerAccountController,
  PartnerTeamController,
  AdminPartnersController,
} from './partners/partners.controller';
import {
  AdminSettingsController,
  PartnerPaymentInstructionsController,
} from './settings/settings.controller';
import { AdminSuppliersController } from './suppliers/suppliers.controller';
import {
  AdminStaffController,
  AdminRolesController,
  AdminAuditController,
} from './staff/staff.controller';
import { PartnerEventsController, AdminEventsController } from './realtime/realtime.controller';
import { PartnerAuthController } from './auth/partner-auth.controller';
import { StaffAuthController } from './auth/staff-auth.controller';
import {
  AdminDashboardController,
  PartnerDashboardController,
} from './dashboard/dashboard.controller';
import { meta, mockPrisma, partner, resStub, staff } from '../test/helpers';

const fn = () => jest.fn().mockResolvedValue({ ok: true });
const file = {
  buffer: Buffer.from('x'),
  originalname: 'a.pdf',
  mimetype: 'application/pdf',
  size: 1,
};

describe('controllers delegate to services', () => {
  it('bookings', async () => {
    const bookings = {
      partnerList: fn(),
      partnerCounts: fn(),
      partnerGet: fn(),
      create: fn(),
      partnerCancel: fn(),
      partnerInvoices: fn(),
      invoice: fn(),
      adminList: fn(),
      adminCounts: fn(),
      adminGet: fn(),
      approve: fn(),
      reject: fn(),
      push: fn(),
      syncStatus: fn(),
      cancel: fn(),
      complete: fn(),
      assign: fn(),
      setNotes: fn(),
      revealPassport: fn(),
      addPassengers: fn(),
      updatePassengers: fn(),
      adminAddPassengers: fn(),
      adminUpdatePassengers: fn(),
      requestConcession: fn(),
      cancelConcession: fn(),
      reviewConcession: fn(),
      setConcessionPnr: fn(),
      grantConcession: fn(),
      extendHold: fn(),
      adminConcessionList: fn(),
    };
    const p = new PartnerBookingsController(bookings as never, { get: fn() } as never);
    await p.list(partner(), { page: 1, pageSize: 25, tab: 'all' } as never);
    await p.counts(partner());
    await p.get(partner(), 'id');
    await p.create(partner(), { quoteId: 'q', passengers: [] } as never, 'key', meta);
    await p.addPassengers(partner(), 'id', { passengers: [] } as never, meta);
    await p.updatePassengers(partner(), 'id', { passengers: [] } as never, meta);
    await p.requestConcession(
      partner(),
      'id',
      { type: 'DISCOUNT', adultAmount: 1000 } as never,
      meta,
    );
    await p.cancelConcession(partner(), 'id', 'c1', meta);
    await p.cancel(partner(), 'id', { reason: 'x' } as never, meta);
    const inv = new PartnerInvoicesController(bookings as never);
    await inv.list(partner());
    await inv.get(partner(), 'id');
    const a = new AdminBookingsController(bookings as never, { get: fn() } as never);
    await a.list(staff(), { page: 1, pageSize: 25, tab: 'all' } as never);
    await a.counts();
    await a.listConcessions({ page: 1, pageSize: 25, status: 'PENDING' } as never);
    await a.get(staff(), 'id');
    await a.approve(staff(), 'id', { note: 'ok' } as never, meta);
    await a.reject(staff(), 'id', { reason: 'no' } as never, meta);
    await a.push(staff(), 'id', meta);
    await a.sync(staff(), 'id');
    await a.cancel(staff(), 'id', { reason: 'x' } as never, meta);
    await a.complete(staff(), 'id');
    await a.assign(staff(), 'id', { staffId: null } as never, meta);
    await a.reviewConcession(staff(), 'id', 'c1', { decision: 'GRANT' } as never, meta);
    await a.setConcessionPnr(staff(), 'id', 'c1', { pnr: 'ABC123' } as never, meta);
    await a.grantConcession(staff(), 'id', { type: 'CHILD_SEATS', seats: 1 } as never, meta);
    await a.extendHold(staff(), 'id', { holdExpiresAt: '2026-10-10T12:00:00.000Z' } as never, meta);
    await a.addPassengers(staff(), 'id', { passengers: [] } as never, meta);
    await a.updatePassengers(staff(), 'id', { passengers: [] } as never, meta);
    await a.notes(staff(), 'id', { internalNotes: 'n' } as never);
    await a.reveal(staff(), 'px', meta);
    await new AdminInvoicesController(bookings as never).get('id');
  });

  it('catalog, files, notifications, payments, pricing', async () => {
    const catalog = {
      search: fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 }),
      filters: fn(),
      detail: fn(),
      adminList: fn(),
      adminOptions: fn(),
      adminDetail: fn(),
      setVisibility: fn().mockResolvedValue({ isPublished: true, isFeatured: false }),
    };
    await new PartnerGroupsController(catalog as never).search(partner(), {} as never);
    await new PartnerGroupsController(catalog as never).filters();
    await new PartnerGroupsController(catalog as never).detail(partner(), 'p');
    await new PublicGroupsController(catalog as never).list({ page: 1, pageSize: 25 } as never);
    const adminCatalog = new AdminCatalogController(catalog as never, { log: fn() } as never);
    await adminCatalog.list(staff(), {} as never);
    await adminCatalog.options();
    await adminCatalog.detail(staff(), 'p');
    await adminCatalog.visibility(
      staff(),
      'p',
      { isPublished: true, isFeatured: false } as never,
      meta,
    );

    const files = {
      uploadForPartner: fn(),
      streamForPartner: fn(),
      uploadForStaff: fn(),
      streamForStaff: fn(),
    };
    const res = resStub();
    await new PartnerFilesController(files as never).upload(
      partner(),
      file as never,
      'PAYMENT_PROOF',
    );
    await new PartnerFilesController(files as never).download(partner(), 'f', res as never);
    await new AdminFilesController(files as never).upload(
      staff(),
      file as never,
      undefined,
      'PAYMENT_PROOF',
    );
    await new AdminFilesController(files as never).download(staff(), 'f', res as never);

    const n = { list: fn(), getPrefs: fn(), setPrefs: fn(), markRead: fn() };
    const pn = new PartnerNotificationsController(n as never);
    await pn.list(partner(), '1');
    await pn.preferences(partner());
    await pn.setPreferences(partner(), {} as never);
    await pn.readAll(partner());
    await pn.read(partner(), 'n1');
    const an = new AdminNotificationsController(n as never);
    await an.list(staff());
    await an.preferences(staff());
    await an.setPreferences(staff(), {} as never);
    await an.readAll(staff());
    await an.read(staff(), 'n1');

    const pay = {
      partnerList: fn(),
      receipt: fn(),
      submit: fn(),
      adminList: fn(),
      adminCounts: fn(),
      adminGet: fn(),
      record: fn(),
      verify: fn(),
      reject: fn(),
    };
    const pp = new PartnerPaymentsController(pay as never);
    await pp.list(partner());
    await pp.receipt(partner(), 'p');
    await pp.submit(partner(), {} as never, meta);
    const ap = new AdminPaymentsController(pay as never);
    await ap.list({} as never);
    await ap.counts();
    await ap.get('p');
    await ap.receipt('p');
    await ap.record(staff(), {} as never, meta);
    await ap.verify(staff(), 'p', {} as never, meta);
    await ap.reject(staff(), 'p', { reason: 'x' } as never, meta);

    const pricing = {
      createQuote: fn(),
      getQuote: fn(),
      listRules: fn(),
      createRule: fn().mockResolvedValue({ id: 'r1' }),
      getRule: fn().mockResolvedValue({ id: 'r1' }),
      updateRule: fn().mockResolvedValue({ id: 'r1' }),
      deleteRule: fn(),
      simulate: fn(),
      listTiers: fn(),
      createTier: fn().mockResolvedValue({ id: 't1' }),
      deleteTier: fn(),
    };
    await new PartnerQuotesController(pricing as never).create(partner(), {
      departureId: 'd',
      seats: 1,
    } as never);
    await new PartnerQuotesController(pricing as never).get(partner(), 'q');
    const pr = new AdminPricingController(pricing as never, { log: fn() } as never);
    await pr.rules();
    await pr.create(staff(), {} as never, meta);
    await pr.update(staff(), 'id', {} as never, meta);
    await pr.remove(staff(), 'id', meta);
    await pr.simulate({} as never);
    await pr.tiers();
    await pr.createTier(staff(), { name: 'A', description: null } as never, meta);
    await pr.deleteTier(staff(), 't', meta);
  });

  it('ledger, accounting, partners, settings, suppliers, staff, realtime, auth', async () => {
    const ledger = {
      balance: fn().mockResolvedValue({ balance: 0, availableFunds: 0 }),
      statement: fn(),
      adjust: fn().mockResolvedValue({ reference: 'ADJ-1' }),
      balances: fn().mockResolvedValue(new Map()),
    };
    await new PartnerLedgerController(ledger as never).balance(partner());
    await new PartnerLedgerController(ledger as never).statement(partner(), {} as never);
    const prisma = mockPrisma();
    prisma.partnerAccount.findMany.mockResolvedValue([]);
    const adminLedger = new AdminLedgerController(
      ledger as never,
      prisma as never,
      { log: fn() } as never,
    );
    await adminLedger.accounts({ page: 1, pageSize: 25 } as never);
    await adminLedger.statement('acc', {} as never);
    await adminLedger.adjust(
      staff(),
      'acc',
      { direction: 'CREDIT', amount: 1, description: 'x' } as never,
      meta,
    );

    const chart = {
      list: fn(),
      options: fn(),
      balance: fn(),
      create: fn().mockResolvedValue({ id: 'a1' }),
      get: fn(),
      update: fn(),
      remove: fn(),
      setOpening: fn(),
    };
    const vouchers = {
      list: fn(),
      counts: fn(),
      get: fn(),
      create: fn(),
      update: fn(),
      submit: fn(),
      post: fn(),
      approve: fn(),
      reject: fn(),
      reverse: fn(),
      remove: fn(),
    };
    const reports = {
      accountLedger: fn(),
      trialBalance: fn(),
      incomeStatement: fn(),
      balanceSheet: fn(),
      sales: fn(),
      commission: fn(),
      salesByPartner: fn(),
      salesBySupplier: fn(),
      expenses: fn(),
      cashBank: fn(),
    };
    const currencies = {
      currencies: fn(),
      saveCurrency: fn().mockResolvedValue({ code: 'USD' }),
      rates: fn(),
      addRate: fn().mockResolvedValue({ id: 'r' }),
      periods: fn(),
      closePeriod: fn().mockResolvedValue({ month: '2026-01' }),
      reopenPeriod: fn().mockResolvedValue({ month: '2026-01' }),
    };
    const accounting = new AdminAccountingController(
      chart as never,
      vouchers as never,
      reports as never,
      currencies as never,
      { log: fn() } as never,
    );
    await accounting.accounts({} as never);
    await accounting.options();
    await accounting.balance('id');
    await accounting.accountLedger('id', {} as never);
    await accounting.createAccount(staff(), {} as never, meta);
    await accounting.updateAccount(staff(), 'id', {} as never, meta);
    await accounting.setOpeningBalance(staff(), 'id', { amount: 100 } as never, meta);
    await accounting.deleteAccount(staff(), 'id', meta);
    await accounting.list({} as never);
    await accounting.counts();
    await accounting.get(staff(), 'id');
    await accounting.create(staff(), { action: 'draft' } as never, meta);
    await accounting.update(staff(), 'id', {} as never, meta);
    await accounting.submit(staff(), 'id', meta);
    await accounting.post(staff(), 'id', meta);
    await accounting.approve(staff(), 'id', {} as never, meta);
    await accounting.reject(staff(), 'id', { reason: 'x' } as never, meta);
    await accounting.reverse(staff(), 'id', {} as never, meta);
    await accounting.remove(staff(), 'id', meta);
    await accounting.trialBalance({} as never);
    await accounting.incomeStatement({} as never);
    await accounting.balanceSheet({} as never);
    await accounting.sales(staff(), {} as never);
    await accounting.commission(staff(), {} as never);
    await accounting.salesByPartner(staff(), {} as never);
    await accounting.salesBySupplier(staff(), {} as never);
    await accounting.expenses({} as never);
    await accounting.cashBank({} as never);
    await accounting.currencyList();
    await accounting.saveCurrency(staff(), { code: 'USD' } as never, meta);
    await accounting.rates();
    await accounting.addRate(staff(), { currency: 'USD' } as never, meta);
    await accounting.periods();
    await accounting.close(staff(), { month: '2026-01' } as never, meta);
    await accounting.reopen(staff(), { month: '2026-01' } as never, meta);

    const partners = {
      getAccount: fn(),
      updateProfile: fn(),
      addDocument: fn(),
      removeDocument: fn(),
      submit: fn(),
      getTeam: fn(),
      invite: fn(),
      revokeInvite: fn(),
      updateRole: fn(),
      removeMember: fn(),
      adminList: fn(),
      adminCounts: fn(),
      adminDetail: fn(),
      review: fn(),
      setCredit: fn(),
      reviewDocument: fn(),
    };
    const users = {
      addMember: fn(),
      setMemberStatus: fn(),
      adminList: fn(),
      adminCreate: fn(),
      adminUpdate: fn(),
      adminResetPassword: fn(),
      adminRevokeInvite: fn(),
    };
    await new PartnerAccountController(partners as never).get(partner());
    await new PartnerAccountController(partners as never).update(partner(), {} as never, meta);
    await new PartnerAccountController(partners as never).addDocument(partner(), {
      type: 'DTS_LICENSE',
      fileId: 'f',
    } as never);
    await new PartnerAccountController(partners as never).removeDocument(partner(), 'd');
    await new PartnerAccountController(partners as never).submit(partner(), meta);
    const team = new PartnerTeamController(partners as never, users as never);
    await team.addMember(partner(), {} as never, meta);
    await team.setStatus(partner(), 'u', { status: 'ACTIVE' } as never, meta);
    await team.get(partner());
    await team.invite(partner(), { email: 'a@b.c', role: 'STAFF' } as never, meta);
    await team.revokeInvite(partner(), 'i');
    await team.updateRole(partner(), 'u', { role: 'STAFF' } as never, meta);
    await team.remove(partner(), 'u', meta);
    const ap = new AdminPartnersController(partners as never, users as never);
    await ap.listUsers('acc');
    await ap.createUser(staff(), 'acc', {} as never, meta);
    await ap.updateUser(staff(), 'acc', 'u', {} as never, meta);
    await ap.resetUserPassword(staff(), 'acc', 'u', {} as never, meta);
    await ap.revokeInvite(staff(), 'acc', 'i', meta);
    await ap.list({} as never);
    await ap.counts();
    await ap.detail(staff(), 'acc');
    await ap.review(staff(), 'acc', { action: 'APPROVE', note: 'ok' } as never, meta);
    await ap.credit(staff(), 'acc', { creditLimit: 1, pricingTierId: null } as never, meta);
    await ap.reviewDocument(staff(), 'd', { status: 'VERIFIED', note: null } as never, meta);

    const settings = {
      get: fn().mockResolvedValue({
        bankAccounts: [],
        booking: { paymentTermsNote: 'n' },
        company: {},
      }),
      update: fn().mockResolvedValue({}),
    };
    await new AdminSettingsController(settings as never, { log: fn() } as never).get();
    await new AdminSettingsController(settings as never, { log: fn() } as never).update(
      staff(),
      {} as never,
      meta,
    );
    await new PartnerPaymentInstructionsController(settings as never).get();

    const supplierPrisma = mockPrisma();
    supplierPrisma.supplier.findMany.mockResolvedValue([]);
    supplierPrisma.supplier.findUniqueOrThrow.mockResolvedValue({ id: 's', status: 'ACTIVE' });
    supplierPrisma.supplierCallLog.findMany.mockResolvedValue([]);
    const sc = new AdminSuppliersController(
      supplierPrisma as never,
      { sync: fn().mockResolvedValue({ products: 0 }) } as never,
      { mode: () => 'mock' } as never,
      { log: fn() } as never,
    );
    await sc.list();
    await sc.runSync(staff(), 's', meta);
    await sc.setStatus(staff(), 's', { status: 'ACTIVE' } as never, meta);
    await sc.calls('s', { page: 1, pageSize: 25 } as never);

    const staffSvc = {
      list: fn(),
      create: fn(),
      resendInvite: fn(),
      resetPassword: fn(),
      update: fn(),
      roles: fn(),
      createRole: fn(),
      updateRole: fn(),
      deleteRole: fn(),
    };
    const st = new AdminStaffController(staffSvc as never);
    await st.list(staff());
    await st.create(staff(), {} as never, meta);
    await st.resend('id');
    await st.resetPassword(staff(), 'id', {} as never, meta);
    await st.update(staff(), 'id', {} as never, meta);
    const roles = new AdminRolesController(staffSvc as never);
    await roles.list();
    await roles.create(staff(), {} as never, meta);
    await roles.update(staff(), 'r', {} as never, meta);
    await roles.remove(staff(), 'r', meta);

    const auditPrisma = mockPrisma();
    auditPrisma.auditLog.findMany.mockResolvedValue([]);
    auditPrisma.partnerUser.findMany.mockResolvedValue([]);
    auditPrisma.staffUser.findMany.mockResolvedValue([]);
    await new AdminAuditController(auditPrisma as never).list({ page: 1, pageSize: 25 } as never);

    const realtime = { open: jest.fn() };
    new PartnerEventsController(realtime as never).stream(partner(), resStub() as never);
    new AdminEventsController(realtime as never).stream(staff(), resStub() as never);

    const sessionDto = { account: { accountId: 'acc-1' } };
    const partnerAuth = {
      register: fn(),
      login: fn(),
      verifyEmail: fn(),
      forgotPassword: fn(),
      resetPassword: fn(),
      lookupInvite: fn(),
      acceptInvite: fn(),
      buildSession: fn().mockResolvedValue(sessionDto),
      updateMe: fn(),
      resendVerification: fn(),
      changePassword: fn(),
      setInitialPassword: fn(),
      setTheme: fn(),
    };
    const sessions = {
      refresh: fn().mockResolvedValue({
        userId: 'pu-1',
        tokens: { accessToken: 't', expiresIn: 1, sessionId: 's' },
      }),
      logout: fn(),
      list: fn(),
      revokeOne: fn(),
      revokeAllForUser: fn(),
      reissueAccess: jest.fn().mockReturnValue({ accessToken: 't2', expiresIn: 1, sessionId: 's' }),
    };
    const pa = new PartnerAuthController(partnerAuth as never, sessions as never);
    const req = { cookies: {}, headers: {}, ip: '1' };
    const res = resStub();
    await pa.register({} as never, meta);
    await pa.login({ email: 'a', password: 'b' } as never, meta, res as never);
    await pa.refresh(req as never, res as never, {} as never);
    await pa.logout(req as never, res as never);
    await pa.verifyEmail({ token: 't' });
    await pa.forgot({ email: 'a' });
    await pa.reset({} as never, meta);
    await pa.lookupInvite('t');
    await pa.acceptInvite(
      { token: 'tokentokentokentoken12', password: 'long-password', fullName: 'Ali Khan' },
      meta,
      res as never,
    );
    await pa.me(partner());
    await pa.updateMe(partner(), {} as never);
    await pa.switchAccount(partner(), { accountId: 'acc-1' });
    await pa.resend(partner());
    await pa.changePassword(partner(), {} as never, meta);
    await pa.setPassword(partner(), {} as never, meta);
    await pa.preferences(partner(), { theme: 'dark' } as never);
    await pa.listSessions(partner());
    await pa.revokeSession(partner(), 's');
    await pa.logoutAll(partner(), res as never, req as never);

    const staffAuth = {
      login: fn(),
      forgotPassword: fn(),
      resetPassword: fn(),
      lookupInvite: fn(),
      acceptInvite: fn(),
      buildSession: fn().mockResolvedValue({ userId: 'su-1' }),
      changePassword: fn(),
      setInitialPassword: fn(),
      setTheme: fn(),
    };
    const sa = new StaffAuthController(staffAuth as never, sessions as never);
    await sa.login({ email: 'a', password: 'b' } as never, meta, res as never);
    await sa.refresh(req as never, res as never);
    await sa.logout(req as never, res as never);
    await sa.forgot({ email: 'a' });
    await sa.reset({} as never, meta);
    await sa.lookupInvite('t');
    await sa.acceptInvite({} as never, meta, res as never);
    await sa.me(staff());
    await sa.changePassword(staff(), {} as never, meta);
    await sa.setPassword(staff(), {} as never, meta);
    await sa.preferences(staff(), { theme: 'light' } as never);
    await sa.listSessions(staff());
    await sa.revokeSession(staff(), 's');
    await sa.logoutAll(staff(), res as never, req as never);
  });

  it('dashboards', async () => {
    const prisma = mockPrisma();
    prisma.booking.count.mockResolvedValue(0);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.payment.count.mockResolvedValue(0);
    prisma.booking.aggregate.mockResolvedValue({ _count: 0, _sum: { totalPrice: 0 } });
    prisma.booking.groupBy.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.departure.findMany.mockResolvedValue([]);
    prisma.supplier.findFirst.mockResolvedValue({
      id: 's1',
      name: 'AirDesk',
      lastSyncAt: new Date(),
      lastSyncStatus: 'OK',
    });
    prisma.supplierCallLog.count.mockResolvedValue(0);
    prisma.partnerAccount.findMany.mockResolvedValue([]);
    const bookings = {
      partnerCounts: fn().mockResolvedValue({
        PENDING_APPROVAL: 0,
        APPROVED: 0,
        CONFIRMED: 0,
        all: 0,
      }),
      userNames: fn().mockResolvedValue(new Map()),
    };
    const mapper = { toListItem: jest.fn().mockReturnValue({}) };
    await new PartnerDashboardController(
      prisma as never,
      { balance: fn().mockResolvedValue({ availableFunds: 10, balance: 0 }) } as never,
      { search: fn().mockResolvedValue({ items: [] }) } as never,
      bookings as never,
      mapper as never,
    ).get(partner());
    const admin = new AdminDashboardController(prisma as never);
    await admin.queues(staff());
    await admin.dashboard(staff());
  });
});
