import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CatalogService } from './catalog/catalog.service';
import { departureStatus, importSupplierProducts } from './catalog/catalog-import';
import { NotificationsService } from './notifications/notifications.service';
import { FilesService } from './files/files.service';
import { SettingsService } from './settings/settings.service';
import { PricingService, seatsLeft } from './pricing/pricing.service';
import { SupplierGatewayService } from './suppliers/supplier-gateway.service';
import { SupplierSyncService } from './suppliers/supplier-sync.service';
import { PartnersService } from './partners/partners.service';
import { StaffService } from './staff/staff.service';
import { PermissionsSyncService } from './staff/permissions-sync.service';
import { RealtimeService } from './realtime/realtime.service';
import {
  PartnerDashboardController,
  AdminDashboardController,
} from './dashboard/dashboard.controller';
import { PublicController } from './public/public.controller';
import { AuthCacheService } from './auth/auth-cache.service';
import { SupplierError } from '@gnk/suppliers';
import { meta, mockPrisma, partner, resStub, staff } from '../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

describe('catalog-import', () => {
  it('classifies departure status', () => {
    expect(departureStatus({ availableSeats: 0, totalSeats: 20 })).toBe('SOLD_OUT');
    expect(departureStatus({ availableSeats: 3, totalSeats: 20 })).toBe('FILLING_FAST');
    expect(departureStatus({ availableSeats: 15, totalSeats: 20 })).toBe('OPEN');
  });

  it('upserts products and closes missing departures', async () => {
    const prisma = mockPrisma();
    prisma.product.upsert.mockResolvedValue({ id: 'p1' });
    prisma.departure.upsert.mockResolvedValue({ id: 'd1' });
    const result = await importSupplierProducts(prisma as never, 's1', [
      {
        supplierProductId: 'AD-1',
        type: 'GROUP',
        title: 'LHE-JED',
        sector: 'LHE-JED',
        airline: 'SV',
        destination: 'Jeddah',
        country: 'SA',
        durationDays: 14,
        content: { overview: '', inclusions: [], exclusions: [], itinerary: [] },
        departures: [
          {
            supplierDepartureId: 'dep-1',
            departureDate: '2026-11-01',
            returnDate: '2026-11-14',
            totalSeats: 20,
            availableSeats: 10,
            netFare: 100000,
            baggage: '23kg',
          },
        ],
      },
    ]);
    expect(result.products).toBe(1);
    expect(result.departures).toBe(1);
    expect(prisma.departure.updateMany).toHaveBeenCalled();
    expect(prisma.product.updateMany).toHaveBeenCalled();
  });
});

