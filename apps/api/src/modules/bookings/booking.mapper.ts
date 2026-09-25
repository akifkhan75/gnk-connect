import { Injectable } from '@nestjs/common';
import type { BookingStatus, Prisma } from '@prisma/client';
import type {
  AdminBookingDetailDto,
  AdminBookingListItem,
  BalanceDto,
  BookingDetailDto,
  BookingListItem,
  FlightLegDto,
  PassengerDto,
  PaymentDto,
  ProductContentDto,
  TimelineEvent,
} from '@gnk/types';
import { maskTail } from '@gnk/validation';
import { iso, isoDate, num } from '../../core/money';
import type { StaffActor } from '../auth/auth.types';

/** Statuses partners see. Internal supplier states collapse into "submitted to supplier". */
export function partnerStatus(s: BookingStatus): BookingStatus {
  return s === 'SUPPLIER_FAILED' || s === 'SUPPLIER_PENDING' ? 'SUBMITTED_TO_SUPPLIER' : s;
}

const listInclude = {
  product: { select: { title: true, sector: true, airline: true, content: true } },
  departure: { select: { departureDate: true, returnDate: true, baggage: true } },
  account: {
    select: { id: true, code: true, legalName: true, tradeName: true, phone: true, email: true },
  },
  passengers: {
    select: { firstName: true, lastName: true, title: true },
    take: 1,
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.BookingInclude;

const detailInclude = {
  ...listInclude,
  passengers: { orderBy: { id: 'asc' } },
  statusHistory: { orderBy: { createdAt: 'asc' } },
  invoice: true,
  payments: { orderBy: { createdAt: 'desc' } },
  supplierCalls: { orderBy: { createdAt: 'desc' }, take: 20 },
} satisfies Prisma.BookingInclude;

export type BookingListRow = Prisma.BookingGetPayload<{ include: typeof listInclude }>;
export type BookingDetailRow = Prisma.BookingGetPayload<{ include: typeof detailInclude }>;

export function paymentDto(
  p:
    | Prisma.PaymentGetPayload<{ include: { Booking: { select: { reference: true } } } }>
    | (Prisma.PaymentGetPayload<object> & { Booking?: { reference: string } | null }),
): PaymentDto {
  return {
    id: p.id,
    reference: p.reference,
    method: p.method,
    status: p.status,
    amount: num(p.amount),
    bankName: p.bankName,
    transactionRef: p.transactionRef,
    paidAt: isoDate(p.paidAt),
    bookingId: p.bookingId,
    bookingReference: p.Booking?.reference ?? null,
    proofFileId: p.proofFileId,
    rejectionReason: p.rejectionReason,
    createdAt: iso(p.createdAt)!,
    verifiedAt: iso(p.verifiedAt),
  };
}

@Injectable()
export class BookingMapper {
  static readonly listInclude = listInclude;
  static readonly detailInclude = detailInclude;

  toListItem(
    b: BookingListRow,
    names: Map<string, string> = new Map(),
    forPartner = true,
  ): BookingListItem {
    const lead = b.passengers[0];
    return {
      id: b.id,
      reference: b.reference,
      status: forPartner ? partnerStatus(b.status) : b.status,
      paymentState: b.paymentState,
      title: b.product.title,
      sector: b.product.sector,
      airline: b.product.airline,
      departureDate: isoDate(b.departure.departureDate)!,
      seats: b.seats,
      totalPrice: num(b.totalPrice),
      createdAt: iso(b.createdAt)!,
      createdByName: names.get(b.createdByUserId) ?? '—',
      leadPassenger: lead ? `${lead.title} ${lead.firstName} ${lead.lastName}` : null,
    };
  }

  toAdminListItem(
    b: BookingListRow,
    names: Map<string, string>,
    actor: StaffActor,
  ): AdminBookingListItem {
    return {
      ...this.toListItem(b, names, false),
      accountId: b.account.id,
      accountName: b.account.tradeName || b.account.legalName,
      accountCode: b.account.code,
      supplierBookingRef: b.supplierBookingRef,
      margin: actor.permissions.has('bookings:view_supplier_net')
        ? num(b.markupUnit) * b.seats
        : null,
    };
  }

  private passengers(b: BookingDetailRow): PassengerDto[] {
    return b.passengers.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: isoDate(p.dateOfBirth)!,
      nationality: p.nationality,
      passportMasked: maskTail(p.passportLast4),
      passportExpiry: isoDate(p.passportExpiry)!,
    }));
  }

  private timeline(
    b: BookingDetailRow,
    forPartner: boolean,
    names: Map<string, string>,
  ): TimelineEvent[] {
    const events = b.statusHistory.map((e) => ({
      status: forPartner ? partnerStatus(e.to) : e.to,
      at: iso(e.createdAt)!,
      note:
        forPartner && (e.to === 'SUPPLIER_FAILED' || e.to === 'SUPPLIER_PENDING') ? null : e.reason,
      actor: forPartner ? undefined : e.actorId ? (names.get(e.actorId) ?? null) : 'System',
    }));
    // Partners shouldn't see repeated "processing" steps caused by internal retries.
    return forPartner
      ? events.filter((e, i) => i === 0 || e.status !== events[i - 1].status)
      : events;
  }

  private legs(b: BookingListRow) {
    const c = b.product.content as unknown as ProductContentDto;
    return {
      outbound: (c?.outbound as FlightLegDto) ?? null,
      inbound: (c?.inbound as FlightLegDto) ?? null,
    };
  }

  toPartnerDetail(
    b: BookingDetailRow,
    names: Map<string, string>,
    canCancel: boolean,
  ): BookingDetailDto {
    return {
      ...this.toListItem(b, names),
      productId: b.productId,
      returnDate: isoDate(b.departure.returnDate),
      baggage: b.departure.baggage,
      unitPrice: num(b.unitPrice),
      amountPaid: num(b.amountPaid),
      pnr: ['CONFIRMED', 'COMPLETED'].includes(b.status) ? b.supplierPnr : null,
      agentNotes: b.agentNotes,
      rejectionReason: b.rejectionReason,
      passengers: this.passengers(b),
      timeline: this.timeline(b, true, names),
      invoice:
        b.invoice && !b.invoice.voidedAt ? { id: b.invoice.id, number: b.invoice.number } : null,
      ...this.legs(b),
      canCancel,
    };
  }

  toAdminDetail(
    b: BookingDetailRow,
    names: Map<string, string>,
    actor: StaffActor,
    extra: {
      supplierName: string;
      balance: BalanceDto;
      allowedActions: AdminBookingDetailDto['allowedActions'];
    },
  ): AdminBookingDetailDto {
    const seeNet = actor.permissions.has('bookings:view_supplier_net');
    const { canCancel: _omit, ...base } = this.toPartnerDetail(b, names, false);
    return {
      ...base,
      status: b.status,
      pnr: b.supplierPnr,
      timeline: this.timeline(b, false, names),
      account: {
        id: b.account.id,
        code: b.account.code,
        name: b.account.tradeName || b.account.legalName,
        phone: b.account.phone,
        email: b.account.email,
      },
      balance: extra.balance,
      supplierName: extra.supplierName,
      supplierBookingRef: b.supplierBookingRef,
      departureId: b.departureId,
      priceAudit: seeNet
        ? {
            supplierNetUnit: num(b.supplierNetUnit),
            markupUnit: num(b.markupUnit),
            margin: num(b.markupUnit) * b.seats,
            snapshot: b.pricingSnapshot,
            quotedAt: iso(b.createdAt)!,
          }
        : null,
      internalNotes: b.internalNotes,
      payments: b.payments.map((p) => paymentDto({ ...p, Booking: { reference: b.reference } })),
      supplierCalls:
        actor.permissions.has('suppliers:read') || actor.permissions.has('bookings:push_supplier')
          ? b.supplierCalls.map((c) => ({
              id: c.id,
              operation: c.operation,
              responseCode: c.responseCode,
              errorKind: c.errorKind,
              durationMs: c.durationMs,
              requestBody: c.requestBody,
              responseBody: c.responseBody,
              createdAt: iso(c.createdAt)!,
            }))
          : [],
      allowedActions: extra.allowedActions,
    };
  }
}
