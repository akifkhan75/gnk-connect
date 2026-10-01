import { inventorySeatCount, isSeatManifestValid, type BookingSeatManifest } from '@gnk/validation';
import type { InventoryLot, Prisma } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class InventoryEngineService {
  constructor(private readonly prisma: PrismaService) {}

  adultAvailable(lot: Pick<InventoryLot, 'seatsTotal' | 'seatsHeld' | 'seatsConfirmed'>) {
    return Math.max(0, lot.seatsTotal - lot.seatsHeld - lot.seatsConfirmed);
  }

  childAvailable(
    lot: Pick<InventoryLot, 'childSeatsTotal' | 'childSeatsHeld' | 'childSeatsConfirmed'>,
  ) {
    return Math.max(0, lot.childSeatsTotal - lot.childSeatsHeld - lot.childSeatsConfirmed);
  }

  infantAvailable(
    lot: Pick<InventoryLot, 'infantSeatsTotal' | 'infantSeatsHeld' | 'infantSeatsConfirmed'>,
  ) {
    return Math.max(0, lot.infantSeatsTotal - lot.infantSeatsHeld - lot.infantSeatsConfirmed);
  }

  async lockLot(tx: Tx, lotId: string) {
    const rows = await tx.$queryRaw<InventoryLot[]>`
      SELECT * FROM "InventoryLot" WHERE id = ${lotId}::uuid FOR UPDATE`;
    const lot = rows[0];
    if (!lot || lot.deletedAt) throw new NotFoundException({ code: 'inventory_lot.not_found' });
    return lot;
  }

  assertCanHold(lot: InventoryLot, manifest: BookingSeatManifest) {
    if (lot.status === 'FROZEN')
      throw new ConflictException({ code: 'inventory_lot.frozen_no_new_holds' });
    if (lot.status === 'CLOSED')
      throw new ConflictException({ code: 'inventory_lot.closed_no_new_holds' });
    if (this.adultAvailable(lot) < manifest.adults)
      throw new ConflictException({
        code: 'inventory.adult_pool_oversell_prevented',
        details: { available: this.adultAvailable(lot) },
      });
    if (manifest.children > 0 && this.childAvailable(lot) < manifest.children) {
      // Children may also consume adult pool when no dedicated child pool.
      if (lot.childSeatsTotal <= 0) {
        if (this.adultAvailable(lot) < manifest.adults + manifest.children)
          throw new ConflictException({
            code: 'inventory.adult_pool_oversell_prevented',
            details: { available: this.adultAvailable(lot) },
          });
      } else {
        throw new ConflictException({
          code: 'inventory.child_pool_oversell_prevented',
          details: { available: this.childAvailable(lot) },
        });
      }
    }
    if (manifest.infants > 0) {
      if (lot.infantSeatsTotal <= 0 && lot.infantFareAmount == null) {
        // Infants allowed as lap without inventory when no infant fare/pool configured.
      } else if (this.infantAvailable(lot) < manifest.infants) {
        throw new ConflictException({
          code: 'inventory.infant_pool_oversell_prevented',
          details: { available: this.infantAvailable(lot) },
        });
      }
    }
  }

  async placeHold(
    tx: Tx,
    params: {
      lotId: string;
      bookingId: string;
      manifest: BookingSeatManifest;
      expiresAt: Date;
      idempotencyKey?: string;
    },
  ) {
    if (!isSeatManifestValid(params.manifest))
      throw new BadRequestException({ code: 'booking.place_requires_seat_manifest' });

    const lot = await this.lockLot(tx, params.lotId);
    this.assertCanHold(lot, params.manifest);

    const useChildPool = lot.childSeatsTotal > 0;
    const adultsHeld = params.manifest.adults + (useChildPool ? 0 : params.manifest.children);
    const childrenHeld = useChildPool ? params.manifest.children : 0;
    const infantsHeld = lot.infantSeatsTotal > 0 ? params.manifest.infants : 0;
    const seatsHeld = inventorySeatCount(params.manifest);

    const hold = await tx.inventoryHold.create({
      data: {
        inventoryLotId: lot.id,
        bookingId: params.bookingId,
        seatsHeld,
        adultsHeld,
        childrenHeld,
        infantsHeld,
        status: 'ACTIVE',
        expiresAt: params.expiresAt,
        idempotencyKey: params.idempotencyKey,
      },
    });

    await tx.inventoryLot.update({
      where: { id: lot.id },
      data: {
        seatsHeld: { increment: adultsHeld },
        childSeatsHeld: childrenHeld ? { increment: childrenHeld } : undefined,
        infantSeatsHeld: infantsHeld ? { increment: infantsHeld } : undefined,
        rowVersion: { increment: 1 },
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryLotId: lot.id,
        bookingId: params.bookingId,
        movementType: 'HOLD',
        seatsDelta: seatsHeld,
        correlationType: 'booking',
        correlationId: params.bookingId,
      },
    });

    return hold;
  }

  async releaseHold(tx: Tx, bookingId: string, reason: 'RELEASE_HOLD' | 'HOLD_EXPIRED') {
    const holds = await tx.inventoryHold.findMany({
      where: { bookingId, status: 'ACTIVE' },
    });
    for (const hold of holds) {
      await tx.inventoryHold.update({
        where: { id: hold.id },
        data: {
          status: reason === 'HOLD_EXPIRED' ? 'EXPIRED' : 'RELEASED',
          releasedAt: new Date(),
        },
      });
      await tx.inventoryLot.update({
        where: { id: hold.inventoryLotId },
        data: {
          seatsHeld: { decrement: hold.adultsHeld },
          childSeatsHeld: hold.childrenHeld ? { decrement: hold.childrenHeld } : undefined,
          infantSeatsHeld: hold.infantsHeld ? { decrement: hold.infantsHeld } : undefined,
          rowVersion: { increment: 1 },
        },
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryLotId: hold.inventoryLotId,
          bookingId,
          movementType: reason,
          seatsDelta: -hold.seatsHeld,
          correlationType: 'booking',
          correlationId: bookingId,
        },
      });
    }
    return holds.length;
  }

  async consumeHold(tx: Tx, bookingId: string) {
    const holds = await tx.inventoryHold.findMany({
      where: { bookingId, status: 'ACTIVE' },
    });
    for (const hold of holds) {
      await tx.inventoryHold.update({
        where: { id: hold.id },
        data: { status: 'CONSUMED', releasedAt: new Date() },
      });
      await tx.inventoryLot.update({
        where: { id: hold.inventoryLotId },
        data: {
          seatsHeld: { decrement: hold.adultsHeld },
          seatsConfirmed: { increment: hold.adultsHeld },
          childSeatsHeld: hold.childrenHeld ? { decrement: hold.childrenHeld } : undefined,
          childSeatsConfirmed: hold.childrenHeld ? { increment: hold.childrenHeld } : undefined,
          infantSeatsHeld: hold.infantsHeld ? { decrement: hold.infantsHeld } : undefined,
          infantSeatsConfirmed: hold.infantsHeld ? { increment: hold.infantsHeld } : undefined,
          rowVersion: { increment: 1 },
        },
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryLotId: hold.inventoryLotId,
          bookingId,
          movementType: 'CONFIRM',
          seatsDelta: hold.seatsHeld,
          correlationType: 'booking',
          correlationId: bookingId,
        },
      });
    }
    return holds.length;
  }
}