describe('CatalogService', () => {
  const prisma = mockPrisma();
  const pricing = {
    priceMany: jest
      .fn()
      .mockResolvedValue(new Map([['d1', { calculatedSellingPricePKR: 195000 }]])),
  };
  const catalog = new CatalogService(prisma as never, pricing as never);
  const departure = {
    id: 'd1',
    productId: 'p1',
    departureDate: new Date('2026-11-01'),
    returnDate: new Date('2026-11-21'),
    supplierAvailable: 10,
    heldSeats: 1,
    baggage: '23',
    status: 'OPEN',
    product: {
      id: 'p1',
      type: 'GROUP',
      title: 'LHE-JED',
      sector: 'LHE-JED',
      airline: 'SV',
      destination: 'Jeddah',
      country: 'SA',
      durationDays: 21,
      isPublished: true,
      deletedAt: null,
      content: { outbound: null, inbound: null },
    },
  };

  it('searches, filters and details groups', async () => {
    prisma.departure.findMany.mockResolvedValue([departure]);
    prisma.partnerAccount.findUniqueOrThrow.mockResolvedValue({ id: 'acc-1', pricingTierId: null });
    const page = await catalog.search(partner(), {
      page: 1,
      pageSize: 10,
      sort: 'price',
    } as never);
    expect(page.items[0].price).toBe(195000);

    prisma.product.findMany.mockResolvedValue([
      { sector: 'LHE-JED', airline: 'SV', type: 'GROUP' },
    ]);
    expect(await catalog.filters()).toEqual({
      sectors: ['LHE-JED'],
      airlines: ['SV'],
      types: ['GROUP'],
    });

    prisma.product.findFirst.mockResolvedValue({
      ...departure.product,
      departures: [departure],
    });
    const detail = await catalog.detail(partner(), 'p1');
    expect(detail.departures[0].price).toBe(195000);

    prisma.product.findFirst.mockResolvedValue(null);
    await expect(catalog.detail(null, 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists admin products, details, visibility, and options', async () => {
    const product = {
      ...departure.product,
      supplier: { name: 'AirDesk' },
      departures: [departure],
      isFeatured: false,
      syncedAt: new Date(),
    };
    prisma.product.findMany.mockResolvedValue([product]);
    prisma.product.count.mockResolvedValue(1);
    const list = await catalog.adminList(staff(), {
      page: 1,
      pageSize: 25,
      type: 'all',
      published: 'all',
    });
    expect(list.total).toBe(1);
    prisma.product.findUnique.mockResolvedValue(product);
    await catalog.adminDetail(staff(), 'p1');
    await catalog.setVisibility('p1', { isPublished: true });
    prisma.partnerAccount.findMany.mockResolvedValue([]);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.supplier.findMany.mockResolvedValue([]);
    prisma.departure.findMany.mockResolvedValue([]);
    const options = await catalog.adminOptions();
    expect(options.partners).toEqual([]);
  });
});

describe('NotificationsService', () => {
  const prisma = mockPrisma();
  const mailer = { notification: jest.fn().mockResolvedValue(undefined) };
  const realtime = { publish: jest.fn() };
  const svc = new NotificationsService(prisma as never, mailer as never, realtime as never);

  it('notifies accounts and lists/marks/prefs', async () => {
    prisma.partnerMember.findMany.mockResolvedValue([
      { userId: 'pu-1', user: { email: 'a@b.c', notificationPrefs: {} } },
    ]);
    await svc.notifyAccount('acc-1', {
      type: 'BOOKING_APPROVED',
      title: 't',
      body: 'b',
      email: true,
    });
    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(mailer.notification).toHaveBeenCalled();

    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'X',
        title: 't',
        body: 'b',
        link: null,
        readAt: null,
        createdAt: new Date(),
      },
    ]);
    prisma.notification.count.mockResolvedValue(1);
    const listed = await svc.list('PARTNER', 'pu-1');
    expect(listed.unread).toBe(1);
    await svc.markRead('PARTNER', 'pu-1');

    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue({ notificationPrefs: {} });
    prisma.partnerUser.update.mockResolvedValue({});
    const prefs = await svc.setPrefs('PARTNER', 'pu-1', { bookings: { email: false } } as never);
    expect(prefs.bookings.email).toBe(false);
  });
});

