import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { BookingStatus, Prisma, Realm } from '@prisma/client';
import { SupplierError } from '@gnk/suppliers';
import type {
  AdminBookingDetailDto,
  AdminBookingListItem,
  BookingDetailDto,
  BookingListItem,
  BookingStatusCounts,
  InvoiceDetailDto,
  InvoiceListItem,
  Paginated,
} from '@gnk/types';
import type { z } from 'zod';
import {
  checkBookingPassengers,
  type adminBookingListSchema,
  type bookingListSchema,
  type PassengerInput,
} from '@gnk/validation';

type BookingListInput = z.output<typeof bookingListSchema>;
type AdminBookingListInput = z.output<typeof adminBookingListSchema>;
import { pageArgs, paginated } from '../../core/http/pagination';
import type { RequestMeta } from '../../core/http/request-meta';
import { iso, isoDate, num } from '../../core/money';
import { SequencesService } from '../../core/sequences.service';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { SupplierGatewayService } from '../suppliers/supplier-gateway.service';
import { BookingMapper, type BookingDetailRow } from './booking.mapper';

type Tx = Prisma.TransactionClient;

// Which statuses hold seats on our side (released on reject/cancel/confirm).
const HOLDING: BookingStatus[] = [
  'PENDING_APPROVAL',
  'APPROVED',
  'SUBMITTED_TO_SUPPLIER',
  'SUPPLIER_FAILED',
];

