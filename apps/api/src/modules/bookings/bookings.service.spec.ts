import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupplierError } from '@gnk/suppliers';
import { BookingsService } from './bookings.service';
import { BookingMapper } from './booking.mapper';
import { BookingMaintenanceService } from './booking-maintenance.service';
import { meta, mockPrisma, partner, staff } from '../../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

const listRow = {
  id: 'b1',
  reference: 'GNK-2026-000001',
  status: 'PENDING_APPROVAL',
  paymentState: 'UNPAID',
  productId: 'p1',
  departureId: 'd1',
  seats: 2,
  totalPrice: D(200000),
  unitPrice: D(100000),
  markupUnit: D(10000),
  supplierNetUnit: D(90000),
  amountPaid: D(0),
  childSeats: 0,
  infantSeats: 0,
  holdExpiresAt: new Date('2026-10-02T00:00:00Z'),
  concessions: [],
  createdAt: new Date('2026-10-01T00:00:00Z'),
  createdByUserId: 'pu-1',
  assignedStaffId: null,
  supplierBookingRef: null,
  supplierPnr: null,
  agentNotes: null,
  rejectionReason: null,
  internalNotes: null,
  pricingSnapshot: {},
  accountId: 'acc-1',
  product: {
    title: 'LHE-JED',
    sector: 'LHE-JED',
    airline: 'SV',
    content: { outbound: { flightNo: 'SV1', from: 'LHE', to: 'JED' }, inbound: null },
  },
  departure: {
    departureDate: new Date('2026-11-01'),
    returnDate: new Date('2026-11-21'),
    baggage: '2x23',
  },
  account: {
    id: 'acc-1',
    code: 'AGT-1',
    legalName: 'Al Noor',
    tradeName: 'Al Noor',
    phone: '1',
    email: 'a@b.c',
  },
  passengers: [
    {
      id: 'px1',
      type: 'ADULT',
      title: 'MR',
      firstName: 'ALI',
      lastName: 'KHAN',
      gender: 'MALE',
      dateOfBirth: new Date('1990-01-01'),
      nationality: 'PK',
      passportLast4: '1234',
      passportExpiry: new Date('2030-01-01'),
      passportNumberEnc: 'enc',
    },
  ],
  statusHistory: [
    {
      to: 'PENDING_APPROVAL',
      createdAt: new Date(),
      actorId: 'pu-1',
      actorRealm: 'PARTNER',
      reason: null,
    },
  ],
  invoice: null,
  payments: [],
  allocations: [],
  supplierCalls: [],
};

function service() {
  const prisma = mockPrisma();
  const crypto = {
    encrypt: jest.fn((v: string) => `enc:${v}`),
    decrypt: jest.fn(() => 'AB1234567'),
  };
  const sequences = { next: jest.fn().mockResolvedValue('GNK-2026-000001') };
  const ledger = {
    balance: jest
      .fn()
      .mockResolvedValue({ balance: 500000, creditLimit: 0, availableFunds: 500000 }),
    postBookingCharge: jest.fn(),
    reverseBookingCharge: jest.fn(),
  };
  const supplier = { call: jest.fn() };
  const notifications = {
    notifyStaff: jest.fn(),
    notifyAccount: jest.fn(),
    notifyStaffUser: jest.fn(),
  };
  const settings = { get: jest.fn().mockResolvedValue({ company: { name: 'GNK' } }) };
  const audit = { log: jest.fn() };
  const mapper = new BookingMapper();
  const realtime = { publish: jest.fn() };
  const svc = new BookingsService(
    prisma as never,
    crypto as never,
    sequences as never,
    ledger as never,
    supplier as never,
    notifications as never,
    settings as never,
    audit as never,
    mapper,
    realtime as never,
  );
  return {
    svc,
    prisma,
    crypto,
    sequences,
    ledger,
    supplier,
    notifications,
    settings,
    audit,
    realtime,
  };
}