describe('FilesService', () => {
  const prisma = mockPrisma();
  const storage = {
    save: jest.fn().mockResolvedValue({
      bucketKey: 'k',
      mimeType: 'application/pdf',
      sizeBytes: 10,
      sha256: 'x',
      originalName: 'a.pdf',
    }),
    stream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
  };
  const svc = new FilesService(prisma as never, storage as never);
  const file = {
    id: 'f1',
    accountId: 'acc-1',
    purpose: 'PAYMENT_PROOF',
    mimeType: 'application/pdf',
    sizeBytes: 10,
    originalName: 'a.pdf',
    bucketKey: 'k',
    createdAt: new Date(),
  };

  it('uploads and authorizes streams', async () => {
    prisma.storedFile.create.mockResolvedValue(file);
    await svc.uploadForPartner(partner(), 'PAYMENT_PROOF', {
      buffer: Buffer.from('%PDF'),
      originalname: 'a.pdf',
    });
    await svc.uploadForStaff(staff(), 'KYC', { buffer: Buffer.from('x'), originalname: 'a.pdf' });

    prisma.storedFile.findUnique.mockResolvedValue(file);
    const res = resStub();
    await svc.streamForPartner(partner(), 'f1', res as never);
    await expect(svc.streamForStaff(staff([]), 'f1', res as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await svc.streamForStaff(staff(), 'f1', res as never);
    await expect(svc.assertPartnerFile('other', 'f1', 'PAYMENT_PROOF')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('SettingsService', () => {
  it('merges defaults and upserts', async () => {
    const prisma = mockPrisma();
    prisma.setting.findMany.mockResolvedValue([{ key: 'company', value: { name: 'Custom' } }]);
    const svc = new SettingsService(prisma as never);
    const got = await svc.get();
    expect(got.company.name).toBe('Custom');
    prisma.setting.upsert.mockResolvedValue({});
    await svc.update(got as never, 'su-1');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe('PricingService', () => {
  const prisma = mockPrisma();
  const settings = { get: jest.fn().mockResolvedValue({ booking: { quoteTtlMinutes: 30 } }) };
  const svc = new PricingService(prisma as never, settings as never);

  it('prices many and creates quotes', async () => {
    expect(seatsLeft({ supplierAvailable: 10, heldSeats: 3 })).toBe(7);
    prisma.pricingRule.findMany.mockResolvedValue([]);
    const d = {
      id: 'd1',
      productId: 'p1',
      supplierNet: D(100000),
      supplierAvailable: 10,
      heldSeats: 0,
      status: 'OPEN',
      departureDate: new Date(Date.now() + 86400000),
      returnDate: null,
      baggage: '23',
      product: {
        id: 'p1',
        isPublished: true,
        deletedAt: null,
        type: 'GROUP',
        supplierId: 's1',
        title: 't',
        sector: 'LHE-JED',
        airline: 'SV',
      },
    };
    const prices = await svc.priceMany([d as never], { id: 'acc-1', pricingTierId: null });
    expect(prices.get('d1')?.calculatedSellingPricePKR).toBe(100000);

    prisma.departure.findUnique.mockResolvedValue(d);
    prisma.partnerAccount.findUniqueOrThrow.mockResolvedValue({ id: 'acc-1', pricingTierId: null });
    prisma.priceQuote.create.mockResolvedValue({
      id: 'q1',
      departureId: 'd1',
      seats: 2,
      unitPrice: D(100000),
      totalPrice: D(200000),
      expiresAt: new Date(),
    });
    const quote = await svc.createQuote(partner(), 'd1', 2);
    expect(quote.seats).toBe(2);

    prisma.priceQuote.findUnique.mockResolvedValue({
      id: 'q1',
      accountId: 'acc-1',
      departureId: 'd1',
    });
    prisma.departure.findUniqueOrThrow.mockResolvedValue(d);
    await expect(svc.getQuote(partner(), 'q1')).resolves.toMatchObject({ id: 'q1' });
  });
});

describe('SupplierGateway + sync', () => {
  it('logs successful and failed calls', async () => {
    const prisma = mockPrisma();
    prisma.supplier.findUnique.mockResolvedValue({ adapterKey: 'airdesk' });
    const gw = new SupplierGatewayService(prisma as never);
    expect(gw.mode()).toBe('mock');
    const out = await gw.call('s1', 'LIST', {}, async () => [{ id: 1 }]);
    expect(out).toEqual([{ id: 1 }]);
    await expect(
      gw.call('s1', 'CREATE', {}, async () => {
        throw new SupplierError('SOLD_OUT', 'full');
      }),
    ).rejects.toBeInstanceOf(SupplierError);
    prisma.supplier.findUnique.mockResolvedValue({ adapterKey: 'unknown' });
    await expect(gw.adapterFor('s1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('syncs inventory and refuses a concurrent run', async () => {
    const prisma = mockPrisma();
    const gateway = {
      call: jest.fn().mockResolvedValue([
        {
          supplierProductId: 'AD-1',
          type: 'GROUP',
          title: 't',
          sector: null,
          airline: null,
          destination: 'x',
          country: 'SA',
          durationDays: 1,
          content: { overview: '', inclusions: [], exclusions: [], itinerary: [] },
          departures: [],
        },
      ]),
    };
    const config = { get: () => 0 };
    const sync = new SupplierSyncService(prisma as never, gateway as never, config as never);
    prisma.product.upsert.mockResolvedValue({ id: 'p' });
    prisma.supplier.update.mockResolvedValue({});
    prisma.supplier.findMany.mockResolvedValue([{ id: 's1', code: 'AD' }]);
    await sync.sync('s1');
    (sync as any).running.add('s1');
    await expect(sync.sync('s1')).rejects.toBeInstanceOf(ConflictException);
    (sync as any).running.delete('s1');
    await sync.syncAll();
    sync.onApplicationBootstrap();
    sync.onModuleDestroy();
  });
});

describe('PartnersService', () => {
  const prisma = mockPrisma();
  const files = { assertPartnerFile: jest.fn() };
  const cache = new AuthCacheService();
  const notifications = { notifyStaff: jest.fn(), notifyAccount: jest.fn() };
  const svc = new PartnersService(
    prisma as never,
    { encrypt: jest.fn(), decrypt: jest.fn() } as never,
    { partnerInvite: jest.fn() } as never,
    { log: jest.fn() } as never,
    cache,
    { revokeAllForUser: jest.fn() } as never,
    files as never,
    {
      balance: jest.fn().mockResolvedValue({ balance: 0, creditLimit: 0, availableFunds: 0 }),
    } as never,
    notifications as never,
    { toListItem: jest.fn() } as never,
  );

  const account = {
    id: 'acc-1',
    code: 'AGT-1',
    type: 'AGENCY',
    status: 'DRAFT',
    legalName: 'Al Noor',
    tradeName: 'Al Noor',
    city: 'LHE',
    address: 'x',
    phone: '1',
    email: 'a@b.c',
    documents: [],
    members: [{ role: 'OWNER', user: { emailVerifiedAt: new Date() } }],
    dtsLicenseNo: null,
    iataCode: null,
    ntn: null,
    cnic: null,
    creditLimit: D(0),
    reviewNote: null,
    rejectionReason: null,
    suspendedReason: null,
    approvedAt: null,
    createdAt: new Date(),
  };

  it('loads, updates, and submits an account', async () => {
    prisma.partnerAccount.findUnique.mockResolvedValue(account);
    prisma.partnerAccount.findUniqueOrThrow.mockResolvedValue(account);
    await expect(svc.getAccount('acc-1')).resolves.toMatchObject({ code: 'AGT-1' });
    await svc.updateProfile(partner(), { city: 'ISB', address: 'y', phone: '2' }, meta);
    await expect(svc.submit(partner(), meta)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'DOCUMENTS_MISSING' }),
    });
  });
});

describe('Staff + permissions sync', () => {
  it('syncs the permission catalogue', async () => {
    const prisma = mockPrisma();
    const cache = new AuthCacheService();
    prisma.permission.upsert.mockResolvedValue({});
    prisma.permission.findMany.mockResolvedValue([{ key: 'dashboard:view', id: 'p1' }]);
    prisma.role.upsert.mockResolvedValue({ id: 'r1' });
    prisma.rolePermission.findMany.mockResolvedValue([]);
    const sync = new PermissionsSyncService(prisma as never, cache);
    await sync.sync();
    expect(prisma.permission.upsert).toHaveBeenCalled();
  });

  it('lists staff users', async () => {
    const prisma = mockPrisma();
    const svc = new StaffService(
      prisma as never,
      { staffInvite: jest.fn(), accountCreated: jest.fn() } as never,
      { log: jest.fn() } as never,
      new AuthCacheService(),
      { revokeAllForUser: jest.fn() } as never,
      { hash: jest.fn().mockResolvedValue('h') } as never,
    );
    prisma.staffUser.findMany.mockResolvedValue([
      {
        id: 'su-1',
        email: 'a@b.c',
        fullName: 'A',
        status: 'ACTIVE',
        mustChangePassword: false,
        lastLoginAt: null,
        createdAt: new Date(),
        roles: [{ role: { key: 'SUPER_ADMIN', name: 'Super', permissions: [] } }],
      },
    ]);
    const rows = await svc.list(staff());
    expect(rows[0].email).toBe('a@b.c');
  });
});

describe('RealtimeService', () => {
  it('publishes and opens an SSE stream', async () => {
    const redis = {
      publish: jest.fn().mockResolvedValue(1),
      duplicate: jest.fn().mockReturnValue({
        on: jest.fn(),
        connect: jest.fn(),
        subscribe: jest.fn(),
        quit: jest.fn(),
        isOpen: true,
      }),
    };
    const rt = new RealtimeService(redis as never);
    rt.publish({ topic: 'queues' }, { realm: 'STAFF' });
    expect(redis.publish).toHaveBeenCalled();
    const res = resStub();
    const handlers: Record<string, () => void> = {};
    res.on = jest.fn((ev: string, fn: () => void) => {
      handlers[ev] = fn;
    });
    rt.open(staff(), res as never);
    expect(rt.connectionCount).toBe(1);
    handlers.close?.();
    (rt as any).deliver(
      JSON.stringify({ audience: [{ realm: 'STAFF' }], event: { topic: 'queues' } }),
    );
    (rt as any).deliver('not-json');
    await rt.onModuleDestroy();
  });
});

describe('dashboards + public', () => {
  it('builds partner and admin dashboards', async () => {
    const prisma = mockPrisma();
    const partnerCtrl = new PartnerDashboardController(
      prisma as never,
      {
        balance: jest.fn().mockResolvedValue({ balance: -10, creditLimit: 0, availableFunds: 0 }),
      } as never,
      { search: jest.fn().mockResolvedValue({ items: [] }) } as never,
      {
        partnerCounts: jest.fn().mockResolvedValue({
          PENDING_APPROVAL: 1,
          APPROVED: 1,
          CONFIRMED: 0,
          all: 2,
        }),
        userNames: jest.fn().mockResolvedValue(new Map()),
      } as never,
      { toListItem: jest.fn().mockReturnValue({ id: 'b' }) } as never,
    );
    prisma.booking.count.mockResolvedValue(0);
    prisma.booking.findMany.mockResolvedValue([
      { id: 'b1', reference: 'GNK-1', totalPrice: D(999999) },
    ]);
    prisma.payment.count.mockResolvedValue(1);
    const dash = await partnerCtrl.get(partner());
    expect(dash.actions.length).toBeGreaterThan(0);

    const admin = new AdminDashboardController(prisma as never);
    prisma.partnerAccount.count.mockResolvedValue(2);
    prisma.booking.count.mockResolvedValue(3);
    prisma.payment.count.mockResolvedValue(1);
    prisma.ledgerTransaction.count.mockResolvedValue(0);
    expect(await admin.queues(staff())).toEqual({
      partners: 2,
      bookings: 3,
      payments: 1,
      vouchers: 0,
    });
  });

  it('serves health and chat', async () => {
    const prisma = mockPrisma();
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const pub = new PublicController(prisma as never, config as never);
    await expect(pub.health()).resolves.toEqual({ status: 'ok' });
    await expect(pub.chat({ messages: [{ role: 'user', text: 'hi' }] })).rejects.toThrow(
      /not available/,
    );
    config.get.mockReturnValue('key');
    const fetchMock = jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hello' }] } }] }),
    } as never);
    await expect(pub.chat({ messages: [{ role: 'user', text: 'hi' }] })).resolves.toEqual({
      text: 'Hello',
    });
    fetchMock.mockRestore();
  });
});
