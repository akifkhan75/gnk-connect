import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BookingSequenceService } from './booking-sequence.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { PricingService } from '../pricing/pricing.service';
import { PaxType, Gender, Title } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: BookingSequenceService,
    private readonly suppliersService: SuppliersService,
    private readonly pricingService: PricingService,
  ) {}

  async createBooking(data: {
    accountId: string;
    userId: string;
    quoteId: string;
    idempotencyKey: string;
    passengers: any[];
    agentNotes?: string;
  }) {
    // 1. Idempotency Check
    const existing = await this.prisma.booking.findUnique({
      where: {
        accountId_idempotencyKey: {
          accountId: data.accountId,
          idempotencyKey: data.idempotencyKey,
        }
      }
    });
    if (existing) {
      return existing;
    }

    // 2. Fetch Quote
    const quote = await this.prisma.priceQuote.findUnique({
      where: { id: data.quoteId },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.consumedAt) throw new ConflictException('Quote already consumed');
    if (new Date(quote.expiresAt) < new Date()) throw new ConflictException('Quote expired');
    if (quote.accountId !== data.accountId) throw new ConflictException('Quote belongs to a different account');
    if (quote.seats !== data.passengers.length) throw new ConflictException('Passenger count does not match quote');

    // 3. Fetch Departure & Product
    const departure = await this.prisma.departure.findUnique({
      where: { id: quote.departureId },
      include: { product: true }
    });
    if (!departure) throw new NotFoundException('Departure not found');

    // 4. Generate Reference
    const reference = await this.sequenceService.getNextReference();

    // 5. Transaction: Consume quote, lock seats, create booking
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Optimistic locking for Departure seats
        const depLock = await tx.departure.updateMany({
          where: {
            id: departure.id,
            version: departure.version,
            supplierAvailable: { gte: quote.seats }
          },
          data: {
            heldSeats: departure.heldSeats + quote.seats,
            version: departure.version + 1
          }
        });

        if (depLock.count === 0) {
          throw new ConflictException('Seats are no longer available or departure was modified');
        }

        // Mark quote consumed
        await tx.priceQuote.update({
          where: { id: quote.id },
          data: { consumedAt: new Date() }
        });

        // Create booking
        const booking = await tx.booking.create({
          data: {
            reference,
            accountId: data.accountId,
            createdByUserId: data.userId,
            supplierId: departure.product.supplierId,
            productId: departure.productId,
            departureId: departure.id,
            seats: quote.seats,
            currency: 'PKR',
            supplierNetUnit: quote.supplierNet,
            markupUnit: quote.markup,
            unitPrice: quote.unitPrice,
            totalPrice: quote.totalPrice,
            pricingSnapshot: quote.breakdown as any,
            quoteId: quote.id,
            status: 'PENDING_APPROVAL',
            paymentState: 'UNPAID',
            idempotencyKey: data.idempotencyKey,
            agentNotes: data.agentNotes,
            passengers: {
              create: data.passengers.map(p => ({
                type: p.type as PaxType,
                title: p.title as Title,
                firstName: p.firstName,
                lastName: p.lastName,
                gender: p.gender as Gender,
                dateOfBirth: new Date(p.dateOfBirth),
                nationality: p.nationality,
                passportNumberEnc: 'enc_' + p.passportNumber, // simplified
                passportLast4: p.passportNumber.slice(-4),
                passportExpiry: new Date(p.passportExpiry),
              }))
            },
            statusHistory: {
              create: {
                to: 'PENDING_APPROVAL',
                actorRealm: 'PARTNER',
                actorId: data.userId,
              }
            }
          },
          include: { passengers: true }
        });

        return booking;
      });

      return result;
    } catch (e: any) {
      if (e instanceof ConflictException) throw e;
      throw new Error(`Booking failed: ${e.message}`);
    }
  }

  async approveBooking(bookingId: string, adminId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'PENDING_APPROVAL') throw new ConflictException('Booking not in pending state');

    // Here we can either push to supplier automatically or wait for payment.
    // Roadmap says "requires APPROVED + PAID or credit".
    const updated = await this.prisma.booking.update({
      where: { id: booking.id, version: booking.version },
      data: {
        status: 'APPROVED',
        version: booking.version + 1,
        statusHistory: {
          create: {
            from: 'PENDING_APPROVAL',
            to: 'APPROVED',
            actorRealm: 'STAFF',
            actorId: adminId,
          }
        }
      }
    });

    return updated;
  }
}