describe('BookingMapper', () => {
  const mapper = new BookingMapper();
  it('maps list/detail and hides supplier internals from partners', () => {
    const names = new Map([['pu-1', 'Owner']]);
    const list = mapper.toListItem(listRow as never, names);
    expect(list.leadPassenger).toContain('ALI');
    expect(list.status).toBe('PENDING_APPROVAL');
    const admin = mapper.toAdminListItem(listRow as never, names, staff());
    expect(admin.margin).toBe(20000);
    const failed = { ...listRow, status: 'SUPPLIER_FAILED' as const };
    expect(mapper.toListItem(failed as never).status).toBe('SUBMITTED_TO_SUPPLIER');
    const detail = mapper.toPartnerDetail(listRow as never, names, true);
    expect(detail.canCancel).toBe(true);
    expect(detail.pnr).toBeNull();
    expect(detail.concessions.requests).toEqual([]);
    expect(detail.holdExpiresAt).toBeTruthy();
    const adminDetail = mapper.toAdminDetail(listRow as never, names, staff(), {
      supplierName: 'AirDesk',
      balance: { balance: 0, creditLimit: 0, availableFunds: 0 },
      allowedActions: ['approve'],
    });
    expect(adminDetail.priceAudit?.margin).toBe(20000);
    expect(adminDetail.account.code).toBe('AGT-1');
  });
});

