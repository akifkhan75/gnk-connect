import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  inventorySeatCount,
  isPassengerPayloadWithinBookedManifest,
  isSeatManifestValid,
  type PassengerInput,
} from '@gnk/validation';
import { iso, isoDate, num } from '../../core/money';
import type { RequestMeta } from '../../core/http/request-meta';
import { SequencesService } from '../../core/sequences.service';
import { CryptoService } from '../../infra/crypto/crypto.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { GroupPnrService } from '../inventory/group-pnr.service';
import { InventoryEngineService } from '../inventory/inventory-engine.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { BookingMapper } from './booking.mapper';

type Tx = Prisma.TransactionClient;

function addMonths(isoDay: string, months: number) {
  const [y, m, d] = isoDay.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

@Injectable()
export class BookingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly sequences: SequencesService,
    private readonly inventory: InventoryEngineService,
    private readonly pnrs: GroupPnrService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly mapper: BookingMapper,
    private readonly notifications: NotificationsService,
  ) {}

  async placeAndHold(
    actor: PartnerActor,
    dto: {
      inventoryLotId: string;
      adults: number;
      children?: number;
      infants?: number;
      passengers?: PassengerInput[];
      agentNotes?: string;
    },
    idempotencyKey: string,
    meta: RequestMeta,
  ) {
    if (!/^[\w-]{8,80}$/.test(idempotencyKey))
      throw new BadRequestException('Send a valid Idempotency-Key header');

    const existing = await this.prisma.booking.findUnique({
      where: { accountId_idempotencyKey: { accountId: actor.accountId, idempotencyKey } },
    });
    if (existing) return this.partnerGet(actor, existing.id);

    const manifest = {
      adults: dto.adults,
      children: dto.children ?? 0,
      infants: dto.infants ?? 0,
    };
    if (!isSeatManifestValid(manifest))
      throw new BadRequestException({ code: 'booking.place_requires_seat_manifest' });

    const passengers = dto.passengers ?? [];
    if (passengers.length > 0) {
      if (
        !isPassengerPayloadWithinBookedManifest(
          passengers.map((p) => ({ passengerKind: p.type })),
          manifest,
        )
      ) {
        throw new UnprocessableEntityException('Passenger counts exceed booked seats');
      }
    }

    const lot = await this.prisma.inventoryLot.findFirst({
      where: { id: dto.inventoryLotId, deletedAt: null },
      include: { sellingGroup: true },
    });
    if (!lot) throw new NotFoundException({ code: 'inventory_lot.not_found' });
    if (lot.sellingGroup.status !== 'ACTIVE' || lot.sellingGroup.deletedAt)
      throw new ConflictException({ code: 'selling_group.not_active_for_holds' });

    const adultFare = num(lot.fareAmount);
    const childFare = lot.childFareAmount != null ? num(lot.childFareAmount) : adultFare;
    const infantFare = lot.infantFareAmount != null ? num(lot.infantFareAmount) : 0;
    const fareSubtotal =
      adultFare * manifest.adults + childFare * manifest.children + infantFare * manifest.infants;
    const seats = inventorySeatCount(manifest);
    const hours = Math.max(1, lot.sellingGroup.paymentDeadlineHours || 24);
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);

    if (passengers.length > 0) {
      this.assertPassports(passengers, lot.flightSegmentId);
    }

    const bookingId = await this.prisma.$transaction(async (tx) => {
      const reference = await this.nextBkRef(tx);
      const booking = await tx.booking.create({
        data: {
          reference,
          accountId: actor.accountId,
          createdByUserId: actor.userId,
          supplierId: lot.sellingGroup.supplierId,
          seats,
          currency: lot.fareCurrency ?? lot.sellingGroup.currency,
          unitPrice: adultFare,
          totalPrice: fareSubtotal,
          fareSubtotalAmount: fareSubtotal,
          pricingSnapshot: {
            adultFare,
            childFare,
            infantFare,
            manifest,
          },
          inventoryLotId: lot.id,
          bookedAdults: manifest.adults,
          bookedChildren: manifest.children,
          bookedInfants: manifest.infants,
          status: 'DRAFT',
          paymentState: 'UNPAID',
          paymentDeadlineAt: deadline,
          heldUntil: deadline,
          holdExpiresAt: deadline,
          idempotencyKey,
          agentNotes: dto.agentNotes,
          passengers: {
            create: passengers.map((p) => this.passengerData(p)),
          },
          statusHistory: {
            create: { to: 'DRAFT', actorRealm: 'PARTNER', actorId: actor.userId },
          },
        },
      });

      await this.inventory.placeHold(tx, {
        lotId: lot.id,
        bookingId: booking.id,
        manifest,
        expiresAt: deadline,
        idempotencyKey,
      });

      const { primaryPnrId } = await this.pnrs.assignForNewHold(tx, {
        inventoryLotId: lot.id,
        bookingId: booking.id,
        seats,
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PAYMENT_PENDING',
          groupPnrId: primaryPnrId,
          pnrAssignedSeatCount: seats,
          version: { increment: 1 },
        },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          from: 'DRAFT',
          to: 'HELD',
          actorRealm: 'PARTNER',
          actorId: actor.userId,
        },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          from: 'HELD',
          to: 'PAYMENT_PENDING',
          actorRealm: 'PARTNER',
          actorId: actor.userId,
        },
      });

      // Payable stub (AirDesk CREATED → gnk PENDING) so agents can allocate bank proof.
      await tx.payment.create({
        data: {
          reference: await this.sequences.next('PAYMENT', tx),
          accountId: actor.accountId,
          bookingId: booking.id,
          method: 'BANK_TRANSFER',
          status: 'PENDING',
          amount: fareSubtotal,
          currency: lot.fareCurrency ?? lot.sellingGroup.currency,
          notes: `Hold stub for ${reference}`,
          submittedById: actor.userId,
          allocations: {
            create: [{ bookingId: booking.id, amount: fareSubtotal }],
          },
        },
      });

      // Auto-queue infant seat concession when infants are booked (§7.4).
      if (manifest.infants > 0) {
        await tx.bookingConcessionRequest.create({
          data: {
            accountId: actor.accountId,
            bookingId: booking.id,
            kind: 'INFANT_SEATS',
            initiatedBy: 'AGENT',
            requestedInfantSeats: manifest.infants,
            reason: 'Auto-requested at checkout for infant seats',
          },
        });
      }

      return booking.id;
    });

    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.place_hold',
      entityType: 'Booking',
      entityId: bookingId,
      after: { seats, totalPrice: fareSubtotal },
      meta,
    });
    await this.changed(bookingId, actor.accountId);
    return this.partnerGet(actor, bookingId);
  }

  async confirm(actor: StaffActor, id: string, meta: RequestMeta) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (!['PAYMENT_PENDING', 'HELD', 'AWAITING_RECEIPT', 'RECEIPT_ADDED'].includes(b.status))
      throw new ConflictException('Booking cannot be confirmed in its current status');

    await this.prisma.$transaction(async (tx) => {
      await this.inventory.consumeHold(tx, id);
      await this.pnrs.confirmAllocations(tx, id);
      await this.pnrs.assignPassengersToPnrs(tx, id);
      await this.ledger.postInventoryBookingAccrual(
        tx,
        {
          id: b.id,
          reference: b.reference,
          accountId: b.accountId,
          seats: b.seats,
          totalPrice: b.totalPrice,
          supplierId: b.supplierId,
          supplierNetUnit: b.supplierNetUnit,
          markupUnit: b.markupUnit,
        },
        actor.userId,
      );
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          paymentState: num(b.amountPaid) >= num(b.totalPrice) ? 'PAID' : b.paymentState,
          version: { increment: 1 },
        },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: id,
          from: b.status,
          to: 'CONFIRMED',
          actorRealm: 'STAFF',
          actorId: actor.userId,
        },
      });
    });

    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.confirm',
      entityType: 'Booking',
      entityId: id,
      meta,
    });
    await this.changed(id, b.accountId);
    return this.adminGet(id);
  }

  async markTicketed(
    actor: StaffActor,
    id: string,
    tickets: { passengerId: string; ticketNumber: string }[],
    meta: RequestMeta,
  ) {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: { passengers: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'CONFIRMED')
      throw new ConflictException({ code: 'booking.ticketing_requires_confirmed_inventory' });

    const expected =
      (b.bookedAdults ?? 0) + (b.bookedChildren ?? 0) + (b.bookedInfants ?? 0) || b.seats;
    if (b.passengers.length < expected)
      throw new UnprocessableEntityException('Passenger manifest is incomplete');
    if (tickets.length !== b.passengers.length)
      throw new UnprocessableEntityException({ code: 'booking.ticket_assignment_count_mismatch' });

    const numbers = tickets.map((t) => t.ticketNumber.trim());
    if (new Set(numbers).size !== numbers.length)
      throw new UnprocessableEntityException({
        code: 'booking.ticket_number_duplicate_in_booking',
      });

    await this.prisma.$transaction(async (tx) => {
      for (const t of tickets) {
        const p = b.passengers.find((x) => x.id === t.passengerId);
        if (!p)
          throw new UnprocessableEntityException({
            code: 'booking.passenger_not_found_under_manifest',
          });
        await tx.passenger.update({
          where: { id: t.passengerId },
          data: { ticketNumber: t.ticketNumber.trim() },
        });
      }
      await this.pnrs.assignPassengersToPnrs(tx, id);
      await tx.booking.update({
        where: { id },
        data: { status: 'TICKETED', version: { increment: 1 } },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: id,
          from: 'CONFIRMED',
          to: 'TICKETED',
          actorRealm: 'STAFF',
          actorId: actor.userId,
        },
      });
    });

    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.ticket',
      entityType: 'Booking',
      entityId: id,
      meta,
    });
    await this.changed(id, b.accountId);
    return this.adminGet(id);
  }

  async cancelInventoryBooking(
    bookingId: string,
    actor: { realm: 'PARTNER' | 'STAFF'; id: string },
    reason: string,
    meta: RequestMeta,
  ) {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new NotFoundException('Booking not found');
    if (['CANCELLED', 'EXPIRED_HOLD', 'TICKETED'].includes(b.status))
      throw new ConflictException('Booking cannot be cancelled');

    await this.prisma.$transaction(async (tx) => {
      if (
        [
          'DRAFT',
          'QUOTED',
          'HELD',
          'PAYMENT_PENDING',
          'AWAITING_RECEIPT',
          'RECEIPT_ADDED',
        ].includes(b.status)
      ) {
        await this.inventory.releaseHold(tx, bookingId, 'RELEASE_HOLD');
        await this.pnrs.releaseAllocations(tx, bookingId);
      } else if (b.status === 'CONFIRMED' && actor.realm === 'STAFF') {
        // Revoke confirmed seats back to inventory (simplified: increment available totals).
        const holdsConsumed = await tx.inventoryMovement.findMany({
          where: { bookingId, movementType: 'CONFIRM' },
        });
        for (const m of holdsConsumed) {
          await tx.inventoryLot.update({
            where: { id: m.inventoryLotId },
            data: {
              seatsConfirmed: { decrement: Math.max(0, m.seatsDelta) },
              seatsTotal: { increment: 0 },
              rowVersion: { increment: 1 },
            },
          });
          await tx.inventoryMovement.create({
            data: {
              inventoryLotId: m.inventoryLotId,
              bookingId,
              movementType: 'CANCEL_BOOKING_ADJUSTMENT',
              seatsDelta: -m.seatsDelta,
            },
          });
        }
        await this.pnrs.releaseAllocations(tx, bookingId);
      } else {
        throw new ConflictException('Booking cannot be cancelled in its current status');
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          rejectionReason: reason,
          version: { increment: 1 },
        },
      });
      await tx.bookingStatusEvent.create({
        data: {
          bookingId,
          from: b.status,
          to: 'CANCELLED',
          actorRealm: actor.realm,
          actorId: actor.id,
          reason,
        },
      });
      await tx.payment.updateMany({
        where: { bookingId, status: { in: ['PENDING', 'SUBMITTED'] } },
        data: { status: 'FAILED', rejectionReason: reason },
      });
      if (b.status === 'CONFIRMED') {
        try {
          await this.ledger.reverseBookingCharge(tx, b, actor.id);
        } catch {
          // No sale posted yet — ignore.
        }
      }
    });

    await this.audit.log({
      actor: { realm: actor.realm, userId: actor.id },
      action: 'booking.cancel',
      entityType: 'Booking',
      entityId: bookingId,
      after: { reason },
      meta,
    });
    await this.changed(bookingId, b.accountId);
  }

  async expireStaleHolds() {
    const now = new Date();
    const stale = await this.prisma.booking.findMany({
      where: {
        status: { in: ['HELD', 'PAYMENT_PENDING'] },
        heldUntil: { lt: now },
        inventoryLotId: { not: null },
      },
      take: 50,
    });
    for (const b of stale) {
      await this.prisma.$transaction(async (tx) => {
        await this.inventory.releaseHold(tx, b.id, 'HOLD_EXPIRED');
        await this.pnrs.releaseAllocations(tx, b.id);
        await tx.booking.update({
          where: { id: b.id },
          data: { status: 'EXPIRED_HOLD', version: { increment: 1 } },
        });
        await tx.bookingStatusEvent.create({
          data: { bookingId: b.id, from: b.status, to: 'EXPIRED_HOLD' },
        });
        // Cancel unpaid stubs / unsubmitted proof (AirDesk CREATED/AUTHORIZED cancel).
        await tx.payment.updateMany({
          where: {
            bookingId: b.id,
            status: { in: ['PENDING', 'SUBMITTED'] },
          },
          data: {
            status: 'FAILED',
            rejectionReason: 'Hold expired before payment was verified',
          },
        });
      });
      await this.changed(b.id, b.accountId);
    }
    return stale.length;
  }

  async setPassengersInventory(
    bookingId: string,
    passengers: PassengerInput[],
    actor: { realm: 'PARTNER' | 'STAFF'; id: string },
    meta: RequestMeta,
  ) {
    const b = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { inventoryLot: { include: { flightSegment: true } } },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status === 'TICKETED' || b.status === 'CANCELLED' || b.status === 'EXPIRED_HOLD')
      throw new ConflictException({ code: 'booking.passenger_edit_window_closed' });

    const manifest = {
      adults: b.bookedAdults ?? b.seats,
      children: b.bookedChildren ?? 0,
      infants: b.bookedInfants ?? 0,
    };
    if (
      !isPassengerPayloadWithinBookedManifest(
        passengers.map((p) => ({ passengerKind: p.type })),
        manifest,
      )
    ) {
      throw new UnprocessableEntityException('Passenger counts exceed booked seats');
    }
    this.assertPassports(
      passengers,
      b.inventoryLot?.flightSegmentId ?? '',
      b.inventoryLot?.flightSegment?.arrivalTimeUtc,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.passenger.deleteMany({ where: { bookingId } });
      await tx.passenger.createMany({
        data: passengers.map((p) => ({ bookingId, ...this.passengerData(p) })),
      });
      await this.pnrs.assignPassengersToPnrs(tx, bookingId);
      await tx.booking.update({ where: { id: bookingId }, data: { version: { increment: 1 } } });
    });

    await this.audit.log({
      actor: { realm: actor.realm, userId: actor.id },
      action: 'booking.set_passengers',
      entityType: 'Booking',
      entityId: bookingId,
      after: { count: passengers.length },
      meta,
    });
    await this.changed(bookingId, b.accountId);
  }

  async adjustDeadline(id: string, extensionMinutes: number, actor: StaffActor, meta: RequestMeta) {
    if (extensionMinutes % 15 !== 0 || Math.abs(extensionMinutes) > 1440)
      throw new BadRequestException({ code: 'booking.extension_minutes_invalid' });
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (!['HELD', 'PAYMENT_PENDING', 'AWAITING_RECEIPT', 'RECEIPT_ADDED'].includes(b.status))
      throw new ConflictException({ code: 'booking.extension_not_allowed_for_status' });

    const base = b.heldUntil ?? b.paymentDeadlineAt ?? new Date();
    const next = new Date(base.getTime() + extensionMinutes * 60_000);
    if (next.getTime() <= Date.now())
      throw new BadRequestException({ code: 'booking.deadline_must_be_future' });

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          heldUntil: next,
          paymentDeadlineAt: next,
          holdExpiresAt: next,
          version: { increment: 1 },
        },
      });
      await tx.inventoryHold.updateMany({
        where: { bookingId: id, status: 'ACTIVE' },
        data: { expiresAt: next },
      });
    });

    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.deadline_adjusted',
      entityType: 'Booking',
      entityId: id,
      after: { extensionMinutes, heldUntil: next.toISOString() },
      meta,
    });
    await this.changed(id, b.accountId);
    return this.adminGet(id);
  }

  /** Agent asks for more time; doesn't move the deadline — the platform adjusts it (or not). */
  async requestExtension(
    actor: PartnerActor,
    bookingId: string,
    dto: { minutes: number; reason?: string },
    meta: RequestMeta,
  ) {
    const b = await this.prisma.booking.findFirst({
      where: { id: bookingId, accountId: actor.accountId },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (!['HELD', 'PAYMENT_PENDING', 'AWAITING_RECEIPT', 'RECEIPT_ADDED'].includes(b.status))
      throw new ConflictException({ code: 'booking.extension_not_allowed_for_status' });

    await this.audit.log({
      actor: { realm: 'PARTNER', userId: actor.userId },
      action: 'booking.extension_requested',
      entityType: 'Booking',
      entityId: bookingId,
      after: { minutes: dto.minutes, reason: dto.reason },
      meta,
    });
    await this.notifications.notifyStaff('bookings:approve', {
      type: 'BOOKING_EXTENSION_REQUESTED',
      title: `Extension requested — ${b.reference}`,
      body: `${actor.accountName} requested +${dto.minutes} min${dto.reason ? `: ${dto.reason}` : ''}.`,
      link: `/bookings/${b.id}`,
    });
    return { message: 'Extension request sent to the platform.' };
  }

  async rejectExtension(
    actor: StaffActor,
    bookingId: string,
    reason: string | undefined,
    meta: RequestMeta,
  ) {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new NotFoundException('Booking not found');
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.extension_rejected',
      entityType: 'Booking',
      entityId: bookingId,
      after: { reason },
      meta,
    });
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_EXTENSION_REJECTED',
      title: `Extension declined — ${b.reference}`,
      body: reason?.trim() || 'Your deadline extension request was not approved.',
      link: `/bookings/${b.id}`,
      email: true,
    });
    return this.adminGet(bookingId);
  }

  async requestPassengers(actor: StaffActor, bookingId: string, meta: RequestMeta) {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new NotFoundException('Booking not found');
    if (
      !['CONFIRMED', 'PAYMENT_PENDING', 'HELD', 'AWAITING_RECEIPT', 'RECEIPT_ADDED'].includes(
        b.status,
      )
    )
      throw new ConflictException({ code: 'booking.request_passengers_not_allowed' });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { passengerDetailsRequestedAt: new Date(), version: { increment: 1 } },
    });
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'booking.passengers_requested',
      entityType: 'Booking',
      entityId: bookingId,
      meta,
    });
    await this.notifications.notifyAccount(b.accountId, {
      type: 'BOOKING_PASSENGERS_REQUESTED',
      title: `Passenger details needed — ${b.reference}`,
      body: 'Please add passport details for all passengers so we can issue tickets.',
      link: `/bookings/${b.id}`,
      email: true,
    });
    await this.changed(bookingId, b.accountId);
    return this.adminGet(bookingId);
  }

  async listConcessions(bookingId: string) {
    const rows = await this.prisma.bookingConcessionRequest.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
    return this.mapConcessions(rows);
  }

  /** Global concession queue for partner (own account) or platform (all). */
  async listConcessionQueue(opts: { accountId?: string; status?: 'REQUESTED' | 'all' } = {}) {
    const rows = await this.prisma.bookingConcessionRequest.findMany({
      where: {
        ...(opts.accountId ? { accountId: opts.accountId } : {}),
        ...(opts.status === 'all' ? {} : { status: opts.status ?? 'REQUESTED' }),
      },
      include: {
        booking: { select: { id: true, reference: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((r) => ({
      ...this.mapConcessions([r])[0],
      bookingReference: r.booking.reference,
      bookingStatus: r.booking.status,
    }));
  }

  private mapConcessions(
    rows: {
      id: string;
      bookingId: string;
      kind: string;
      status: string;
      initiatedBy: string;
      requestedChildSeats: number | null;
      approvedChildSeats: number | null;
      requestedInfantSeats: number | null;
      approvedInfantSeats: number | null;
      requestedDiscountAmount: unknown;
      approvedDiscountAmount: unknown;
      approvedPnrCode: string | null;
      reason: string | null;
      decisionNote: string | null;
      createdAt: Date;
      reviewedAt: Date | null;
    }[],
  ) {
    return rows.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      kind: r.kind,
      status: r.status,
      initiatedBy: r.initiatedBy,
      requestedChildSeats: r.requestedChildSeats,
      approvedChildSeats: r.approvedChildSeats,
      requestedInfantSeats: r.requestedInfantSeats,
      approvedInfantSeats: r.approvedInfantSeats,
      requestedDiscountAmount:
        r.requestedDiscountAmount != null ? num(r.requestedDiscountAmount as never) : null,
      approvedDiscountAmount:
        r.approvedDiscountAmount != null ? num(r.approvedDiscountAmount as never) : null,
      approvedPnrCode: r.approvedPnrCode,
      reason: r.reason,
      decisionNote: r.decisionNote,
      createdAt: iso(r.createdAt)!,
      reviewedAt: iso(r.reviewedAt),
    }));
  }

  async requestConcession(
    actor: PartnerActor,
    bookingId: string,
    dto: {
      kind: 'CHILD_SEATS' | 'INFANT_SEATS' | 'DISCOUNT';
      requestedChildSeats?: number;
      requestedInfantSeats?: number;
      requestedDiscountAmount?: number;
      reason?: string;
    },
  ) {
    const b = await this.prisma.booking.findFirst({
      where: { id: bookingId, accountId: actor.accountId },
    });
    if (!b) throw new NotFoundException('Booking not found');
    const pending = await this.prisma.bookingConcessionRequest.findFirst({
      where: { bookingId, kind: dto.kind, status: 'REQUESTED' },
    });
    if (pending)
      throw new ConflictException({ code: 'booking.concession_request_already_pending' });

    return this.prisma.bookingConcessionRequest.create({
      data: {
        accountId: actor.accountId,
        bookingId,
        kind: dto.kind,
        initiatedBy: 'AGENT',
        requestedChildSeats: dto.requestedChildSeats,
        requestedInfantSeats: dto.requestedInfantSeats,
        requestedDiscountAmount: dto.requestedDiscountAmount,
        reason: dto.reason,
      },
    });
  }

  async decideConcession(
    actor: StaffActor,
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    dto: {
      approvedChildSeats?: number;
      approvedInfantSeats?: number;
      approvedDiscountAmount?: number;
      decisionNote?: string;
      pnrCode?: string;
    },
  ) {
    const req = await this.prisma.bookingConcessionRequest.findUnique({ where: { id: requestId } });
    if (!req || req.status !== 'REQUESTED') throw new NotFoundException('Request not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bookingConcessionRequest.update({
        where: { id: requestId },
        data: {
          status: decision,
          reviewedById: actor.userId,
          reviewedAt: new Date(),
          decisionNote: dto.decisionNote,
          approvedChildSeats: dto.approvedChildSeats,
          approvedInfantSeats: dto.approvedInfantSeats,
          approvedDiscountAmount: dto.approvedDiscountAmount,
          approvedPnrCode: dto.pnrCode,
        },
      });
      if (decision === 'APPROVED') {
        const booking = await tx.booking.findUniqueOrThrow({ where: { id: req.bookingId } });
        if (req.kind === 'CHILD_SEATS') {
          const seats = dto.approvedChildSeats ?? req.requestedChildSeats ?? 0;
          await tx.booking.update({
            where: { id: booking.id },
            data: { grantedChildSeats: { increment: seats }, version: { increment: 1 } },
          });
          if (booking.inventoryLotId && seats > 0) {
            await tx.inventoryLot.update({
              where: { id: booking.inventoryLotId },
              data: { childSeatsTotal: { increment: seats }, rowVersion: { increment: 1 } },
            });
          }
        }
        if (req.kind === 'INFANT_SEATS') {
          const seats = dto.approvedInfantSeats ?? req.requestedInfantSeats ?? 0;
          await tx.booking.update({
            where: { id: booking.id },
            data: { grantedInfantSeats: { increment: seats }, version: { increment: 1 } },
          });
          if (booking.inventoryLotId && seats > 0) {
            await tx.inventoryLot.update({
              where: { id: booking.inventoryLotId },
              data: { infantSeatsTotal: { increment: seats }, rowVersion: { increment: 1 } },
            });
          }
          if (dto.pnrCode?.trim() && booking.inventoryLotId) {
            // Optional dedicated infant PNR on approve.
            const code = dto.pnrCode.trim().toUpperCase();
            const pnr = await tx.groupPnr.create({
              data: {
                sellingGroupId: (
                  await tx.inventoryLot.findUniqueOrThrow({ where: { id: booking.inventoryLotId } })
                ).sellingGroupId,
                inventoryLotId: booking.inventoryLotId,
                pnrCode: code,
                allocatedSeats: Math.max(1, seats),
                availableSeats: Math.max(1, seats),
                paxKind: 'INFANT',
                sortOrder: 99,
              },
            });
            await tx.bookingConcessionRequest.update({
              where: { id: requestId },
              data: { groupPnrId: pnr.id, approvedPnrCode: code },
            });
          }
        }
        if (req.kind === 'DISCOUNT') {
          const amount = dto.approvedDiscountAmount ?? num(req.requestedDiscountAmount);
          const totalPrice = Math.max(0, num(booking.fareSubtotalAmount) - amount);
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              discountAmount: amount,
              totalPrice,
              version: { increment: 1 },
            },
          });
          await tx.payment.updateMany({
            where: { bookingId: booking.id, status: 'PENDING' },
            data: { amount: totalPrice },
          });
          await tx.paymentAllocation.updateMany({
            where: {
              bookingId: booking.id,
              payment: { status: 'PENDING' },
            },
            data: { amount: totalPrice },
          });
        }
        if (req.kind === 'CHILD_SEATS' && dto.pnrCode?.trim() && booking.inventoryLotId) {
          const seats = dto.approvedChildSeats ?? req.requestedChildSeats ?? 0;
          const code = dto.pnrCode.trim().toUpperCase();
          const lot = await tx.inventoryLot.findUniqueOrThrow({
            where: { id: booking.inventoryLotId },
          });
          const pnr = await tx.groupPnr.create({
            data: {
              sellingGroupId: lot.sellingGroupId,
              inventoryLotId: lot.id,
              pnrCode: code,
              allocatedSeats: Math.max(1, seats),
              availableSeats: Math.max(1, seats),
              paxKind: 'CHILD',
              sortOrder: 50,
            },
          });
          await tx.bookingConcessionRequest.update({
            where: { id: requestId },
            data: { groupPnrId: pnr.id, approvedPnrCode: code },
          });
        }
      }
      return updated;
    });
  }

  private async partnerGet(actor: PartnerActor, id: string) {
    const b = await this.prisma.booking.findFirst({
      where: { id, accountId: actor.accountId },
      include: BookingMapper.detailInclude,
    });
    if (!b) throw new NotFoundException('Booking not found');
    return this.mapper.toPartnerDetail(b, new Map(), true);
  }

  private async adminGet(id: string) {
    const b = await this.prisma.booking.findFirst({
      where: { id },
      include: BookingMapper.detailInclude,
    });
    if (!b) throw new NotFoundException('Booking not found');
    return this.mapper.toListItem(b, new Map(), false);
  }

  private passengerData(p: PassengerInput) {
    return {
      type: p.type,
      title: p.title,
      firstName: p.firstName.toUpperCase(),
      lastName: p.lastName.toUpperCase(),
      gender: p.gender,
      dateOfBirth: new Date(`${p.dateOfBirth}T00:00:00Z`),
      nationality: p.nationality.toUpperCase().slice(0, 2),
      passportNumberEnc: this.crypto.encrypt(p.passportNumber.toUpperCase()),
      passportLast4: p.passportNumber.toUpperCase().slice(-4),
      passportExpiry: new Date(`${p.passportExpiry}T00:00:00Z`),
    };
  }

  private assertPassports(
    passengers: PassengerInput[],
    _flightSegmentId: string,
    returnOrArrive?: Date | null,
  ) {
    const returnDate = isoDate(returnOrArrive ?? new Date(Date.now() + 90 * 86400000))!;
    const expiring = passengers.findIndex(
      (p) => (p.passportExpiry as string) < addMonths(returnDate, 6),
    );
    if (expiring >= 0) {
      throw new UnprocessableEntityException({
        message: 'Passports must be valid for 6 months after the return date',
        code: 'VALIDATION_FAILED',
        errors: [
          {
            path: `passengers.${expiring}.passportExpiry`,
            message: 'Must be valid 6 months after return',
          },
        ],
      });
    }
  }

  private async nextBkRef(tx: Tx) {
    for (let i = 0; i < 5; i++) {
      const hex = Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .toUpperCase()
        .padStart(6, '0');
      const reference = `BK-${hex}`;
      const clash = await tx.booking.findUnique({ where: { reference } });
      if (!clash) return reference;
    }
    return this.sequences.next('BOOKING', tx);
  }

  private async changed(id: string, accountId: string) {
    this.realtime.publish({ topic: 'booking', id }, { realm: 'PARTNER', accountId });
    this.realtime.publish(
      { topic: 'booking', id },
      { realm: 'STAFF', permission: 'bookings:read' },
    );
  }
}
