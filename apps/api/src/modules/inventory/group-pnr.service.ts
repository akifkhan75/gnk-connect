import { ConflictException, Injectable } from '@nestjs/common';
import type { GroupPnr, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

function deriveStatus(
  p: Pick<GroupPnr, 'availableSeats' | 'allocatedSeats' | 'isActive'>,
): GroupPnr['status'] {
  if (!p.isActive) return 'INACTIVE';
  if (p.availableSeats <= 0) return 'FULL';
  if (p.availableSeats / Math.max(1, p.allocatedSeats) <= 0.1) return 'LOW_INVENTORY';
  return 'AVAILABLE';
}

@Injectable()
export class GroupPnrService {
  constructor(private readonly prisma: PrismaService) {}

  /** Greedy split of seat count across active PNRs in sortOrder. */
  async assignForNewHold(
    tx: Tx,
    params: { inventoryLotId: string; bookingId: string; seats: number },
  ) {
    if (params.seats <= 0) return { allocations: [], primaryPnrId: null as string | null };

    const pnrs = await tx.$queryRaw<GroupPnr[]>`
      SELECT * FROM "GroupPnr"
      WHERE "inventoryLotId" = ${params.inventoryLotId}::uuid
        AND "deletedAt" IS NULL AND "isActive" = true
      ORDER BY "sortOrder" ASC, "createdAt" ASC
      FOR UPDATE`;

    if (pnrs.length === 0) return { allocations: [], primaryPnrId: null as string | null };

    let remaining = params.seats;
    const splits: { pnr: GroupPnr; seats: number }[] = [];
    for (const pnr of pnrs) {
      if (remaining <= 0) break;
      const free = Math.max(0, pnr.availableSeats);
      if (free <= 0) continue;
      const take = Math.min(free, remaining);
      splits.push({ pnr, seats: take });
      remaining -= take;
    }
    if (remaining > 0) throw new ConflictException({ code: 'group_pnr.overflow_all_full' });

    const allocations: {
      id: string;
      bookingId: string;
      groupPnrId: string;
      heldSeats: number;
      confirmedSeats: number;
    }[] = [];
    for (const s of splits) {
      const availableSeats = s.pnr.availableSeats - s.seats;
      const heldSeats = s.pnr.heldSeats + s.seats;
      const bookedSeats = heldSeats + s.pnr.confirmedSeats;
      await tx.groupPnr.update({
        where: { id: s.pnr.id },
        data: {
          availableSeats,
          heldSeats,
          bookedSeats,
          status: deriveStatus({
            availableSeats,
            allocatedSeats: s.pnr.allocatedSeats,
            isActive: s.pnr.isActive,
          }),
          rowVersion: { increment: 1 },
        },
      });
      const alloc = await tx.bookingPnrAllocation.create({
        data: {
          bookingId: params.bookingId,
          groupPnrId: s.pnr.id,
          heldSeats: s.seats,
          confirmedSeats: 0,
        },
      });
      allocations.push(alloc);
    }

    const primary = splits.reduce((a, b) => (b.seats > a.seats ? b : a), splits[0]);
    return { allocations, primaryPnrId: primary?.pnr.id ?? null };
  }

  async releaseAllocations(tx: Tx, bookingId: string) {
    const allocs = await tx.bookingPnrAllocation.findMany({ where: { bookingId } });
    for (const a of allocs) {
      const pnr = await tx.groupPnr.findUniqueOrThrow({ where: { id: a.groupPnrId } });
      const heldSeats = Math.max(0, pnr.heldSeats - a.heldSeats);
      const confirmedSeats = Math.max(0, pnr.confirmedSeats - a.confirmedSeats);
      const bookedSeats = heldSeats + confirmedSeats;
      const availableSeats = Math.max(0, pnr.allocatedSeats - bookedSeats);
      await tx.groupPnr.update({
        where: { id: pnr.id },
        data: {
          heldSeats,
          confirmedSeats,
          bookedSeats,
          availableSeats,
          status: deriveStatus({
            availableSeats,
            allocatedSeats: pnr.allocatedSeats,
            isActive: pnr.isActive,
          }),
          rowVersion: { increment: 1 },
        },
      });
    }
    await tx.bookingPnrAllocation.deleteMany({ where: { bookingId } });
  }

  async confirmAllocations(tx: Tx, bookingId: string) {
    const allocs = await tx.bookingPnrAllocation.findMany({ where: { bookingId } });
    for (const a of allocs) {
      if (a.heldSeats <= 0) continue;
      const pnr = await tx.groupPnr.findUniqueOrThrow({ where: { id: a.groupPnrId } });
      const heldSeats = Math.max(0, pnr.heldSeats - a.heldSeats);
      const confirmedSeats = pnr.confirmedSeats + a.heldSeats;
      const bookedSeats = heldSeats + confirmedSeats;
      await tx.groupPnr.update({
        where: { id: pnr.id },
        data: {
          heldSeats,
          confirmedSeats,
          bookedSeats,
          rowVersion: { increment: 1 },
        },
      });
      await tx.bookingPnrAllocation.update({
        where: { id: a.id },
        data: { heldSeats: 0, confirmedSeats: a.confirmedSeats + a.heldSeats },
      });
    }
  }

  /**
   * Map passengers onto BookingPnrAllocation capacity (kind-aware), setting Passenger.groupPnrId.
   * Infants without an INFANT PNR seat ride with the last seated adult/child PNR.
   */
  async assignPassengersToPnrs(tx: Tx, bookingId: string) {
    const allocations = await tx.bookingPnrAllocation.findMany({
      where: { bookingId },
      include: {
        groupPnr: { select: { id: true, sortOrder: true, createdAt: true, paxKind: true } },
      },
      orderBy: [{ groupPnr: { sortOrder: 'asc' } }, { groupPnr: { createdAt: 'asc' } }],
    });
    if (allocations.length === 0) return;

    const passengers = await tx.passenger.findMany({
      where: { bookingId },
      orderBy: { id: 'asc' },
    });
    if (passengers.length === 0) return;

    const capacityByPnr = new Map<string, number>();
    for (const a of allocations) {
      capacityByPnr.set(a.groupPnrId, a.heldSeats + a.confirmedSeats);
    }

    const seatableFor = (kind: 'ADULT' | 'CHILD' | 'INFANT') => {
      const wanted = kind;
      const own = allocations.filter((r) => r.groupPnr.paxKind === wanted);
      const general = allocations.filter((r) => r.groupPnr.paxKind == null);
      return [...own, ...general];
    };

    let lastSeatPnrId: string | null = null;
    for (const passenger of passengers) {
      let assignedPnrId: string | null = null;
      const candidates = seatableFor(passenger.type);

      if (passenger.type === 'INFANT') {
        const infantSeat = candidates.find(
          (r) => r.groupPnr.paxKind === 'INFANT' && (capacityByPnr.get(r.groupPnrId) ?? 0) > 0,
        );
        if (infantSeat) {
          assignedPnrId = infantSeat.groupPnrId;
          capacityByPnr.set(
            infantSeat.groupPnrId,
            (capacityByPnr.get(infantSeat.groupPnrId) ?? 0) - 1,
          );
        } else {
          assignedPnrId = lastSeatPnrId;
        }
      } else {
        for (const allocation of candidates) {
          const remaining = capacityByPnr.get(allocation.groupPnrId) ?? 0;
          if (remaining <= 0) continue;
          assignedPnrId = allocation.groupPnrId;
          capacityByPnr.set(allocation.groupPnrId, remaining - 1);
          lastSeatPnrId = allocation.groupPnrId;
          break;
        }
      }

      if (assignedPnrId == null || assignedPnrId === passenger.groupPnrId) continue;
      await tx.passenger.update({
        where: { id: passenger.id },
        data: { groupPnrId: assignedPnrId },
      });
    }
  }
}