describe('BookingsService', () => {
  it('lists and counts partner bookings including staff scoping', async () => {
    const { svc, prisma } = service();
    prisma.booking.findMany.mockResolvedValue([listRow]);
    prisma.booking.count.mockResolvedValue(1);
    prisma.partnerUser.findMany.mockResolvedValue([{ id: 'pu-1', fullName: 'Owner' }]);
    const page = await svc.partnerList(partner(), {
      page: 1,
      pageSize: 25,
      tab: 'PENDING_APPROVAL',
    } as never);
    expect(page.total).toBe(1);
    prisma.booking.groupBy.mockResolvedValue([
      { status: 'PENDING_APPROVAL', _count: 2 },
      { status: 'CANCELLED', _count: 1 },
    ]);
    const counts = await svc.partnerCounts(partner({ role: 'STAFF' }));
    expect(counts.all).toBe(3);
    expect(counts.PENDING_APPROVAL).toBe(2);
    expect(counts.CLOSED).toBe(1);
  });

  it('creates a booking and is idempotent', async () => {
    const { svc, prisma } = service();
    prisma.booking.findUnique.mockResolvedValueOnce({ id: 'b1' });
    prisma.booking.findFirst.mockResolvedValue(listRow);
    prisma.partnerUser.findMany.mockResolvedValue([{ id: 'pu-1', fullName: 'O' }]);
    const again = await svc.create(
      partner(),
      { quoteId: 'q1', passengers: [] },
      'idem-key-1',
      meta,
    );
    expect(again.id).toBe('b1');

    prisma.booking.findUnique.mockResolvedValueOnce(null);
    prisma.priceQuote.findUnique.mockResolvedValue({
      id: 'q1',
      accountId: 'acc-1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      seats: 1,
      departureId: 'd1',
      supplierNet: D(90000),
      markup: D(10000),
      unitPrice: D(100000),
      totalPrice: D(100000),
      breakdown: {},
    });
    prisma.departure.findUniqueOrThrow.mockResolvedValue({
      id: 'd1',
      productId: 'p1',
      returnDate: new Date('2026-12-01'),
      departureDate: new Date('2026-11-01'),
      product: { supplierId: 's1', sector: 'LHE-JED', title: 'LHE-JED' },
    });
    prisma.priceQuote.updateMany.mockResolvedValue({ count: 1 });
    prisma.booking.create.mockResolvedValue({
      id: 'b2',
      reference: 'GNK-1',
      seats: 1,
      totalPrice: D(100000),
      accountId: 'acc-1',
    });
    prisma.booking.findFirst.mockResolvedValue({ ...listRow, id: 'b2' });
    const created = await svc.create(
      partner(),
      {
        quoteId: 'q1',
        passengers: [
          {
            type: 'ADULT',
            title: 'MR',
            firstName: 'Ali',
            lastName: 'Khan',
            gender: 'MALE',
            dateOfBirth: '1990-01-01',
            nationality: 'PK',
            passportNumber: 'AB1234567',
            passportExpiry: '2030-01-01',
          },
        ],
      },
      'idem-key-2',
      meta,
    );
    expect(created.id).toBe('b2');
  });

  it('rejects passengers that fail AirDesk booking checks', async () => {
    const { svc, prisma } = service();
    prisma.booking.findUnique.mockResolvedValueOnce(null);
    prisma.priceQuote.findUnique.mockResolvedValue({
      id: 'q1',
      accountId: 'acc-1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      seats: 1,
      departureId: 'd1',
      supplierNet: D(90000),
      markup: D(10000),
      unitPrice: D(100000),
      totalPrice: D(100000),
      breakdown: {},
    });
    prisma.departure.findUniqueOrThrow.mockResolvedValue({
      id: 'd1',
      productId: 'p1',
      returnDate: new Date('2026-12-01'),
      departureDate: new Date('2026-11-01'),
      product: { supplierId: 's1', sector: 'LHE-JED', title: 'LHE-JED' },
    });
    await expect(
      svc.create(
        partner(),
        {
          quoteId: 'q1',
          passengers: [
            {
              type: 'ADULT',
              title: 'MR',
              firstName: 'Ali',
              lastName: 'Khan',
              gender: 'MALE',
              dateOfBirth: '2018-01-01',
              nationality: 'PK',
              passportNumber: 'AB1234567',
              passportExpiry: '2030-01-01',
            },
          ],
        },
        'good-key-3',
        meta,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects bad create inputs', async () => {
    const { svc, prisma } = service();
    await expect(
      svc.create(partner(), { quoteId: 'q', passengers: [] }, 'bad', meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.booking.findUnique.mockResolvedValue(null);
    prisma.priceQuote.findUnique.mockResolvedValue(null);
    await expect(
      svc.create(partner(), { quoteId: 'q', passengers: [] }, 'good-key-1', meta),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('approves, rejects, pushes, cancels and completes', async () => {
    const { svc, prisma, supplier, ledger } = service();
    const booking = {
      ...listRow,
      supplierId: 's1',
      product: { ...listRow.product, supplierProductId: 'AD-1' },
      departure: { ...listRow.departure, supplierDepartureId: 'dep-1' },
      totalPrice: D(1000),
    };
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.findUniqueOrThrow.mockResolvedValue(booking);
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    prisma.supplier.findUnique.mockResolvedValue({ name: 'AirDesk' });
    prisma.partnerUser.findMany.mockResolvedValue([]);
    prisma.staffUser.findMany.mockResolvedValue([]);
    ledger.balance.mockResolvedValue({ balance: 0, creditLimit: 0, availableFunds: 0 });

    supplier.call.mockResolvedValue({ available: true, availableSeats: 10 });
    await svc.approve(staff(), 'b1', 'ok', meta);

    supplier.call.mockResolvedValue({ available: false, availableSeats: 0 });
    await expect(svc.approve(staff(), 'b1', undefined, meta)).rejects.toBeInstanceOf(
      ConflictException,
    );

    await svc.reject(staff(), 'b1', 'docs', meta);

    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      status: 'APPROVED',
      passengers: listRow.passengers,
      account: listRow.account,
    });
    ledger.balance.mockResolvedValue({ balance: 500000, creditLimit: 0, availableFunds: 500000 });
    supplier.call.mockResolvedValue({
      status: 'CONFIRMED',
      supplierBookingRef: 'AD-1',
      pnr: 'ABC123',
    });
    prisma.invoice.create.mockResolvedValue({});
    await svc.push(staff(), 'b1', meta);

    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      status: 'CONFIRMED',
      supplierBookingRef: 'AD-1',
    });
    supplier.call.mockResolvedValue({ status: 'CANCELLED' });
    await svc.cancel(staff(), 'b1', 'changed mind', meta);

    prisma.booking.findUnique.mockResolvedValue({ ...booking, status: 'CONFIRMED' });
    await svc.complete(staff(), 'b1');
    await svc.setNotes(staff(), 'b1', 'note');
  });

  it('reveals passports, assigns, invoices and completes finished trips', async () => {
    const { svc, prisma } = service();
    prisma.passenger.findUnique.mockResolvedValue({
      id: 'px1',
      bookingId: 'b1',
      passportNumberEnc: 'enc',
    });
    await expect(svc.revealPassport(staff(), 'px1', meta)).resolves.toEqual({
      passportNumber: 'AB1234567',
    });

    prisma.booking.findUnique.mockResolvedValue(listRow);
    prisma.staffUser.findUnique.mockResolvedValue({
      id: 'su-2',
      status: 'ACTIVE',
      deletedAt: null,
    });
    prisma.supplier.findUnique.mockResolvedValue({ name: 'AirDesk' });
    prisma.partnerUser.findMany.mockResolvedValue([]);
    prisma.staffUser.findMany.mockResolvedValue([{ id: 'su-1', fullName: 'Admin' }]);
    await svc.assign(staff(), 'b1', 'su-2', meta);

    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'i1',
        number: 'INV-1',
        issuedAt: new Date(),
        total: D(1),
        bookingId: 'b1',
        voidedAt: null,
        booking: { reference: 'GNK-1' },
      },
    ]);
    await expect(svc.partnerInvoices(partner())).resolves.toHaveLength(1);

    prisma.invoice.findUnique.mockResolvedValue({
      id: 'i1',
      number: 'INV-1',
      issuedAt: new Date(),
      total: D(100),
      bookingId: 'b1',
      accountId: 'acc-1',
      voidedAt: null,
      account: {
        legalName: 'Al',
        code: 'AGT',
        address: 'x',
        city: 'LHE',
        phone: '1',
        email: 'a@b.c',
        ntn: null,
      },
      booking: {
        id: 'b1',
        reference: 'GNK-1',
        seats: 1,
        unitPrice: D(100),
        amountPaid: D(0),
        supplierPnr: 'PNR',
        product: { title: 't', sector: 's', airline: 'a' },
        departure: { departureDate: new Date(), returnDate: null },
        passengers: [{ title: 'MR', firstName: 'A', lastName: 'B', type: 'ADULT' }],
      },
    });
    await expect(svc.invoice('i1', 'acc-1')).resolves.toMatchObject({ number: 'INV-1' });

    prisma.booking.findMany.mockResolvedValue([{ id: 'b1' }]);
    prisma.booking.findUniqueOrThrow.mockResolvedValue({ ...listRow, status: 'CONFIRMED' });
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    await expect(svc.completeFinished()).resolves.toBe(1);
  });

  it('requests and reviews child-seat and discount concessions', async () => {
    const { svc, prisma } = service();
    const open = {
      ...listRow,
      seats: 10,
      childSeats: 0,
      infantSeats: 0,
      totalPrice: D(1_000_000),
      unitPrice: D(100_000),
      departureId: 'd1',
      concessions: [],
    };
    prisma.booking.findFirst.mockResolvedValue(open);
    prisma.bookingConcession.create.mockResolvedValue({ id: 'c1' });
    prisma.partnerUser.findMany.mockResolvedValue([{ id: 'pu-1', fullName: 'O' }]);
    await svc.requestConcession(partner(), 'b1', { type: 'CHILD_SEATS', seats: 1 }, meta);
    expect(prisma.bookingConcession.create).toHaveBeenCalled();

    prisma.booking.findFirst.mockResolvedValue({
      ...open,
      concessions: [{ type: 'CHILD_SEATS', status: 'PENDING' }],
    });
    await expect(
      svc.requestConcession(partner(), 'b1', { type: 'CHILD_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.bookingConcession.findFirst.mockResolvedValue({
      id: 'c1',
      bookingId: 'b1',
      type: 'CHILD_SEATS',
      status: 'PENDING',
      seats: 1,
      amount: D(0),
      booking: { ...open, accountId: 'acc-1', departure: {} },
    });
    prisma.booking.update.mockResolvedValue({});
    prisma.bookingConcession.update.mockResolvedValue({});
    prisma.booking.findUnique.mockResolvedValue(open);
    prisma.supplier.findUnique.mockResolvedValue({ name: 'AirDesk' });
    const granted = await svc.reviewConcession(staff(), 'b1', 'c1', { decision: 'GRANT' }, meta);
    expect(granted.id).toBe('b1');
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('maps supplier errors on approve', async () => {
    const { svc, prisma, supplier } = service();
    prisma.booking.findUnique.mockResolvedValue({
      ...listRow,
      supplierId: 's1',
      product: { supplierProductId: 'p' },
      departure: { supplierDepartureId: 'd' },
    });
    supplier.call.mockRejectedValue(new SupplierError('UNAVAILABLE', 'down'));
    await expect(svc.approve(staff(), 'b1', undefined, meta)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('BookingMaintenanceService', () => {
  it('skips the scheduler in test env and clears timers', () => {
    const bookings = { completeFinished: jest.fn() };
    const maint = new BookingMaintenanceService(bookings as never);
    maint.onApplicationBootstrap();
    maint.onModuleDestroy();
    expect(bookings.completeFinished).not.toHaveBeenCalled();
  });
});
