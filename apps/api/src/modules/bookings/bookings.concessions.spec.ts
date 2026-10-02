import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { BookingMapper, concessionRequestLabel } from './booking.mapper';
import { meta, mockPrisma, partner, staff } from '../../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

const booking = {
  id: 'b1',
  reference: 'GNK-2026-000001',
  status: 'PENDING_APPROVAL',
  paymentState: 'UNPAID',
  productId: 'p1',
  departureId: 'd1',
  supplierId: 's1',
  seats: 10,
  childSeats: 0,
  infantSeats: 0,
  totalPrice: D(1_000_000),
  unitPrice: D(100_000),
  markupUnit: D(10_000),
  supplierNetUnit: D(90_000),
  amountPaid: D(0),
  holdExpiresAt: new Date('2026-10-02T00:00:00Z'),
  concessions: [] as { type: string; status: string }[],
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

function service() {
  const prisma = mockPrisma();
  const notifications = {
    notifyStaff: jest.fn(),
    notifyAccount: jest.fn(),
    notifyStaffUser: jest.fn(),
  };
  const svc = new BookingsService(
    prisma as never,
    { encrypt: jest.fn(), decrypt: jest.fn() } as never,
    { next: jest.fn() } as never,
    {
      balance: jest.fn().mockResolvedValue({ balance: 0, creditLimit: 0, availableFunds: 0 }),
      postBookingCharge: jest.fn(),
      reverseBookingCharge: jest.fn(),
    } as never,
    { call: jest.fn() } as never,
    notifications as never,
    { get: jest.fn().mockResolvedValue({ company: { name: 'GNK' } }) } as never,
    { log: jest.fn() } as never,
    new BookingMapper(),
    { publish: jest.fn() } as never,
  );
  prisma.partnerUser.findMany.mockResolvedValue([{ id: 'pu-1', fullName: 'Owner' }]);
  prisma.supplier.findUnique.mockResolvedValue({ name: 'AirDesk' });
  prisma.booking.findUnique.mockResolvedValue(booking);
  return { svc, prisma, notifications };
}

describe('AirDesk concessions', () => {
  it('maps granted and pending per-seat discounts', () => {
    const mapper = new BookingMapper();
    const detail = mapper.toPartnerDetail(
      {
        ...booking,
        concessions: [
          {
            id: 'c1',
            type: 'DISCOUNT',
            status: 'GRANTED',
            seats: 0,
            amount: D(10000),
            adultAmount: D(10000),
            childAmount: D(3000),
            infantAmount: D(0),
            grantedSeats: 0,
            grantedAmount: D(10000),
            note: 'group fare',
            staffNote: 'ok',
            createdAt: new Date('2026-10-03T00:00:00Z'),
            reviewedAt: new Date('2026-10-03T01:00:00Z'),
          },
          {
            id: 'c2',
            type: 'CHILD_SEATS',
            status: 'PENDING',
            seats: 1,
            amount: D(0),
            adultAmount: D(0),
            childAmount: D(0),
            infantAmount: D(0),
            grantedSeats: 0,
            grantedAmount: D(0),
            note: null,
            staffNote: null,
            createdAt: new Date('2026-10-03T00:10:00Z'),
            reviewedAt: null,
          },
        ],
      } as never,
      new Map([['pu-1', 'Owner']]),
      true,
    );
    expect(detail.concessions.discountAmount).toBe(10000);
    expect(detail.concessions.canRequestDiscount).toBe(false);
    expect(detail.concessions.canRequestChild).toBe(false);
    expect(detail.concessions.canRequestInfant).toBe(true);
    expect(detail.concessions.requests[0].adultAmount).toBe(10000);
    expect(detail.concessions.requests[0].childAmount).toBe(3000);
  });

  it('rejects concession requests that break AirDesk rules', async () => {
    const { svc, prisma } = service();
    prisma.booking.findFirst.mockResolvedValueOnce(null);
    await expect(
      svc.requestConcession(partner(), 'missing', { type: 'INFANT_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findFirst.mockResolvedValueOnce({ ...booking, status: 'CONFIRMED' });
    await expect(
      svc.requestConcession(partner(), 'b1', { type: 'INFANT_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findFirst.mockResolvedValueOnce({
      ...booking,
      concessions: [{ type: 'INFANT_SEATS', status: 'PENDING' }],
    });
    await expect(
      svc.requestConcession(partner(), 'b1', { type: 'INFANT_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findFirst.mockResolvedValueOnce({ ...booking, infantSeats: 10 });
    await expect(
      svc.requestConcession(partner(), 'b1', { type: 'INFANT_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    prisma.booking.findFirst.mockResolvedValueOnce({
      ...booking,
      concessions: [{ type: 'DISCOUNT', status: 'GRANTED' }],
    });
    await expect(
      svc.requestConcession(
        partner(),
        'b1',
        { type: 'DISCOUNT', adultAmount: 1000, childAmount: 0, infantAmount: 0 },
        meta,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findFirst.mockResolvedValueOnce(booking);
    await expect(
      svc.requestConcession(
        partner(),
        'b1',
        { type: 'DISCOUNT', adultAmount: 100_000, childAmount: 0, infantAmount: 0 },
        meta,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    prisma.booking.findFirst.mockResolvedValueOnce({
      ...booking,
      seats: 1,
      totalPrice: D(5000),
      unitPrice: D(100_000),
    });
    await expect(
      svc.requestConcession(
        partner(),
        'b1',
        { type: 'DISCOUNT', adultAmount: 10_000, childAmount: 0, infantAmount: 0 },
        meta,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('requests extra child seats after booking, plus infant seats and a per-seat discount', async () => {
    const { svc, prisma, notifications } = service();
    prisma.booking.findFirst.mockResolvedValue({ ...booking, seats: 1, childSeats: 0 });
    prisma.bookingConcession.create.mockResolvedValue({ id: 'c-child' });
    await svc.requestConcession(partner(), 'b1', { type: 'CHILD_SEATS', seats: 1 }, meta);
    expect(prisma.bookingConcession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'CHILD_SEATS', seats: 1 }),
      }),
    );
    expect(notifications.notifyStaff).toHaveBeenCalledWith(
      'bookings:approve',
      expect.objectContaining({
        type: 'BOOKING_CONCESSION',
        title: 'Child seat request on GNK-2026-000001',
        body: expect.stringContaining('1 extra child seat'),
        link: '/bookings/b1?review=c-child',
        email: true,
      }),
    );

    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.bookingConcession.create.mockResolvedValue({ id: 'c-inf' });
    await svc.requestConcession(
      partner(),
      'b1',
      { type: 'INFANT_SEATS', seats: 2, note: 'laps' },
      meta,
    );
    expect(prisma.bookingConcession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'INFANT_SEATS', seats: 2, amount: 0 }),
      }),
    );
    expect(notifications.notifyStaff).toHaveBeenCalledWith(
      'bookings:approve',
      expect.objectContaining({
        type: 'BOOKING_CONCESSION',
        title: 'Infant seat request on GNK-2026-000001',
        body: expect.stringContaining('2 infant seats'),
        email: true,
      }),
    );

    prisma.bookingConcession.create.mockResolvedValue({ id: 'c-disc' });
    await svc.requestConcession(
      partner(),
      'b1',
      { type: 'DISCOUNT', adultAmount: 10000, childAmount: 3000, infantAmount: 0, note: 'group' },
      meta,
    );
    expect(prisma.bookingConcession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'DISCOUNT',
          adultAmount: 10000,
          childAmount: 3000,
          infantAmount: 0,
          amount: 100000,
        }),
      }),
    );
  });

  it('withdraws a pending request and refuses a closed one', async () => {
    const { svc, prisma } = service();
    prisma.booking.findFirst.mockResolvedValueOnce(null);
    await expect(svc.cancelConcession(partner(), 'b1', 'c1', meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.bookingConcession.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.cancelConcession(partner(), 'b1', 'c1', meta)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.bookingConcession.updateMany.mockResolvedValueOnce({ count: 1 });
    const next = await svc.cancelConcession(partner(), 'b1', 'c1', meta);
    expect(next.id).toBe('b1');
  });

  it('reviews infant, discount, and rejected concessions', async () => {
    const { svc, prisma, notifications } = service();
    prisma.bookingConcession.findFirst.mockResolvedValueOnce(null);
    await expect(
      svc.reviewConcession(staff(), 'b1', 'c1', { decision: 'GRANT' }, meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c1',
      status: 'GRANTED',
      booking: { ...booking, departure: {} },
    });
    await expect(
      svc.reviewConcession(staff(), 'b1', 'c1', { decision: 'GRANT' }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-rej',
      bookingId: 'b1',
      type: 'DISCOUNT',
      status: 'PENDING',
      booking: { ...booking, accountId: 'acc-1', departure: {} },
    });
    prisma.bookingConcession.update.mockResolvedValue({});
    await svc.reviewConcession(
      staff(),
      'b1',
      'c-rej',
      { decision: 'REJECT', staffNote: 'too steep' },
      meta,
    );
    expect(notifications.notifyAccount).toHaveBeenCalledWith(
      'acc-1',
      expect.objectContaining({ body: 'too steep' }),
    );

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-inf',
      bookingId: 'b1',
      type: 'INFANT_SEATS',
      status: 'PENDING',
      seats: 1,
      amount: D(0),
      booking: { ...booking, accountId: 'acc-1', departure: {} },
    });
    prisma.booking.update.mockResolvedValue({});
    prisma.bookingConcession.update.mockResolvedValue({});
    const infants = await svc.reviewConcession(staff(), 'b1', 'c-inf', { decision: 'GRANT' }, meta);
    expect(infants.id).toBe('b1');
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ infantSeats: 1 }) }),
    );

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-disc',
      bookingId: 'b1',
      type: 'DISCOUNT',
      status: 'PENDING',
      amount: D(0),
      adultAmount: D(10000),
      childAmount: D(3000),
      infantAmount: D(0),
      booking: { ...booking, accountId: 'acc-1', departure: {} },
    });
    const granted = await svc.reviewConcession(
      staff(),
      'b1',
      'c-disc',
      { decision: 'GRANT' },
      meta,
    );
    expect(granted.id).toBe('b1');
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalPrice: 900000 }) }),
    );

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-over',
      bookingId: 'b1',
      type: 'DISCOUNT',
      status: 'PENDING',
      amount: D(5000),
      adultAmount: D(0),
      childAmount: D(0),
      infantAmount: D(0),
      booking: { ...booking, accountId: 'acc-1', departure: {} },
    });
    await svc.reviewConcession(staff(), 'b1', 'c-over', { decision: 'GRANT', amount: 2500 }, meta);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalPrice: 997500 }) }),
    );
  });

  it('refuses grant when inventory or totals are invalid', async () => {
    const { svc, prisma } = service();
    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-child',
      bookingId: 'b1',
      type: 'CHILD_SEATS',
      status: 'PENDING',
      seats: 0,
      booking: { ...booking, seats: 5, childSeats: 0, departure: {} },
    });
    await expect(
      svc.reviewConcession(staff(), 'b1', 'c-child', { decision: 'GRANT' }, meta),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-sold',
      bookingId: 'b1',
      type: 'CHILD_SEATS',
      status: 'PENDING',
      seats: 1,
      booking: { ...booking, seats: 10, childSeats: 0, departure: {} },
    });
    prisma.$executeRaw.mockResolvedValueOnce(0);
    await expect(
      svc.reviewConcession(staff(), 'b1', 'c-sold', { decision: 'GRANT' }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-inf',
      bookingId: 'b1',
      type: 'INFANT_SEATS',
      status: 'PENDING',
      seats: 2,
      booking: { ...booking, seats: 1, childSeats: 0, infantSeats: 0, departure: {} },
    });
    await expect(
      svc.reviewConcession(staff(), 'b1', 'c-inf', { decision: 'GRANT' }, meta),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-high',
      bookingId: 'b1',
      type: 'DISCOUNT',
      status: 'PENDING',
      amount: D(0),
      adultAmount: D(0),
      childAmount: D(0),
      infantAmount: D(0),
      booking: { ...booking, totalPrice: D(1000), departure: {} },
    });
    await expect(
      svc.reviewConcession(staff(), 'b1', 'c-high', { decision: 'GRANT', amount: 1000 }, meta),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('lets staff grant child seats and discounts without a partner request', async () => {
    const { svc, prisma, notifications } = service();
    prisma.booking.findUnique.mockResolvedValue({ ...booking, concessions: [] });
    prisma.bookingConcession.create.mockResolvedValue({ id: 'c-staff' });
    prisma.booking.update.mockResolvedValue({});
    await svc.grantConcession(staff(), 'b1', { type: 'CHILD_SEATS', seats: 1 }, meta);
    expect(prisma.bookingConcession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'CHILD_SEATS', status: 'GRANTED', grantedSeats: 1 }),
      }),
    );
    expect(notifications.notifyAccount).toHaveBeenCalled();

    prisma.booking.findUnique.mockResolvedValue({ ...booking, concessions: [] });
    await svc.grantConcession(
      staff(),
      'b1',
      { type: 'DISCOUNT', adultAmount: 1000, childAmount: 0, infantAmount: 0 },
      meta,
    );

    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      concessions: [{ type: 'CHILD_SEATS', status: 'PENDING' }],
    });
    await expect(
      svc.grantConcession(staff(), 'b1', { type: 'CHILD_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      status: 'CONFIRMED',
      concessions: [],
    });
    await expect(
      svc.grantConcession(staff(), 'b1', { type: 'INFANT_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.booking.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.grantConcession(staff(), 'missing', { type: 'INFANT_SEATS', seats: 1 }, meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      seats: 1,
      childSeats: 0,
      concessions: [],
    });
    await svc.grantConcession(
      staff(),
      'b1',
      { type: 'CHILD_SEATS', seats: 1, pnr: 'ABC123' },
      meta,
    );
    expect(prisma.bookingConcession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'CHILD_SEATS', grantedSeats: 1, pnr: 'ABC123' }),
      }),
    );
  });

  it('lets staff edit seats or discount rates and add a seat PNR', async () => {
    const { svc, prisma } = service();
    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-child',
      bookingId: 'b1',
      type: 'CHILD_SEATS',
      status: 'PENDING',
      seats: 1,
      booking: { ...booking, accountId: 'acc-1', departure: {} },
    });
    prisma.booking.update.mockResolvedValue({});
    prisma.bookingConcession.update.mockResolvedValue({});
    await svc.reviewConcession(
      staff(),
      'b1',
      'c-child',
      { decision: 'GRANT', seats: 2, pnr: 'ABC123' },
      meta,
    );
    expect(prisma.bookingConcession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ grantedSeats: 2, pnr: 'ABC123' }),
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ seats: 12, childSeats: 2 }) }),
    );

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-disc',
      bookingId: 'b1',
      type: 'DISCOUNT',
      status: 'PENDING',
      amount: D(0),
      adultAmount: D(10000),
      childAmount: D(3000),
      infantAmount: D(0),
      booking: { ...booking, accountId: 'acc-1', departure: {} },
    });
    await svc.reviewConcession(
      staff(),
      'b1',
      'c-disc',
      { decision: 'GRANT', adultAmount: 8000, childAmount: 0, infantAmount: 0 },
      meta,
    );
    expect(prisma.bookingConcession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adultAmount: 8000, childAmount: 0, grantedAmount: 80000 }),
      }),
    );
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalPrice: 920000 }) }),
    );

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-child',
      bookingId: 'b1',
      type: 'CHILD_SEATS',
      status: 'GRANTED',
      pnr: null,
      booking: { ...booking, accountId: 'acc-1' },
    });
    await svc.setConcessionPnr(staff(), 'b1', 'c-child', 'XYZ999', meta);
    expect(prisma.bookingConcession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { pnr: 'XYZ999' } }),
    );

    prisma.bookingConcession.findFirst.mockResolvedValueOnce({
      id: 'c-disc',
      bookingId: 'b1',
      type: 'DISCOUNT',
      status: 'GRANTED',
      booking: { ...booking, accountId: 'acc-1' },
    });
    await expect(
      svc.setConcessionPnr(staff(), 'b1', 'c-disc', 'XYZ999', meta),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists pending concession requests for the admin queue', async () => {
    const { svc, prisma } = service();
    expect(concessionRequestLabel({ type: 'CHILD_SEATS', seats: 1 })).toBe('1 child seat(s)');
    expect(concessionRequestLabel({ type: 'INFANT_SEATS', seats: 2 })).toBe('2 infant seat(s)');
    expect(concessionRequestLabel({ type: 'DISCOUNT', seats: 0 })).toBe('—');

    prisma.bookingConcession.findMany.mockResolvedValue([
      {
        id: 'c-child',
        type: 'CHILD_SEATS',
        status: 'PENDING',
        seats: 1,
        amount: D(0),
        createdAt: new Date('2026-10-03T00:00:45Z'),
        booking: {
          id: 'b1',
          reference: 'GNK-2026-000003',
          account: { id: 'acc-1', tradeName: 'Islamabad Travels', legalName: 'Islamabad Travels' },
        },
      },
      {
        id: 'c-disc',
        type: 'DISCOUNT',
        status: 'PENDING',
        seats: 0,
        amount: D(10000),
        createdAt: new Date('2026-10-03T00:00:40Z'),
        booking: {
          id: 'b1',
          reference: 'GNK-2026-000003',
          account: { id: 'acc-1', tradeName: null, legalName: 'Islamabad Travels' },
        },
      },
    ]);
    prisma.bookingConcession.count.mockResolvedValue(2);
    const page = await svc.adminConcessionList({ page: 1, pageSize: 25, status: 'PENDING' });
    expect(page.total).toBe(2);
    expect(page.items[0]).toMatchObject({
      bookingReference: 'GNK-2026-000003',
      accountName: 'Islamabad Travels',
      requestLabel: '1 child seat(s)',
    });
    expect(page.items[1].requestLabel).toBe('—');

    prisma.bookingConcession.findMany.mockResolvedValue([]);
    prisma.bookingConcession.count.mockResolvedValue(0);
    const empty = await svc.adminConcessionList({
      page: 1,
      pageSize: 25,
      status: 'all',
      q: 'GNK',
    });
    expect(empty.items).toEqual([]);
  });
});
