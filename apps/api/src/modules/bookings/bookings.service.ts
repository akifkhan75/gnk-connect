import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { BookingStatus, ConcessionStatus, Prisma, Realm } from '@prisma/client';
import { SupplierError } from '@gnk/suppliers';
import type {
  AdminBookingDetailDto,
  AdminBookingListItem,
  AdminConcessionListItem,
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
  maxChildSeatsForAdults,
  maxInfantSeatsForAdults,
  partyFromSeats,
  seatDiscountTotal,
  type adminBookingListSchema,
  type adminConcessionListSchema,
  type bookingListSchema,
  type PartyRules,
  type PassengerInput,
  type RequestConcession,
  type ReviewConcession,
  type UpdatePassengerInput,
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
import { BookingMapper, concessionRequestLabel, type BookingDetailRow } from './booking.mapper';

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
const CONCESSION_OPEN: BookingStatus[] = ['PENDING_APPROVAL', 'APPROVED'];
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
    dto: {
      quoteId: string;
      passengers: PassengerInput[];
      childSeats?: number;
      agentNotes?: string;
    },
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
    const childSeats = dto.childSeats ?? dto.passengers.filter((p) => p.type === 'CHILD').length;
    const adults = quote.seats - childSeats;
    if (childSeats > quote.seats || childSeats > maxChildSeatsForAdults(adults)) {
      throw new UnprocessableEntityException({
        message: '1 child is allowed per 10 adults',
        code: 'CHILD_RATIO',
      });
    }
    if (dto.passengers.length) {
      assertPassengers(
        dto.passengers,
        quote.seats,
        {
          departureDate: isoDate(departure.departureDate)!,
          returnDate: isoDate(departure.returnDate ?? departure.departureDate)!,
        },
        { childSeatQuota: childSeats },
      );
    }

    const holdHours = (await this.settings.get()).booking?.holdTtlHours ?? 24;
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
          childSeats,
          supplierNetUnit: quote.supplierNet,
          markupUnit: quote.markup,
          unitPrice: quote.unitPrice,
          totalPrice: quote.totalPrice,
          pricingSnapshot: quote.breakdown as Prisma.InputJsonValue,
          quoteId: quote.id,
          status: 'PENDING_APPROVAL',
          holdExpiresAt: new Date(Date.now() + holdHours * 60 * 60_000),
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

  /** Names added after a seat hold. Remaining seated slots and granted infants can be filled. */
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
    await this.appendPassengers(b, passengers);
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

  async adminAddPassengers(
    actor: StaffActor,
    id: string,
    passengers: PassengerInput[],
    meta: RequestMeta,
  ): Promise<AdminBookingDetailDto> {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { passengers: true, departure: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    await this.appendPassengers(b, passengers);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.passengers.add',
      entityType: 'Booking',
      entityId: id,
      after: { seats: b.seats, added: passengers.length },
      meta,
    });
    await this.changed(b.id, b.accountId);
    return this.adminGet(actor, id);
  }

  async adminUpdatePassengers(
    actor: StaffActor,
    id: string,
    updates: UpdatePassengerInput[],
    meta: RequestMeta,
  ): Promise<AdminBookingDetailDto> {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { passengers: true, departure: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    await this.replacePassengers(b, updates);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.passengers.update',
      entityType: 'Booking',
      entityId: id,
      after: { updated: updates.map((p) => p.id) },
      meta,
    });
    await this.changed(b.id, b.accountId);
    return this.adminGet(actor, id);
  }

  async updatePassengers(
    actor: PartnerActor,
    id: string,
    updates: UpdatePassengerInput[],
    meta: RequestMeta,
  ): Promise<BookingDetailDto> {
    const b = await this.prisma.booking.findFirst({
      where: { id, ...this.partnerScope(actor) },
      include: { passengers: true, departure: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    await this.replacePassengers(b, updates);
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.passengers.update',
      entityType: 'Booking',
      entityId: id,
      after: { updated: updates.map((p) => p.id) },
      meta,
    });
    await this.changed(b.id, b.accountId);
    return this.partnerGet(actor, b.id);
  }

  private async replacePassengers(
    b: {
      id: string;
      status: BookingStatus;
      seats: number;
      childSeats: number;
      infantSeats: number;
      passengers: {
        id: string;
        type: PassengerInput['type'];
        title: PassengerInput['title'];
        firstName: string;
        lastName: string;
        gender: PassengerInput['gender'];
        dateOfBirth: Date;
        nationality: string;
        passportNumberEnc: string;
        passportExpiry: Date;
      }[];
      departure: { departureDate: Date; returnDate: Date | null };
    },
    updates: UpdatePassengerInput[],
  ) {
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(b.status))
      throw new ConflictException('Passenger names can no longer be changed on this booking');
    const byId = new Map(b.passengers.map((p) => [p.id, p]));
    for (const u of updates) {
      if (!byId.has(u.id)) throw new NotFoundException('Passenger not found');
    }
    const trip = {
      departureDate: isoDate(b.departure.departureDate)!,
      returnDate: isoDate(b.departure.returnDate ?? b.departure.departureDate)!,
    };
    const merged = b.passengers.map((p) => {
      const u = updates.find((row) => row.id === p.id);
      const current = this.passengerInputFromRow(p);
      if (!u) return current;
      return {
        ...current,
        type: p.type,
        title: u.title,
        firstName: u.firstName,
        lastName: u.lastName,
        gender: u.gender,
        dateOfBirth: u.dateOfBirth,
        nationality: u.nationality,
        passportNumber: u.passportNumber || current.passportNumber,
        passportExpiry: u.passportExpiry,
      };
    });
    assertPassengers(merged, b.seats, trip, {
      exactSeats: false,
      grantedInfantSeats: b.infantSeats,
      childSeatQuota: b.childSeats,
    });
    await this.prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const next = merged.find((p, i) => b.passengers[i]!.id === u.id)!;
        await tx.passenger.update({
          where: { id: u.id },
          data: this.passengerRow(next),
        });
      }
    });
  }

  private passengerInputFromRow(p: {
    type: PassengerInput['type'];
    title: PassengerInput['title'];
    firstName: string;
    lastName: string;
    gender: PassengerInput['gender'];
    dateOfBirth: Date;
    nationality: string;
    passportNumberEnc: string;
    passportExpiry: Date;
  }): PassengerInput {
    return {
      type: p.type,
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: isoDate(p.dateOfBirth)!,
      nationality: p.nationality,
      passportNumber: this.crypto.decrypt(p.passportNumberEnc),
      passportExpiry: isoDate(p.passportExpiry)!,
    };
  }

  private async appendPassengers(
    b: {
      id: string;
      status: BookingStatus;
      seats: number;
      childSeats: number;
      infantSeats: number;
      passengers: {
        type: PassengerInput['type'];
        title: PassengerInput['title'];
        firstName: string;
        lastName: string;
        gender: PassengerInput['gender'];
        dateOfBirth: Date;
        nationality: string;
        passportNumberEnc: string;
        passportExpiry: Date;
      }[];
      departure: { departureDate: Date; returnDate: Date | null };
    },
    passengers: PassengerInput[],
  ) {
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(b.status))
      throw new ConflictException('Passenger names can no longer be added on this booking');
    const trip = {
      departureDate: isoDate(b.departure.departureDate)!,
      returnDate: isoDate(b.departure.returnDate ?? b.departure.departureDate)!,
    };
    const rules: PartyRules = {
      exactSeats: false,
      grantedInfantSeats: b.infantSeats,
      childSeatQuota: b.childSeats,
    };
    const existing: PassengerInput[] = b.passengers.map((p) => ({
      type: p.type,
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: isoDate(p.dateOfBirth)!,
      nationality: p.nationality,
      passportNumber: this.crypto.decrypt(p.passportNumberEnc),
      passportExpiry: isoDate(p.passportExpiry)!,
    }));
    assertPassengers([...existing, ...passengers], b.seats, trip, rules);
    await this.prisma.passenger.createMany({
      data: passengers.map((p) => ({ bookingId: b.id, ...this.passengerRow(p) })),
    });
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

  async requestConcession(
    actor: PartnerActor,
    id: string,
    dto: RequestConcession,
    meta: RequestMeta,
  ): Promise<BookingDetailDto> {
    const b = await this.prisma.booking.findFirst({
      where: { id, ...this.partnerScope(actor) },
      include: { concessions: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (!CONCESSION_OPEN.includes(b.status))
      throw new ConflictException('Concessions can only be requested while the hold is open');
    if (b.concessions.some((c) => c.type === dto.type && c.status === 'PENDING'))
      throw new ConflictException('A request of this type is already pending');

    const adults = b.seats - b.childSeats;
    if (dto.type === 'INFANT_SEATS') {
      const max = maxInfantSeatsForAdults(adults) - b.infantSeats;
      if (dto.seats > max) {
        throw new UnprocessableEntityException({
          message: '1 infant is allowed per adult. Infants do not take a seat.',
          code: 'INFANT_QUOTA',
        });
      }
    }
    const discount =
      dto.type === 'DISCOUNT'
        ? this.discountPreview(dto, {
            seats: b.seats,
            childSeats: b.childSeats,
            infantSeats: b.infantSeats,
            unitPrice: num(b.unitPrice),
            totalPrice: num(b.totalPrice),
            alreadyGranted: b.concessions.some(
              (c) => c.type === 'DISCOUNT' && c.status === 'GRANTED',
            ),
          })
        : null;

    const created = await this.prisma.bookingConcession.create({
      data: {
        bookingId: b.id,
        type: dto.type,
        seats: dto.type === 'DISCOUNT' ? 0 : dto.seats,
        amount: discount?.amount ?? 0,
        adultAmount: discount?.adultAmount ?? 0,
        childAmount: discount?.childAmount ?? 0,
        infantAmount: discount?.infantAmount ?? 0,
        note: dto.note,
        requestedByUserId: actor.userId,
      },
    });
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.concession.request',
      entityType: 'Booking',
      entityId: id,
      after: { type: dto.type },
      meta,
    });
    const label =
      dto.type === 'CHILD_SEATS'
        ? `${dto.seats} extra child seat${dto.seats === 1 ? '' : 's'}`
        : dto.type === 'INFANT_SEATS'
          ? `${dto.seats} infant seat${dto.seats === 1 ? '' : 's'}`
          : `a per-seat discount${discount ? ` of PKR ${discount.amount.toLocaleString('en-PK')}` : ''}`;
    const title =
      dto.type === 'CHILD_SEATS'
        ? `Child seat request on ${b.reference}`
        : dto.type === 'INFANT_SEATS'
          ? `Infant seat request on ${b.reference}`
          : `Discount request on ${b.reference}`;
    const notice = {
      type: 'BOOKING_CONCESSION',
      title,
      body: `${actor.accountName} requested ${label} on ${b.reference}.`,
      link: `/bookings/${b.id}?review=${created.id}`,
      email: true,
    };
    await this.notifications.notifyStaff('bookings:approve', notice);
    if (b.assignedStaffId) await this.notifications.notifyStaffUser(b.assignedStaffId, notice);
    await this.changed(b.id, b.accountId);
    return this.partnerGet(actor, id);
  }

  async cancelConcession(
    actor: PartnerActor,
    bookingId: string,
    concessionId: string,
    meta: RequestMeta,
  ): Promise<BookingDetailDto> {
    const b = await this.prisma.booking.findFirst({
      where: { id: bookingId, ...this.partnerScope(actor) },
    });
    if (!b) throw new NotFoundException('Booking not found');
    const updated = await this.prisma.bookingConcession.updateMany({
      where: { id: concessionId, bookingId, status: 'PENDING' },
      data: { status: 'CANCELLED', reviewedAt: new Date() },
    });
    if (!updated.count) throw new ConflictException('This request can no longer be withdrawn');
    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.concession.cancel',
      entityType: 'BookingConcession',
      entityId: concessionId,
      meta,
    });
    await this.changed(bookingId, b.accountId);
    return this.partnerGet(actor, bookingId);
  }

  async reviewConcession(
    actor: StaffActor,
    bookingId: string,
    concessionId: string,
    dto: ReviewConcession,
    meta: RequestMeta,
  ): Promise<AdminBookingDetailDto> {
    const c = await this.prisma.bookingConcession.findFirst({
      where: { id: concessionId, bookingId },
      include: { booking: { include: { departure: true } } },
    });
    if (!c) throw new NotFoundException('Concession request not found');
    if (c.status !== 'PENDING')
      throw new ConflictException('This request has already been reviewed');

    if (dto.decision === 'REJECT') {
      await this.prisma.bookingConcession.update({
        where: { id: c.id },
        data: {
          status: 'REJECTED',
          staffNote: dto.staffNote,
          reviewedByUserId: actor.userId,
          reviewedAt: new Date(),
        },
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        if (c.type === 'CHILD_SEATS') {
          const seats = dto.seats && dto.seats > 0 ? dto.seats : c.seats;
          await this.grantChildSeats(tx, c.booking, seats);
          await tx.bookingConcession.update({
            where: { id: c.id },
            data: {
              status: 'GRANTED',
              grantedSeats: seats,
              pnr: dto.pnr ?? null,
              staffNote: dto.staffNote,
              reviewedByUserId: actor.userId,
              reviewedAt: new Date(),
            },
          });
        } else if (c.type === 'INFANT_SEATS') {
          const seats = dto.seats && dto.seats > 0 ? dto.seats : c.seats;
          await this.grantInfantSeats(tx, c.booking, seats);
          await tx.bookingConcession.update({
            where: { id: c.id },
            data: {
              status: 'GRANTED',
              grantedSeats: seats,
              pnr: dto.pnr ?? null,
              staffNote: dto.staffNote,
              reviewedByUserId: actor.userId,
              reviewedAt: new Date(),
            },
          });
        } else {
          const reviewed = this.reviewDiscountRates(c, dto);
          await this.grantDiscount(tx, c.booking, reviewed.amount);
          await tx.bookingConcession.update({
            where: { id: c.id },
            data: {
              status: 'GRANTED',
              adultAmount: reviewed.adultAmount,
              childAmount: reviewed.childAmount,
              infantAmount: reviewed.infantAmount,
              amount: reviewed.amount,
              grantedAmount: reviewed.amount,
              staffNote: dto.staffNote,
              reviewedByUserId: actor.userId,
              reviewedAt: new Date(),
            },
          });
        }
      });
    }

    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.concession.review',
      entityType: 'BookingConcession',
      entityId: concessionId,
      after: { decision: dto.decision },
      meta,
    });
    await this.notifications.notifyAccount(c.booking.accountId, {
      type: 'BOOKING_CONCESSION',
      title:
        dto.decision === 'GRANT'
          ? `Concession granted on ${c.booking.reference}`
          : `Concession declined on ${c.booking.reference}`,
      body:
        dto.decision === 'GRANT'
          ? 'GNK Connect granted your concession request.'
          : (dto.staffNote ?? 'GNK Connect declined your concession request.'),
      link: `/bookings/${bookingId}`,
    });
    await this.changed(bookingId, c.booking.accountId);
    return this.adminGet(actor, bookingId);
  }

  /** Add or replace the airline PNR on a granted extra child/infant seat. */
  async setConcessionPnr(
    actor: StaffActor,
    bookingId: string,
    concessionId: string,
    pnr: string,
    meta: RequestMeta,
  ): Promise<AdminBookingDetailDto> {
    const c = await this.prisma.bookingConcession.findFirst({
      where: { id: concessionId, bookingId },
      include: { booking: true },
    });
    if (!c) throw new NotFoundException('Concession request not found');
    if (c.status !== 'GRANTED' || (c.type !== 'CHILD_SEATS' && c.type !== 'INFANT_SEATS')) {
      throw new ConflictException('A seat PNR can only be added on a granted child or infant seat');
    }
    await this.prisma.bookingConcession.update({
      where: { id: c.id },
      data: { pnr },
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.concession.pnr',
      entityType: 'BookingConcession',
      entityId: concessionId,
      before: { pnr: c.pnr },
      after: { pnr },
      meta,
    });
    await this.changed(bookingId, c.booking.accountId);
    return this.adminGet(actor, bookingId);
  }

  /** Staff-initiated grant (AirDesk Grant child seats / Grant discount) — no partner request required. */
  async grantConcession(
    actor: StaffActor,
    id: string,
    dto: RequestConcession,
    meta: RequestMeta,
  ): Promise<AdminBookingDetailDto> {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { concessions: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (!CONCESSION_OPEN.includes(b.status))
      throw new ConflictException('Concessions can only be granted while the hold is open');
    if (b.concessions.some((c) => c.type === dto.type && c.status === 'PENDING'))
      throw new ConflictException('Review the pending request of this type first');

    const adults = b.seats - b.childSeats;
    if (dto.type === 'INFANT_SEATS') {
      const max = maxInfantSeatsForAdults(adults) - b.infantSeats;
      if (dto.seats > max) {
        throw new UnprocessableEntityException({
          message: '1 infant is allowed per adult. Infants do not take a seat.',
          code: 'INFANT_QUOTA',
        });
      }
    }
    const discount =
      dto.type === 'DISCOUNT'
        ? this.discountPreview(dto, {
            seats: b.seats,
            childSeats: b.childSeats,
            infantSeats: b.infantSeats,
            unitPrice: num(b.unitPrice),
            totalPrice: num(b.totalPrice),
            alreadyGranted: b.concessions.some(
              (c) => c.type === 'DISCOUNT' && c.status === 'GRANTED',
            ),
          })
        : null;

    await this.prisma.$transaction(async (tx) => {
      if (dto.type === 'CHILD_SEATS') await this.grantChildSeats(tx, b, dto.seats);
      else if (dto.type === 'INFANT_SEATS') await this.grantInfantSeats(tx, b, dto.seats);
      else await this.grantDiscount(tx, b, discount!.amount);

      await tx.bookingConcession.create({
        data: {
          bookingId: b.id,
          type: dto.type,
          status: 'GRANTED',
          seats: dto.type === 'DISCOUNT' ? 0 : dto.seats,
          amount: discount?.amount ?? 0,
          adultAmount: discount?.adultAmount ?? 0,
          childAmount: discount?.childAmount ?? 0,
          infantAmount: discount?.infantAmount ?? 0,
          grantedSeats: dto.type === 'DISCOUNT' ? 0 : dto.seats,
          grantedAmount: discount?.amount ?? 0,
          pnr: dto.type === 'DISCOUNT' ? null : (dto.pnr ?? null),
          note: dto.note,
          requestedByUserId: actor.userId,
          reviewedByUserId: actor.userId,
          reviewedAt: new Date(),
        },
      });
    });

    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.concession.grant',
      entityType: 'Booking',
      entityId: id,
      after: { type: dto.type },
      meta,
    });
    const label =
      dto.type === 'CHILD_SEATS'
        ? `${dto.seats} child seat${dto.seats === 1 ? '' : 's'}`
        : dto.type === 'INFANT_SEATS'
          ? `${dto.seats} infant seat${dto.seats === 1 ? '' : 's'}`
          : `a per-seat discount${discount ? ` of PKR ${discount.amount.toLocaleString('en-PK')}` : ''}`;
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_CONCESSION',
      title: `Concession granted on ${b.reference}`,
      body: `GNK Connect granted ${label} on ${b.reference}.`,
      link: `/bookings/${id}`,
    });
    await this.changed(id, b.accountId);
    return this.adminGet(actor, id);
  }

  async extendHold(
    actor: StaffActor,
    id: string,
    holdExpiresAt: string,
    meta: RequestMeta,
  ): Promise<AdminBookingDetailDto> {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (!CONCESSION_OPEN.includes(b.status))
      throw new ConflictException('Payment deadline can only be adjusted while the hold is open');
    const at = new Date(holdExpiresAt);
    if (Number.isNaN(at.getTime())) throw new BadRequestException('Enter a valid payment deadline');
    if (at.getTime() <= Date.now()) {
      throw new UnprocessableEntityException({
        message: 'Payment deadline must be in the future',
        code: 'HOLD_IN_PAST',
      });
    }
    const max = Date.now() + 30 * 24 * 60 * 60_000;
    if (at.getTime() > max) {
      throw new UnprocessableEntityException({
        message: 'Payment deadline cannot be more than 30 days from now',
        code: 'HOLD_TOO_FAR',
      });
    }
    await this.prisma.booking.update({
      where: { id },
      data: { holdExpiresAt: at, version: { increment: 1 } },
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.hold.extend',
      entityType: 'Booking',
      entityId: id,
      before: { holdExpiresAt: iso(b.holdExpiresAt) },
      after: { holdExpiresAt: at.toISOString() },
      meta,
    });
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_UPDATED',
      title: `Payment deadline updated on ${b.reference}`,
      body: `The payment deadline is now ${at.toISOString()}.`,
      link: `/bookings/${id}`,
    });
    await this.changed(id, b.accountId);
    return this.adminGet(actor, id);
  }

  private async grantChildSeats(
    tx: Tx,
    booking: {
      id: string;
      seats: number;
      childSeats: number;
      departureId: string;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    },
    seats: number,
  ) {
    if (seats < 1) {
      throw new UnprocessableEntityException({
        message: 'Enter at least one child seat',
        code: 'CHILD_SEATS',
      });
    }
    const held = await tx.$executeRaw`
      UPDATE "Departure" SET "heldSeats" = "heldSeats" + ${seats}, "version" = "version" + 1
      WHERE id = ${booking.departureId}::uuid AND "supplierAvailable" - "heldSeats" >= ${seats}
        AND status IN ('OPEN', 'FILLING_FAST')`;
    if (!held)
      throw new ConflictException({
        message: 'Not enough seats are left on this departure',
        code: 'SOLD_OUT',
      });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        seats: booking.seats + seats,
        childSeats: booking.childSeats + seats,
        totalPrice: num(booking.totalPrice) + num(booking.unitPrice) * seats,
        version: { increment: 1 },
      },
    });
  }

  private async grantInfantSeats(
    tx: Tx,
    booking: { id: string; seats: number; childSeats: number; infantSeats: number },
    seats: number,
  ) {
    const adults = booking.seats - booking.childSeats;
    const max = maxInfantSeatsForAdults(adults) - booking.infantSeats;
    if (seats < 1 || seats > max) {
      throw new UnprocessableEntityException({
        message: '1 infant is allowed per adult. Infants do not take a seat.',
        code: 'INFANT_QUOTA',
      });
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: { infantSeats: booking.infantSeats + seats, version: { increment: 1 } },
    });
  }

  private discountPreview(
    dto: Extract<RequestConcession, { type: 'DISCOUNT' }>,
    booking: {
      seats: number;
      childSeats: number;
      infantSeats: number;
      unitPrice: number;
      totalPrice: number;
      alreadyGranted: boolean;
    },
  ) {
    if (booking.alreadyGranted)
      throw new ConflictException('A discount is already applied to this booking');
    const fare = booking.unitPrice;
    if (dto.adultAmount >= fare || dto.childAmount >= fare) {
      throw new UnprocessableEntityException({
        message: 'Per-seat discount must be less than the seat fare',
        code: 'DISCOUNT_TOO_HIGH',
      });
    }
    const party = partyFromSeats(booking.seats, booking.childSeats, booking.infantSeats);
    const amount = seatDiscountTotal(dto, party);
    if (amount >= booking.totalPrice) {
      throw new UnprocessableEntityException({
        message: 'Discount must be less than the booking total',
        code: 'DISCOUNT_TOO_HIGH',
      });
    }
    return {
      amount,
      adultAmount: dto.adultAmount,
      childAmount: dto.childAmount,
      infantAmount: dto.infantAmount,
    };
  }

  private reviewDiscountRates(
    c: {
      amount: Prisma.Decimal;
      adultAmount?: Prisma.Decimal | number | null;
      childAmount?: Prisma.Decimal | number | null;
      infantAmount?: Prisma.Decimal | number | null;
      booking: {
        seats: number;
        childSeats: number;
        infantSeats: number;
        unitPrice: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
      };
    },
    dto: ReviewConcession,
  ) {
    const edited = dto.adultAmount != null || dto.childAmount != null || dto.infantAmount != null;
    const rates = {
      adultAmount: edited ? (dto.adultAmount ?? 0) : num(c.adultAmount ?? 0),
      childAmount: edited ? (dto.childAmount ?? 0) : num(c.childAmount ?? 0),
      infantAmount: edited ? (dto.infantAmount ?? 0) : num(c.infantAmount ?? 0),
    };
    if (edited && rates.adultAmount <= 0 && rates.childAmount <= 0 && rates.infantAmount <= 0) {
      throw new UnprocessableEntityException({
        message: 'Enter a discount for at least one passenger type',
        code: 'DISCOUNT_REQUIRED',
      });
    }
    if (edited) {
      const preview = this.discountPreview(
        { type: 'DISCOUNT', ...rates, note: undefined },
        {
          seats: c.booking.seats,
          childSeats: c.booking.childSeats,
          infantSeats: c.booking.infantSeats,
          unitPrice: num(c.booking.unitPrice),
          totalPrice: num(c.booking.totalPrice),
          alreadyGranted: false,
        },
      );
      return preview;
    }
    return {
      amount: this.discountGrantAmount(c, dto.amount),
      adultAmount: rates.adultAmount,
      childAmount: rates.childAmount,
      infantAmount: rates.infantAmount,
    };
  }

  private discountGrantAmount(
    c: {
      amount: Prisma.Decimal;
      adultAmount?: Prisma.Decimal | number | null;
      childAmount?: Prisma.Decimal | number | null;
      infantAmount?: Prisma.Decimal | number | null;
      booking: { seats: number; childSeats: number; infantSeats: number };
    },
    override?: number,
  ) {
    if (override && override > 0) return override;
    const rates = {
      adultAmount: num(c.adultAmount ?? 0),
      childAmount: num(c.childAmount ?? 0),
      infantAmount: num(c.infantAmount ?? 0),
    };
    const computed = seatDiscountTotal(
      rates,
      partyFromSeats(c.booking.seats, c.booking.childSeats, c.booking.infantSeats),
    );
    return computed > 0 ? computed : num(c.amount);
  }

  private async grantDiscount(
    tx: Tx,
    booking: { id: string; totalPrice: Prisma.Decimal },
    amount: number,
  ) {
    if (amount <= 0 || amount >= num(booking.totalPrice)) {
      throw new UnprocessableEntityException({
        message: 'Discount must be less than the booking total',
        code: 'DISCOUNT_TOO_HIGH',
      });
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: { totalPrice: num(booking.totalPrice) - amount, version: { increment: 1 } },
    });
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

  async adminConcessionList(
    q: z.output<typeof adminConcessionListSchema>,
  ): Promise<Paginated<AdminConcessionListItem>> {
    const where: Prisma.BookingConcessionWhereInput = {
      ...(q.status !== 'all' ? { status: q.status as ConcessionStatus } : {}),
      ...(q.q
        ? {
            OR: [
              { booking: { reference: { contains: q.q, mode: 'insensitive' } } },
              { booking: { account: { tradeName: { contains: q.q, mode: 'insensitive' } } } },
              { booking: { account: { legalName: { contains: q.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.bookingConcession.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              reference: true,
              account: { select: { id: true, tradeName: true, legalName: true } },
            },
          },
        },
        orderBy: { createdAt: q.status === 'PENDING' ? 'asc' : 'desc' },
        ...pageArgs(q),
      }),
      this.prisma.bookingConcession.count({ where }),
    ]);
    return paginated(
      rows.map((r) => ({
        id: r.id,
        bookingId: r.booking.id,
        bookingReference: r.booking.reference,
        accountId: r.booking.account.id,
        accountName: r.booking.account.tradeName || r.booking.account.legalName,
        type: r.type,
        status: r.status,
        requestLabel: concessionRequestLabel(r),
        seats: r.seats,
        amount: num(r.amount),
        createdAt: iso(r.createdAt)!,
      })),
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
  rules?: PartyRules,
) {
  const issues = checkBookingPassengers(passengers, seats, trip, rules);
  if (!issues.length) return;
  const headline = issues.find((i) => i.path === 'passengers')?.message;
  throw new UnprocessableEntityException({
    message: headline ?? 'Some passenger details are invalid',
    code: 'VALIDATION_FAILED',
    errors: issues.map(({ path, message, code }) => ({ path, message, code })),
  });
}