const PARTNER_TABS: Record<Exclude<BookingListInput['tab'], 'all'>, BookingStatus[]> = {
  PENDING_APPROVAL: ['PENDING_APPROVAL'],
  APPROVED: ['APPROVED'],
  PROCESSING: ['SUBMITTED_TO_SUPPLIER', 'SUPPLIER_PENDING', 'SUPPLIER_FAILED'],
  CONFIRMED: ['CONFIRMED', 'COMPLETED'],
  CLOSED: ['REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'EXPIRED'],
};

const ADMIN_TABS: Record<Exclude<AdminBookingListInput['tab'], 'all'>, BookingStatus[]> = {
  PENDING_APPROVAL: ['PENDING_APPROVAL'],
  APPROVED: ['APPROVED'],
  SUPPLIER: ['SUBMITTED_TO_SUPPLIER', 'SUPPLIER_PENDING'],
  CONFIRMED: ['CONFIRMED'],
  SUPPLIER_FAILED: ['SUPPLIER_FAILED'],
  CANCELLED: ['REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'EXPIRED'],
  COMPLETED: ['COMPLETED'],
};

const PARTNER_CANCELLABLE: BookingStatus[] = ['PENDING_APPROVAL', 'APPROVED'];
const ADMIN_CANCELLABLE: BookingStatus[] = [
  'PENDING_APPROVAL',
  'APPROVED',
  'SUPPLIER_FAILED',
  'SUPPLIER_PENDING',
  'CONFIRMED',
];

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly sequences: SequencesService,
    private readonly ledger: LedgerService,
    private readonly supplier: SupplierGatewayService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly mapper: BookingMapper,
    private readonly realtime: RealtimeService,
  ) {}

  // =============== Partner ===============

  private partnerScope(actor: PartnerActor): Prisma.BookingWhereInput {
    // STAFF members only see bookings they created (plan 04 §4.1).
    return {
      accountId: actor.accountId,
      ...(actor.role === 'STAFF' ? { createdByUserId: actor.userId } : {}),
    };
  }

  async partnerList(actor: PartnerActor, q: BookingListInput): Promise<Paginated<BookingListItem>> {
    const where: Prisma.BookingWhereInput = {
      ...this.partnerScope(actor),
      ...(q.tab !== 'all' ? { status: { in: PARTNER_TABS[q.tab] } } : {}),
      ...this.searchWhere(q.q),
      ...this.dateWhere(q.from, q.to),
    };
    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BookingMapper.listInclude,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q),
      }),
      this.prisma.booking.count({ where }),
    ]);
    const names = await this.userNames(
      rows.map((r) => ({ realm: 'PARTNER' as Realm, id: r.createdByUserId })),
    );
    return paginated(
      rows.map((r) => this.mapper.toListItem(r, names)),
      total,
      q,
    );
  }

  async partnerCounts(actor: PartnerActor): Promise<BookingStatusCounts> {
    const groups = await this.prisma.booking.groupBy({
      by: ['status'],
      where: this.partnerScope(actor),
      _count: true,
    });
    const counts: BookingStatusCounts = {
      all: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      PROCESSING: 0,
      CONFIRMED: 0,
      CLOSED: 0,
    };
    for (const g of groups) {
      counts.all += g._count;
      for (const [tab, statuses] of Object.entries(PARTNER_TABS))
        if (statuses.includes(g.status)) counts[tab as keyof typeof PARTNER_TABS] += g._count;
    }
    return counts;
  }

  async partnerGet(actor: PartnerActor, id: string): Promise<BookingDetailDto> {
    const b = await this.prisma.booking.findFirst({
      where: { id, ...this.partnerScope(actor) },
      include: BookingMapper.detailInclude,
    });
    if (!b) throw new NotFoundException('Booking not found');
    const names = await this.namesFor(b);
    const canCancel =
      PARTNER_CANCELLABLE.includes(b.status) &&
      actor.role !== 'ACCOUNTANT' &&
      (actor.role !== 'STAFF' || b.createdByUserId === actor.userId);
    return this.mapper.toPartnerDetail(b, names, canCancel);
  }

  async create(
    actor: PartnerActor,
    dto: { quoteId: string; passengers: PassengerInput[]; agentNotes?: string },
    idempotencyKey: string,
    meta: RequestMeta,
  ): Promise<BookingDetailDto> {
    if (!/^[\w-]{8,80}$/.test(idempotencyKey))
      throw new BadRequestException('Send a valid Idempotency-Key header');

    // Same key → same booking, no second hold (plan 05 idempotency).
    const existing = await this.prisma.booking.findUnique({
      where: { accountId_idempotencyKey: { accountId: actor.accountId, idempotencyKey } },
    });
    if (existing) return this.partnerGet(actor, existing.id);

    const quote = await this.prisma.priceQuote.findUnique({ where: { id: dto.quoteId } });
    if (!quote || quote.accountId !== actor.accountId)
      throw new NotFoundException('Quote not found');
    if (quote.consumedAt)
      throw new ConflictException({
        message: 'This quote has already been used',
        code: 'QUOTE_USED',
      });
    if (quote.expiresAt < new Date())
      throw new ConflictException({
        message: 'This price quote has expired. Get a new quote.',
        code: 'QUOTE_EXPIRED',
      });
    const departure = await this.prisma.departure.findUniqueOrThrow({
      where: { id: quote.departureId },
      include: { product: true },
    });
    if (dto.passengers.length) {
      assertPassengers(dto.passengers, quote.seats, {
        departureDate: isoDate(departure.departureDate)!,
        returnDate: isoDate(departure.returnDate ?? departure.departureDate)!,
      });
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      // Consume the quote atomically so two concurrent submits can't both use it.
      const consumed = await tx.priceQuote.updateMany({
        where: { id: quote.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (!consumed.count)
        throw new ConflictException({
          message: 'This quote has already been used',
          code: 'QUOTE_USED',
        });

      const held = await tx.$executeRaw`
        UPDATE "Departure" SET "heldSeats" = "heldSeats" + ${quote.seats}, "version" = "version" + 1
        WHERE id = ${departure.id}::uuid AND "supplierAvailable" - "heldSeats" >= ${quote.seats}
          AND status IN ('OPEN', 'FILLING_FAST')`;
      if (!held)
        throw new ConflictException({
          message: 'Not enough seats are left on this departure',
          code: 'SOLD_OUT',
        });

      return tx.booking.create({
        data: {
          reference: await this.sequences.next('BOOKING', tx),
          accountId: actor.accountId,
          createdByUserId: actor.userId,
          supplierId: departure.product.supplierId,
          productId: departure.productId,
          departureId: departure.id,
          seats: quote.seats,
          supplierNetUnit: quote.supplierNet,
          markupUnit: quote.markup,
          unitPrice: quote.unitPrice,
          totalPrice: quote.totalPrice,
          pricingSnapshot: quote.breakdown as Prisma.InputJsonValue,
          quoteId: quote.id,
          status: 'PENDING_APPROVAL',
          idempotencyKey,
          agentNotes: dto.agentNotes,
          passengers: dto.passengers.length
            ? {
                create: dto.passengers.map((p) => this.passengerRow(p)),
              }
            : undefined,
          statusHistory: {
            create: { to: 'PENDING_APPROVAL', actorRealm: 'PARTNER', actorId: actor.userId },
          },
        },
      });
    });

    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.create',
      entityType: 'Booking',
      entityId: booking.id,
      after: {
        reference: booking.reference,
        seats: booking.seats,
        totalPrice: num(booking.totalPrice),
      },
      meta,
    });
    await this.notifications.notifyStaff('bookings:approve', {
      type: 'BOOKING_REQUESTED',
      title: `New booking ${booking.reference}`,
      body: `${actor.accountName} requested ${booking.seats} seat${booking.seats > 1 ? 's' : ''} on ${departure.product.sector ?? departure.product.title} (${isoDate(departure.departureDate)}).`,
      link: `/bookings/${booking.id}`,
    });
    await this.changed(booking.id, booking.accountId);
    return this.partnerGet(actor, booking.id);
  }

  /** Names added after a seat hold. Only when the booking was created without passengers. */
  async addPassengers(
    actor: PartnerActor,
    id: string,
    passengers: PassengerInput[],
    meta: RequestMeta,
  ): Promise<BookingDetailDto> {
    const b = await this.prisma.booking.findFirst({
      where: { id, ...this.partnerScope(actor) },
      include: { passengers: true, departure: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(b.status))
      throw new ConflictException('Passenger names can no longer be added on this booking');
    if (b.passengers.length) throw new ConflictException('Passengers are already on this booking');
    assertPassengers(passengers, b.seats, {
      departureDate: isoDate(b.departure.departureDate)!,
      returnDate: isoDate(b.departure.returnDate ?? b.departure.departureDate)!,
    });
    await this.prisma.passenger.createMany({
      data: passengers.map((p) => ({ bookingId: b.id, ...this.passengerRow(p) })),
    });
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.passengers.add',
      entityType: 'Booking',
      entityId: id,
      after: { seats: b.seats },
      meta,
    });
    await this.changed(b.id, b.accountId);
    return this.partnerGet(actor, b.id);
  }

  private passengerRow(p: PassengerInput) {
    return {
      type: p.type,
      title: p.title,
      firstName: p.firstName.toUpperCase(),
      lastName: p.lastName.toUpperCase(),
      gender: p.gender,
      dateOfBirth: new Date(`${p.dateOfBirth}T00:00:00Z`),
      nationality: p.nationality.toUpperCase(),
      passportNumberEnc: this.crypto.encrypt(p.passportNumber.toUpperCase()),
      passportLast4: p.passportNumber.toUpperCase().slice(-4),
      passportExpiry: new Date(`${p.passportExpiry}T00:00:00Z`),
    };
  }

  async partnerCancel(actor: PartnerActor, id: string, reason: string, meta: RequestMeta) {
    const b = await this.prisma.booking.findFirst({ where: { id, ...this.partnerScope(actor) } });
    if (!b) throw new NotFoundException('Booking not found');
    if (!PARTNER_CANCELLABLE.includes(b.status))
      throw new ConflictException(
        'This booking can no longer be cancelled online. Contact GNK Connect.',
      );
    await this.transition(
      b.id,
      b.status,
      'CANCELLED',
      { realm: 'PARTNER', id: actor.userId },
      reason,
    );
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.cancel',
      entityType: 'Booking',
      entityId: id,
      before: { status: b.status },
      after: { status: 'CANCELLED', reason },
      meta,
    });
    await this.notifications.notifyStaff('bookings:approve', {
      type: 'BOOKING_CANCELLED',
      title: `Booking ${b.reference} cancelled by partner`,
      body: `${actor.accountName} cancelled ${b.reference}: ${reason}`,
      link: `/bookings/${b.id}`,
    });
    return this.partnerGet(actor, id);
  }

  // =============== Admin ===============

  async adminList(
    actor: StaffActor,
    q: AdminBookingListInput,
  ): Promise<Paginated<AdminBookingListItem>> {
    const where: Prisma.BookingWhereInput = {
      ...(q.tab !== 'all' ? { status: { in: ADMIN_TABS[q.tab] } } : {}),
      ...(q.accountId ? { accountId: q.accountId } : {}),
      ...(q.owner === 'me' ? { assignedStaffId: actor.userId } : {}),
      ...(q.owner === 'unassigned' ? { assignedStaffId: null } : {}),
      ...this.searchWhere(q.q, true),
      ...this.dateWhere(q.from, q.to),
    };
    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BookingMapper.listInclude,
        orderBy: q.tab === 'PENDING_APPROVAL' ? { createdAt: 'asc' } : { createdAt: 'desc' },
        ...pageArgs(q),
      }),
      this.prisma.booking.count({ where }),
    ]);
    const names = await this.userNames([
      ...rows.map((r) => ({ realm: 'PARTNER' as Realm, id: r.createdByUserId })),
      ...rows.flatMap((r) =>
        r.assignedStaffId ? [{ realm: 'STAFF' as Realm, id: r.assignedStaffId }] : [],
      ),
    ]);
    return paginated(
      rows.map((r) => this.mapper.toAdminListItem(r, names, actor)),
      total,
      q,
    );
  }

  async adminCounts() {
    const groups = await this.prisma.booking.groupBy({ by: ['status'], _count: true });
    const counts: Record<string, number> = { all: 0 };
    for (const tab of Object.keys(ADMIN_TABS)) counts[tab] = 0;
    for (const g of groups) {
      counts.all += g._count;
      for (const [tab, statuses] of Object.entries(ADMIN_TABS))
        if (statuses.includes(g.status)) counts[tab] += g._count;
    }
    return counts;
  }

  async adminGet(actor: StaffActor, id: string): Promise<AdminBookingDetailDto> {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: BookingMapper.detailInclude,
    });
    if (!b) throw new NotFoundException('Booking not found');
    const [names, balance, supplier] = await Promise.all([
      this.namesFor(b),
      this.ledger.balance(b.accountId),
      this.prisma.supplier.findUnique({ where: { id: b.supplierId } }),
    ]);
    return this.mapper.toAdminDetail(b, names, actor, {
      supplierName: supplier?.name ?? '—',
      balance,
      allowedActions: this.allowedActions(b.status, actor, !!b.supplierBookingRef),
    });
  }

  private allowedActions(
    status: BookingStatus,
    actor: StaffActor,
    hasRef: boolean,
  ): AdminBookingDetailDto['allowedActions'] {
    const can = (p: Parameters<StaffActor['permissions']['has']>[0]) => actor.permissions.has(p);
    const actions: AdminBookingDetailDto['allowedActions'] = [];
    if (status === 'PENDING_APPROVAL' && can('bookings:approve')) actions.push('approve', 'reject');
    if (status === 'APPROVED' && can('bookings:push_supplier')) actions.push('push');
    if (status === 'SUPPLIER_FAILED' && can('bookings:push_supplier')) actions.push('retry_push');
    if (
      hasRef &&
      ['SUPPLIER_PENDING', 'CONFIRMED'].includes(status) &&
      can('bookings:push_supplier')
    )
      actions.push('sync_status');
    if (status === 'CONFIRMED' && can('bookings:cancel')) actions.push('complete');
    if (ADMIN_CANCELLABLE.includes(status) && can('bookings:cancel')) actions.push('cancel');
    return actions;
  }

  async approve(actor: StaffActor, id: string, note: string | undefined, meta: RequestMeta) {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { departure: true, product: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'PENDING_APPROVAL')
      throw new ConflictException('Only bookings awaiting approval can be approved');

    // Live check: seats must still exist at the supplier before we commit to the partner.
    const availability = await this.supplier
      .call(
        b.supplierId,
        'AVAIL',
        {
          productId: b.product.supplierProductId,
          departureId: b.departure.supplierDepartureId,
          seats: b.seats,
        },
        (a) =>
          a.checkAvailability(
            b.product.supplierProductId,
            b.departure.supplierDepartureId,
            b.seats,
          ),
        { bookingId: b.id },
      )
      .catch((e: SupplierError) => {
        throw new ConflictException(
          `Could not confirm availability with the supplier: ${e.message}`,
        );
      });
    if (!availability.available) {
      throw new ConflictException(
        `The supplier has only ${availability.availableSeats} seat(s) left. Reject this request or contact the supplier.`,
      );
    }

    await this.transition(
      b.id,
      'PENDING_APPROVAL',
      'APPROVED',
      { realm: 'STAFF', id: actor.userId },
      note,
    );
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.approve',
      entityType: 'Booking',
      entityId: id,
      before: { status: b.status },
      after: { status: 'APPROVED', note },
      meta,
    });
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_APPROVED',
      title: `Booking ${b.reference} approved`,
      body: `Your request is approved. It will be issued as soon as your balance or credit covers PKR ${num(b.totalPrice).toLocaleString('en-PK')}.`,
      link: `/bookings/${b.id}`,
      email: true,
    });
    return this.adminGet(actor, id);
  }

  async reject(actor: StaffActor, id: string, reason: string, meta: RequestMeta) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'PENDING_APPROVAL')
      throw new ConflictException('Only bookings awaiting approval can be rejected');
    await this.transition(
      b.id,
      b.status,
      'REJECTED',
      { realm: 'STAFF', id: actor.userId },
      reason,
      { rejectionReason: reason },
    );
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.reject',
      entityType: 'Booking',
      entityId: id,
      before: { status: b.status },
      after: { status: 'REJECTED', reason },
      meta,
    });
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_REJECTED',
      title: `Booking ${b.reference} was not approved`,
      body: `Reason: ${reason}`,
      link: `/bookings/${b.id}`,
      email: true,
    });
    return this.adminGet(actor, id);
  }

  /** Sends an approved booking to the supplier. Requires the partner's funds (balance + credit) to cover it. */
  async push(actor: StaffActor, id: string, meta: RequestMeta) {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { departure: true, product: true, passengers: true, account: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (!['APPROVED', 'SUPPLIER_FAILED'].includes(b.status))
      throw new ConflictException('Only approved bookings can be sent to the supplier');

    const funds = await this.ledger.balance(b.accountId);
    if (funds.availableFunds < num(b.totalPrice)) {
      const short = num(b.totalPrice) - funds.availableFunds;
      throw new ConflictException({
        message: `Insufficient funds: the partner needs PKR ${short.toLocaleString('en-PK')} more (balance + credit available: PKR ${funds.availableFunds.toLocaleString('en-PK')}).`,
        code: 'INSUFFICIENT_FUNDS',
      });
    }

    await this.transition(b.id, b.status, 'SUBMITTED_TO_SUPPLIER', {
      realm: 'STAFF',
      id: actor.userId,
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.push',
      entityType: 'Booking',
      entityId: id,
      meta,
    });

    try {
      const result = await this.supplier.call(
        b.supplierId,
        'CREATE',
        // Redacted: passport numbers never go into the call log.
        {
          reference: b.reference,
          departureId: b.departure.supplierDepartureId,
          seats: b.seats,
          passengers: b.passengers.map((p) => `${p.lastName}/${p.firstName} ••${p.passportLast4}`),
        },
        (a) =>
          a.createBooking({
            supplierProductId: b.product.supplierProductId,
            supplierDepartureId: b.departure.supplierDepartureId,
            seats: b.seats,
            idempotencyKey: b.reference,
            remarks: `GNK ${b.reference}`,
            passengers: b.passengers.map((p) => ({
              type: p.type,
              title: p.title,
              firstName: p.firstName,
              lastName: p.lastName,
              gender: p.gender,
              dateOfBirth: isoDate(p.dateOfBirth)!,
              nationality: p.nationality,
              passportNumber: this.crypto.decrypt(p.passportNumberEnc),
              passportExpiry: isoDate(p.passportExpiry)!,
            })),
          }),
        { bookingId: b.id, idempotencyKey: b.reference },
      );

      if (result.status === 'CONFIRMED')
        await this.confirm(b.id, result.supplierBookingRef, result.pnr, actor.userId);
      else if (result.status === 'PENDING') {
        await this.transition(
          b.id,
          'SUBMITTED_TO_SUPPLIER',
          'SUPPLIER_PENDING',
          null,
          'Waiting for supplier confirmation',
          {
            supplierBookingRef: result.supplierBookingRef,
          },
        );
      } else {
        await this.transition(
          b.id,
          'SUBMITTED_TO_SUPPLIER',
          'SUPPLIER_FAILED',
          null,
          `Supplier returned ${result.status}`,
        );
      }
    } catch (err) {
      const message =
        err instanceof SupplierError ? `${err.kind}: ${err.message}` : (err as Error).message;
      await this.transition(b.id, 'SUBMITTED_TO_SUPPLIER', 'SUPPLIER_FAILED', null, message);
      await this.notifications.notifyStaff('bookings:push_supplier', {
        type: 'SUPPLIER_FAILED',
        title: `Supplier push failed for ${b.reference}`,
        body: message,
        link: `/bookings/${b.id}`,
      });
    }
    return this.adminGet(actor, id);
  }

  async syncStatus(actor: StaffActor, id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b?.supplierBookingRef)
      throw new NotFoundException('This booking has no supplier reference yet');
    const status = await this.supplier.call(
      b.supplierId,
      'STATUS',
      { ref: b.supplierBookingRef },
      (a) => a.getBookingStatus(b.supplierBookingRef!),
      { bookingId: b.id },
    );
    if (status.status === 'CONFIRMED' && b.status === 'SUPPLIER_PENDING')
      await this.confirm(b.id, status.supplierBookingRef, status.pnr, actor.userId);
    else if (status.pnr && status.pnr !== b.supplierPnr)
      await this.prisma.booking.update({ where: { id }, data: { supplierPnr: status.pnr } });
    return this.adminGet(actor, id);
  }

  async cancel(actor: StaffActor, id: string, reason: string, meta: RequestMeta) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (!ADMIN_CANCELLABLE.includes(b.status))
      throw new ConflictException('This booking cannot be cancelled');

    if (b.supplierBookingRef && ['CONFIRMED', 'SUPPLIER_PENDING'].includes(b.status)) {
      await this.supplier
        .call(
          b.supplierId,
          'CANCEL',
          { ref: b.supplierBookingRef },
          (a) => a.cancelBooking(b.supplierBookingRef!),
          { bookingId: b.id },
        )
        .catch((e: Error) => {
          throw new ConflictException(`The supplier did not accept the cancellation: ${e.message}`);
        });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.transition(
        b.id,
        b.status,
        'CANCELLED',
        { realm: 'STAFF', id: actor.userId },
        reason,
        {},
        tx,
      );
      if (b.status === 'CONFIRMED') {
        await this.ledger.reverseBookingCharge(tx, b, actor.userId);
        await tx.booking.update({
          where: { id },
          data: { paymentState: 'REFUNDED', amountPaid: 0 },
        });
        await tx.invoice.updateMany({
          where: { bookingId: id, voidedAt: null },
          data: { voidedAt: new Date() },
        });
        await tx.departure.update({
          where: { id: b.departureId },
          data: { supplierAvailable: { increment: b.seats } },
        });
      }
    });
    await this.changed(b.id, b.accountId);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.cancel',
      entityType: 'Booking',
      entityId: id,
      before: { status: b.status },
      after: { status: 'CANCELLED', reason },
      meta,
    });
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_CANCELLED',
      title: `Booking ${b.reference} cancelled`,
      body:
        b.status === 'CONFIRMED'
          ? `The booking was cancelled and PKR ${num(b.totalPrice).toLocaleString('en-PK')} was credited back to your account. Reason: ${reason}`
          : `Reason: ${reason}`,
      link: `/bookings/${b.id}`,
      email: true,
    });
    return this.adminGet(actor, id);
  }

  async complete(actor: StaffActor, id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'CONFIRMED')
      throw new ConflictException('Only confirmed bookings can be completed');
    await this.transition(id, 'CONFIRMED', 'COMPLETED', { realm: 'STAFF', id: actor.userId });
    return this.adminGet(actor, id);
  }

  async setNotes(actor: StaffActor, id: string, internalNotes: string) {
    await this.prisma.booking.update({ where: { id }, data: { internalNotes } });
    return this.adminGet(actor, id);
  }

  async revealPassport(actor: StaffActor, passengerId: string, meta: RequestMeta) {
    const p = await this.prisma.passenger.findUnique({ where: { id: passengerId } });
    if (!p) throw new NotFoundException('Passenger not found');
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'passenger.reveal_passport',
      entityType: 'Booking',
      entityId: p.bookingId,
      after: { passengerId },
      meta,
    });
    return { passportNumber: this.crypto.decrypt(p.passportNumberEnc) };
  }

  /** Marks confirmed bookings whose trip has ended as completed. Called by the scheduler. */
  async completeFinished() {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const due = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        departure: {
          OR: [{ returnDate: { lt: today } }, { returnDate: null, departureDate: { lt: today } }],
        },
      },
      select: { id: true },
    });
    for (const b of due)
      await this.transition(b.id, 'CONFIRMED', 'COMPLETED', null, 'Trip completed').catch(
        () => undefined,
      );
    return due.length;
  }

  // =============== Invoices ===============

  async partnerInvoices(actor: PartnerActor): Promise<InvoiceListItem[]> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        accountId: actor.accountId,
        ...(actor.role === 'STAFF' ? { booking: { createdByUserId: actor.userId } } : {}),
      },
      include: { booking: { select: { reference: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    return rows.map((i) => ({
      id: i.id,
      number: i.number,
      issuedAt: iso(i.issuedAt)!,
      total: num(i.total),
      bookingId: i.bookingId,
      bookingReference: i.booking.reference,
      voided: !!i.voidedAt,
    }));
  }

  async invoice(id: string, accountId?: string): Promise<InvoiceDetailDto> {
    const inv = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        account: true,
        booking: {
          include: { product: true, departure: true, passengers: { orderBy: { id: 'asc' } } },
        },
      },
    });
    if (!inv || (accountId && inv.accountId !== accountId))
      throw new NotFoundException('Invoice not found');
    const { company } = await this.settings.get();
    const b = inv.booking;
    return {
      id: inv.id,
      number: inv.number,
      issuedAt: iso(inv.issuedAt)!,
      total: num(inv.total),
      bookingId: b.id,
      bookingReference: b.reference,
      voided: !!inv.voidedAt,
      company,
      billTo: {
        name: inv.account.legalName,
        code: inv.account.code,
        address: inv.account.address,
        city: inv.account.city,
        phone: inv.account.phone,
        email: inv.account.email,
        ntn: inv.account.ntn,
      },
      booking: {
        title: b.product.title,
        sector: b.product.sector,
        airline: b.product.airline,
        departureDate: isoDate(b.departure.departureDate)!,
        returnDate: isoDate(b.departure.returnDate),
        pnr: b.supplierPnr,
        seats: b.seats,
        unitPrice: num(b.unitPrice),
        passengers: b.passengers.map((p) => ({
          name: `${p.title} ${p.firstName} ${p.lastName}`,
          type: p.type,
        })),
      },
      amountPaid: num(b.amountPaid),
    };
  }

  // =============== internals ===============

  /** Supplier confirmed: charge the partner, release our hold, issue the invoice. */
  private async confirm(id: string, supplierRef: string, pnr: string | null, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUniqueOrThrow({ where: { id } });
      await this.transition(
        id,
        b.status,
        'CONFIRMED',
        null,
        pnr ? `PNR ${pnr}` : null,
        {
          supplierBookingRef: supplierRef,
          supplierPnr: pnr,
          paymentState: 'PAID',
          amountPaid: b.totalPrice,
        },
        tx,
      );
      await tx.departure.update({
        where: { id: b.departureId },
        data: { supplierAvailable: { decrement: b.seats } },
      });
      await this.ledger.postBookingCharge(tx, b, actorId);
      await tx.invoice.create({
        data: {
          number: await this.sequences.next('INVOICE', tx),
          accountId: b.accountId,
          bookingId: b.id,
          total: b.totalPrice,
        },
      });
    });
    await this.changed(id);
    const b = await this.prisma.booking.findUniqueOrThrow({
      where: { id },
      include: { product: true },
    });
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_CONFIRMED',
      title: `Booking ${b.reference} confirmed`,
      body: `${b.product.sector ?? b.product.title} is confirmed${pnr ? ` (PNR ${pnr})` : ''}. PKR ${num(b.totalPrice).toLocaleString('en-PK')} was charged to your account.`,
      link: `/bookings/${b.id}`,
      email: true,
    });
  }

  /**
   * Moves a booking between statuses with optimistic concurrency, records the
   * event, and releases held seats when leaving a holding status.
   */
  private async transition(
    id: string,
    from: BookingStatus,
    to: BookingStatus,
    actor: { realm: Realm; id: string } | null,
    reason?: string | null,
    data: Prisma.BookingUpdateManyMutationInput = {},
    tx?: Tx,
  ) {
    const run = async (t: Tx) => {
      const b = await t.booking.findUniqueOrThrow({ where: { id } });
      const updated = await t.booking.updateMany({
        where: { id, status: from, version: b.version },
        data: { ...data, status: to, version: { increment: 1 } },
      });
      if (!updated.count)
        throw new ConflictException(
          'This booking was changed by someone else. Refresh and try again.',
        );
      if (HOLDING.includes(from) && !HOLDING.includes(to)) {
        await t.$executeRaw`UPDATE "Departure" SET "heldSeats" = GREATEST("heldSeats" - ${b.seats}, 0) WHERE id = ${b.departureId}::uuid`;
      }
      await t.bookingStatusEvent.create({
        data: {
          bookingId: id,
          from,
          to,
          actorRealm: actor?.realm ?? null,
          actorId: actor?.id ?? null,
          reason: reason ?? null,
        },
      });
    };
    if (tx) return run(tx); // the caller publishes once its transaction commits
    await this.prisma.$transaction(run);
    await this.changed(id);
  }

  /** Tells the partner's users and staff that a booking changed (after commit). */
  async changed(id: string, accountId?: string) {
    const owner =
      accountId ??
      (await this.prisma.booking.findUnique({ where: { id }, select: { accountId: true } }))
        ?.accountId;
    if (owner)
      this.realtime.publish({ topic: 'booking', id }, { realm: 'PARTNER', accountId: owner });
    this.realtime.publish(
      { topic: 'booking', id },
      { realm: 'STAFF', permission: 'bookings:read' },
    );
    this.realtime.publish({ topic: 'queues' }, { realm: 'STAFF' });
  }

  /** Takes (or releases) ownership of a booking request on the operations desk. */
  async assign(actor: StaffActor, id: string, staffId: string | null, meta: RequestMeta) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (staffId) {
      const staff = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
      if (!staff || staff.status !== 'ACTIVE' || staff.deletedAt)
        throw new BadRequestException('Choose an active staff member');
    }
    await this.prisma.booking.update({ where: { id }, data: { assignedStaffId: staffId } });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.assign',
      entityType: 'Booking',
      entityId: id,
      before: { assignedStaffId: b.assignedStaffId },
      after: { assignedStaffId: staffId },
      meta,
    });
    if (staffId && staffId !== actor.userId)
      await this.notifications.notifyStaffUser(staffId, {
        type: 'BOOKING_ASSIGNED',
        title: `${b.reference} assigned to you`,
        body: `${actor.fullName} assigned booking ${b.reference} to you.`,
        link: `/bookings/${id}`,
      });
    await this.changed(id, b.accountId);
    return this.adminGet(actor, id);
  }

  private searchWhere(q: string | undefined, admin = false): Prisma.BookingWhereInput {
    if (!q) return {};
    return {
      OR: [
        { reference: { contains: q, mode: 'insensitive' } },
        { passengers: { some: { lastName: { contains: q, mode: 'insensitive' } } } },
        { passengers: { some: { passportLast4: q.slice(-4).toUpperCase() } } },
        { product: { sector: { contains: q, mode: 'insensitive' } } },
        ...(admin
          ? [
              { supplierBookingRef: { contains: q, mode: 'insensitive' as const } },
              { account: { legalName: { contains: q, mode: 'insensitive' as const } } },
              { account: { code: { contains: q, mode: 'insensitive' as const } } },
            ]
          : []),
      ],
    };
  }

  private dateWhere(from?: string, to?: string): Prisma.BookingWhereInput {
    if (!from && !to) return {};
    return {
      departure: {
        departureDate: {
          ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}),
          ...(to ? { lte: new Date(`${to}T00:00:00Z`) } : {}),
        },
      },
    };
  }

  private async namesFor(b: BookingDetailRow) {
    return this.userNames([
      { realm: 'PARTNER', id: b.createdByUserId },
      ...b.statusHistory
        .filter((e) => e.actorId && e.actorRealm)
        .map((e) => ({ realm: e.actorRealm!, id: e.actorId! })),
      ...b.payments.flatMap((p) => [{ realm: 'PARTNER' as Realm, id: p.submittedById }]),
      ...(b.assignedStaffId ? [{ realm: 'STAFF' as Realm, id: b.assignedStaffId }] : []),
    ]);
  }

  async userNames(refs: { realm: Realm; id: string }[]) {
    const partnerIds = [...new Set(refs.filter((r) => r.realm === 'PARTNER').map((r) => r.id))];
    const staffIds = [...new Set(refs.filter((r) => r.realm === 'STAFF').map((r) => r.id))];
    const [partners, staff] = await Promise.all([
      partnerIds.length
        ? this.prisma.partnerUser.findMany({
            where: { id: { in: partnerIds } },
            select: { id: true, fullName: true },
          })
        : [],
      staffIds.length
        ? this.prisma.staffUser.findMany({
            where: { id: { in: staffIds } },
            select: { id: true, fullName: true },
          })
        : [],
    ]);
    return new Map(
      [...partners, ...staff.map((s) => ({ ...s, fullName: `${s.fullName} (GNK)` }))].map((u) => [
        u.id,
        u.fullName,
      ]),
    );
  }
}

function assertPassengers(
  passengers: PassengerInput[],
  seats: number,
  trip: { departureDate: string; returnDate: string },
) {
  const issues = checkBookingPassengers(passengers, seats, trip);
  if (!issues.length) return;
  const headline = issues.find((i) => i.path === 'passengers')?.message;
  throw new UnprocessableEntityException({
    message: headline ?? 'Some passenger details are invalid',
    code: 'VALIDATION_FAILED',
    errors: issues.map(({ path, message, code }) => ({ path, message, code })),
  });
}
