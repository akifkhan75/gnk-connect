import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { BookingMapper } from './booking.mapper';
import { meta, mockPrisma, partner, staff } from '../../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

const row = {
  id: 'b1',
  reference: 'GNK-2026-000001',
  status: 'PENDING_APPROVAL',
  paymentState: 'UNPAID',
  productId: 'p1',
  departureId: 'd1',
  supplierId: 's1',
  seats: 2,
  childSeats: 0,
  infantSeats: 1,
  version: 0,
  totalPrice: D(200000),
  unitPrice: D(100000),
  markupUnit: D(10000),
  supplierNetUnit: D(90000),
  amountPaid: D(0),
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
    content: { outbound: null, inbound: null },
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
  passengers: [],
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

const adult = {
  type: 'ADULT' as const,
  title: 'MR' as const,
  firstName: 'Ali',
  lastName: 'Khan',
  gender: 'MALE' as const,
  dateOfBirth: '1990-01-01',
  nationality: 'PK',
  passportNumber: 'AB1234567',
  passportExpiry: '2030-01-01',
};

function service() {
  const prisma = mockPrisma();
  const crypto = {
    encrypt: jest.fn((v: string) => `enc:${v}`),
    decrypt: jest.fn(() => 'AB1234567'),
  };
  const notifications = {
    notifyStaff: jest.fn(),
    notifyAccount: jest.fn(),
    notifyStaffUser: jest.fn(),
  };
  const audit = { log: jest.fn() };
  const supplier = { call: jest.fn() };
  const svc = new BookingsService(
    prisma as never,
    crypto as never,
    { next: jest.fn() } as never,
    {
      balance: jest.fn().mockResolvedValue({ balance: 0, creditLimit: 0, availableFunds: 0 }),
      postBookingCharge: jest.fn(),
      reverseBookingCharge: jest.fn(),
    } as never,
    supplier as never,
    notifications as never,
    { get: jest.fn().mockResolvedValue({ company: { name: 'GNK' } }) } as never,
    audit as never,
    new BookingMapper(),
    { publish: jest.fn() } as never,
  );
  prisma.partnerUser.findMany.mockResolvedValue([{ id: 'pu-1', fullName: 'Owner' }]);
  prisma.supplier.findUnique.mockResolvedValue({ name: 'AirDesk' });
  prisma.booking.findUnique.mockResolvedValue(row);
  prisma.booking.findUniqueOrThrow.mockResolvedValue(row);
  prisma.booking.updateMany.mockResolvedValue({ count: 1 });
  prisma.bookingStatusEvent.create.mockResolvedValue({});
  return { svc, prisma, notifications, audit, crypto, supplier };
}

describe('booking lifecycle helpers', () => {
  it('adds names on an open hold and rejects a closed one', async () => {
    const { svc, prisma } = service();
    prisma.booking.findFirst.mockResolvedValueOnce(null);
    await expect(svc.addPassengers(partner(), 'b1', [adult], meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.booking.findFirst.mockResolvedValueOnce({ ...row, status: 'CONFIRMED' });
    await expect(svc.addPassengers(partner(), 'b1', [adult], meta)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.booking.findFirst.mockResolvedValue(row);
    prisma.passenger.createMany.mockResolvedValue({ count: 1 });
    const added = await svc.addPassengers(partner(), 'b1', [adult], meta);
    expect(added.id).toBe('b1');
    expect(prisma.passenger.createMany).toHaveBeenCalled();
  });

  it('adds a granted extra child on a one-adult hold', async () => {
    const { svc, prisma } = service();
    prisma.booking.findFirst.mockResolvedValue({
      ...row,
      seats: 2,
      childSeats: 1,
      infantSeats: 0,
      passengers: [
        {
          type: 'ADULT',
          title: 'MR',
          firstName: 'Ali',
          lastName: 'Khan',
          gender: 'MALE',
          dateOfBirth: new Date('1990-01-01'),
          nationality: 'PK',
          passportNumberEnc: 'enc',
          passportExpiry: new Date('2030-01-01'),
        },
      ],
    });
    prisma.passenger.createMany.mockResolvedValue({ count: 1 });
    await expect(
      svc.addPassengers(
        partner(),
        'b1',
        [
          {
            type: 'CHILD',
            title: 'MSTR',
            firstName: 'Omar',
            lastName: 'Khan',
            gender: 'MALE',
            dateOfBirth: '2018-01-01',
            nationality: 'PK',
            passportNumber: 'CD9876543',
            passportExpiry: '2030-01-01',
          },
        ],
        meta,
      ),
    ).resolves.toMatchObject({ id: 'b1' });
  });

  it('lets staff add names, and rejects a closed hold', async () => {
    const { svc, prisma } = service();
    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(svc.adminAddPassengers(staff(), 'b1', [adult], meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.booking.findUnique.mockResolvedValueOnce({ ...row, status: 'CONFIRMED' });
    await expect(svc.adminAddPassengers(staff(), 'b1', [adult], meta)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.booking.findUnique.mockResolvedValue(row);
    prisma.passenger.createMany.mockResolvedValue({ count: 1 });
    const added = await svc.adminAddPassengers(staff(), 'b1', [adult], meta);
    expect(added.id).toBe('b1');
  });

  it('edits names on an open hold and keeps the passport when blank', async () => {
    const { svc, prisma } = service();
    const existing = {
      id: 'pax-1',
      type: 'ADULT' as const,
      title: 'MR' as const,
      firstName: 'ALI',
      lastName: 'KHAN',
      gender: 'MALE' as const,
      dateOfBirth: new Date('1990-01-01'),
      nationality: 'PK',
      passportNumberEnc: 'enc',
      passportExpiry: new Date('2030-01-01'),
    };
    prisma.booking.findFirst.mockResolvedValueOnce(null);
    await expect(
      svc.updatePassengers(partner(), 'b1', [{ id: 'pax-1', ...adult, firstName: 'Omar' }], meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findFirst.mockResolvedValueOnce({
      ...row,
      status: 'CONFIRMED',
      passengers: [existing],
    });
    await expect(
      svc.updatePassengers(partner(), 'b1', [{ id: 'pax-1', ...adult, firstName: 'Omar' }], meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findFirst.mockResolvedValueOnce({ ...row, passengers: [existing] });
    await expect(
      svc.updatePassengers(partner(), 'b1', [{ id: 'missing', ...adult }], meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findFirst.mockResolvedValue({ ...row, passengers: [existing] });
    prisma.passenger.update.mockResolvedValue(existing);
    const updated = await svc.updatePassengers(
      partner(),
      'b1',
      [{ id: 'pax-1', ...adult, firstName: 'Omar', lastName: 'Shah', passportNumber: '' }],
      meta,
    );
    expect(updated.id).toBe('b1');
    expect(prisma.passenger.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pax-1' },
        data: expect.objectContaining({
          firstName: 'OMAR',
          lastName: 'SHAH',
          passportNumberEnc: 'enc:AB1234567',
        }),
      }),
    );
  });

  it('lets staff edit names on an open hold and keeps the passport when blank', async () => {
    const { svc, prisma } = service();
    const existing = {
      id: 'pax-1',
      type: 'ADULT' as const,
      title: 'MR' as const,
      firstName: 'ALI',
      lastName: 'KHAN',
      gender: 'MALE' as const,
      dateOfBirth: new Date('1990-01-01'),
      nationality: 'PK',
      passportNumberEnc: 'enc',
      passportExpiry: new Date('2030-01-01'),
    };
    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.adminUpdatePassengers(
        staff(),
        'b1',
        [{ id: 'pax-1', ...adult, firstName: 'Omar' }],
        meta,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findUnique.mockResolvedValueOnce({
      ...row,
      status: 'CONFIRMED',
      passengers: [existing],
    });
    await expect(
      svc.adminUpdatePassengers(
        staff(),
        'b1',
        [{ id: 'pax-1', ...adult, firstName: 'Omar' }],
        meta,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findUnique.mockResolvedValueOnce({ ...row, passengers: [existing] });
    await expect(
      svc.adminUpdatePassengers(staff(), 'b1', [{ id: 'missing', ...adult }], meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findUnique.mockResolvedValue({ ...row, passengers: [existing] });
    prisma.passenger.update.mockResolvedValue(existing);
    const updated = await svc.adminUpdatePassengers(
      staff(),
      'b1',
      [
        {
          id: 'pax-1',
          ...adult,
          firstName: 'Sara',
          lastName: 'Ali',
          title: 'MRS',
          gender: 'FEMALE',
          passportNumber: '',
        },
      ],
      meta,
    );
    expect(updated.id).toBe('b1');
    expect(prisma.passenger.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pax-1' },
        data: expect.objectContaining({
          firstName: 'SARA',
          lastName: 'ALI',
          title: 'MRS',
          passportNumberEnc: 'enc:AB1234567',
        }),
      }),
    );
  });

  it('extends an open hold and rejects a past or closed deadline', async () => {
    const { svc, prisma } = service();
    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.extendHold(staff(), 'b1', new Date(Date.now() + 86_400_000).toISOString(), meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findUnique.mockResolvedValueOnce({ ...row, status: 'CONFIRMED' });
    await expect(
      svc.extendHold(staff(), 'b1', new Date(Date.now() + 86_400_000).toISOString(), meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findUnique.mockResolvedValue(row);
    await expect(
      svc.extendHold(staff(), 'b1', new Date(Date.now() - 60_000).toISOString(), meta),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    await expect(
      svc.extendHold(staff(), 'b1', new Date(Date.now() + 40 * 86_400_000).toISOString(), meta),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    prisma.booking.update.mockResolvedValue({});
    const next = await svc.extendHold(
      staff(),
      'b1',
      new Date(Date.now() + 86_400_000).toISOString(),
      meta,
    );
    expect(next.id).toBe('b1');
    expect(prisma.booking.update).toHaveBeenCalled();
  });

  it('lets the partner cancel an open hold', async () => {
    const { svc, prisma } = service();
    prisma.booking.findFirst.mockResolvedValueOnce(null);
    await expect(svc.partnerCancel(partner(), 'b1', 'changed plans', meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.booking.findFirst.mockResolvedValueOnce({ ...row, status: 'CONFIRMED' });
    await expect(svc.partnerCancel(partner(), 'b1', 'too late', meta)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.booking.findFirst.mockResolvedValue(row);
    const cancelled = await svc.partnerCancel(partner(), 'b1', 'changed plans', meta);
    expect(cancelled.id).toBe('b1');
  });

  it('covers admin desk actions', async () => {
    const { svc, prisma, notifications, crypto } = service();
    expect(await svc.adminCounts()).toEqual(expect.objectContaining({ all: 0 }));
    prisma.booking.groupBy.mockResolvedValue([{ status: 'PENDING_APPROVAL', _count: 2 }]);
    expect((await svc.adminCounts()).PENDING_APPROVAL).toBe(2);

    prisma.booking.findMany.mockResolvedValue([row]);
    prisma.booking.count.mockResolvedValue(1);
    const page = await svc.adminList(staff(), {
      page: 1,
      pageSize: 25,
      tab: 'PENDING_APPROVAL',
      q: 'GNK',
      from: '2026-10-01',
      to: '2026-10-31',
      owner: 'me',
    } as never);
    expect(page.total).toBe(1);

    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(svc.reject(staff(), 'b1', 'no', meta)).rejects.toBeInstanceOf(NotFoundException);
    prisma.booking.findUnique.mockResolvedValueOnce({ ...row, status: 'APPROVED' });
    await expect(svc.reject(staff(), 'b1', 'no', meta)).rejects.toBeInstanceOf(ConflictException);
    prisma.booking.findUnique.mockResolvedValue(row);
    expect((await svc.reject(staff(), 'b1', 'docs missing', meta)).id).toBe('b1');

    expect((await svc.setNotes(staff(), 'b1', 'watch margin')).id).toBe('b1');

    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(svc.complete(staff(), 'b1')).rejects.toBeInstanceOf(NotFoundException);
    prisma.booking.findUnique.mockResolvedValueOnce({ ...row, status: 'APPROVED' });
    await expect(svc.complete(staff(), 'b1')).rejects.toBeInstanceOf(ConflictException);
    prisma.booking.findUnique.mockResolvedValue({ ...row, status: 'CONFIRMED' });
    expect((await svc.complete(staff(), 'b1')).id).toBe('b1');

    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(svc.assign(staff(), 'b1', 'su-2', meta)).rejects.toBeInstanceOf(NotFoundException);
    prisma.booking.findUnique.mockResolvedValue(row);
    prisma.staffUser.findUnique.mockResolvedValueOnce({ status: 'DISABLED', deletedAt: null });
    await expect(svc.assign(staff(), 'b1', 'su-2', meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.staffUser.findUnique.mockResolvedValueOnce({ status: 'ACTIVE', deletedAt: null });
    expect((await svc.assign(staff(), 'b1', 'su-2', meta)).id).toBe('b1');
    expect(notifications.notifyStaffUser).toHaveBeenCalled();
    expect((await svc.assign(staff(), 'b1', null, meta)).id).toBe('b1');

    prisma.passenger.findUnique.mockResolvedValueOnce(null);
    await expect(svc.revealPassport(staff(), 'px', meta)).rejects.toBeInstanceOf(NotFoundException);
    prisma.passenger.findUnique.mockResolvedValueOnce({
      id: 'px',
      bookingId: 'b1',
      passportNumberEnc: 'enc',
    });
    expect(await svc.revealPassport(staff(), 'px', meta)).toEqual({ passportNumber: 'AB1234567' });
    expect(crypto.decrypt).toHaveBeenCalled();
  });

  it('syncs a later PNR from the supplier', async () => {
    const { svc, prisma, supplier } = service();
    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(svc.syncStatus(staff(), 'b1')).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findUnique.mockResolvedValue({
      ...row,
      supplierBookingRef: 'AD-1',
      supplierId: 's1',
      status: 'CONFIRMED',
      supplierPnr: 'OLD',
    });
    supplier.call.mockResolvedValue({
      status: 'CONFIRMED',
      supplierBookingRef: 'AD-1',
      pnr: 'NEWPNR',
    });
    expect((await svc.syncStatus(staff(), 'b1')).id).toBe('b1');
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { supplierPnr: 'NEWPNR' },
    });
  });
});
