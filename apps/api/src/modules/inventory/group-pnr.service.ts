import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { GroupPnr, GroupPnrPaxKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

/** Where the newly granted/moved seats sit today, mirrors the booking's lifecycle stage. */
export type ConcessionInventoryMode = 'pool_only' | 'held' | 'confirmed';

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

  // ---------- Platform concession ops (simplified, single-tenant) ----------

  /** Grant a dedicated child-seat PNR for a concession. Bumps the booking's PNR allocation. */
  async appendChildSeatPnr(
    tx: Tx,
    params: {
      inventoryLotId: string;
      bookingId: string;
      childSeats: number;
      pnrCode?: string;
      inventoryMode: ConcessionInventoryMode;
    },
  ) {
    return this.appendSeatPnr(tx, {
      inventoryLotId: params.inventoryLotId,
      bookingId: params.bookingId,
      seats: params.childSeats,
      pnrCode: params.pnrCode,
      inventoryMode: params.inventoryMode,
      paxKind: 'CHILD',
    });
  }

  /** Grant a dedicated infant-seat PNR for a concession. Bumps the booking's PNR allocation. */
  async appendInfantSeatPnr(
    tx: Tx,
    params: {
      inventoryLotId: string;
      bookingId: string;
      infantSeats: number;
      pnrCode?: string;
      inventoryMode: ConcessionInventoryMode;
    },
  ) {
    return this.appendSeatPnr(tx, {
      inventoryLotId: params.inventoryLotId,
      bookingId: params.bookingId,
      seats: params.infantSeats,
      pnrCode: params.pnrCode,
      inventoryMode: params.inventoryMode,
      paxKind: 'INFANT',
    });
  }

  private async appendSeatPnr(
    tx: Tx,
    params: {
      inventoryLotId: string;
      bookingId: string;
      seats: number;
      pnrCode?: string;
      inventoryMode: ConcessionInventoryMode;
      paxKind: GroupPnrPaxKind;
    },
  ) {
    if (params.seats <= 0)
      throw new BadRequestException({ code: 'group_pnr.seats_must_be_positive' });
    const lot = await tx.inventoryLot.findUniqueOrThrow({ where: { id: params.inventoryLotId } });
    const heldSeats = params.inventoryMode === 'held' ? params.seats : 0;
    const confirmedSeats = params.inventoryMode === 'confirmed' ? params.seats : 0;
    const bookedSeats = heldSeats + confirmedSeats;
    const availableSeats = Math.max(0, params.seats - bookedSeats);

    const pnr = await this.createPnrWithUniqueCode(tx, {
      sellingGroupId: lot.sellingGroupId,
      inventoryLotId: lot.id,
      pnrCode: params.pnrCode,
      allocatedSeats: params.seats,
      bookedSeats,
      heldSeats,
      confirmedSeats,
      availableSeats,
      paxKind: params.paxKind,
      sortOrder: params.paxKind === 'INFANT' ? 99 : 50,
    });

    if (bookedSeats > 0) {
      await tx.bookingPnrAllocation.create({
        data: {
          bookingId: params.bookingId,
          groupPnrId: pnr.id,
          heldSeats,
          confirmedSeats,
        },
      });
    }
    return pnr;
  }

  /**
   * Splits `seats` held/confirmed seats of `kind` off the booking's existing (pooled) PNR
   * allocations onto a brand-new dedicated PNR, then reassigns matching passengers.
   */
  async movePassengerSeatsToDedicatedPnr(
    tx: Tx,
    params: {
      inventoryLotId: string;
      bookingId: string;
      pnrCode: string;
      seats: number;
      kind: 'child' | 'infant';
      inventoryMode: ConcessionInventoryMode;
    },
  ) {
    if (params.seats <= 0)
      throw new BadRequestException({ code: 'group_pnr.seats_must_be_positive' });
    const code = params.pnrCode.trim().toUpperCase();
    if (!code) throw new BadRequestException({ code: 'group_pnr.pnr_code_required' });
    const paxKind: GroupPnrPaxKind = params.kind === 'child' ? 'CHILD' : 'INFANT';
    const lot = await tx.inventoryLot.findUniqueOrThrow({ where: { id: params.inventoryLotId } });

    const allocations = await tx.bookingPnrAllocation.findMany({
      where: { bookingId: params.bookingId, groupPnr: { inventoryLotId: params.inventoryLotId } },
      include: { groupPnr: true },
      orderBy: { createdAt: 'asc' },
    });

    let toMove = params.seats;
    let movedHeld = 0;
    let movedConfirmed = 0;
    const decrements: {
      allocationId: string;
      groupPnr: GroupPnr;
      held: number;
      confirmed: number;
    }[] = [];

    for (const a of allocations) {
      if (toMove <= 0) break;
      // Prefer allocations already dedicated to this pax kind, then unassigned/general pools.
      if (a.groupPnr.paxKind && a.groupPnr.paxKind !== paxKind) continue;
      const takeHeld = Math.min(a.heldSeats, toMove);
      toMove -= takeHeld;
      const takeConfirmed = toMove > 0 ? Math.min(a.confirmedSeats, toMove) : 0;
      toMove -= takeConfirmed;
      if (takeHeld > 0 || takeConfirmed > 0) {
        decrements.push({
          allocationId: a.id,
          groupPnr: a.groupPnr,
          held: takeHeld,
          confirmed: takeConfirmed,
        });
        movedHeld += takeHeld;
        movedConfirmed += takeConfirmed;
      }
    }

    if (toMove > 0)
      throw new ConflictException({ code: 'group_pnr.not_enough_allocated_seats_to_move' });

    const pnr = await this.createPnrWithUniqueCode(tx, {
      sellingGroupId: lot.sellingGroupId,
      inventoryLotId: lot.id,
      pnrCode: code,
      allocatedSeats: params.seats,
      bookedSeats: movedHeld + movedConfirmed,
      heldSeats: movedHeld,
      confirmedSeats: movedConfirmed,
      availableSeats: 0,
      paxKind,
      sortOrder: paxKind === 'INFANT' ? 99 : 50,
    });

    for (const d of decrements) {
      const src = d.groupPnr;
      const newHeld = Math.max(0, src.heldSeats - d.held);
      const newConfirmed = Math.max(0, src.confirmedSeats - d.confirmed);
      const newBooked = newHeld + newConfirmed;
      await tx.groupPnr.update({
        where: { id: src.id },
        data: {
          heldSeats: newHeld,
          confirmedSeats: newConfirmed,
          bookedSeats: newBooked,
          availableSeats: Math.max(0, src.allocatedSeats - newBooked),
          rowVersion: { increment: 1 },
        },
      });
      const alloc = allocations.find((a) => a.id === d.allocationId)!;
      const remainingHeld = Math.max(0, alloc.heldSeats - d.held);
      const remainingConfirmed = Math.max(0, alloc.confirmedSeats - d.confirmed);
      if (remainingHeld <= 0 && remainingConfirmed <= 0) {
        await tx.bookingPnrAllocation.delete({ where: { id: d.allocationId } });
      } else {
        await tx.bookingPnrAllocation.update({
          where: { id: d.allocationId },
          data: { heldSeats: remainingHeld, confirmedSeats: remainingConfirmed },
        });
      }
    }

    await tx.bookingPnrAllocation.create({
      data: {
        bookingId: params.bookingId,
        groupPnrId: pnr.id,
        heldSeats: movedHeld,
        confirmedSeats: movedConfirmed,
      },
    });

    await this.assignPassengersToPnrs(tx, params.bookingId);
    return pnr;
  }

  /** Creates a GroupPnr, auto-generating a placeholder code (retried on collision) if none given. */
  private async createPnrWithUniqueCode(
    tx: Tx,
    data: {
      sellingGroupId: string;
      inventoryLotId: string;
      pnrCode?: string;
      allocatedSeats: number;
      bookedSeats: number;
      heldSeats: number;
      confirmedSeats: number;
      availableSeats: number;
      paxKind: GroupPnrPaxKind;
      sortOrder: number;
    },
  ) {
    const explicit = data.pnrCode?.trim();
    for (let i = 0; i < 5; i++) {
      const code = explicit
        ? explicit.toUpperCase()
        : `CS-${Math.floor(Math.random() * 0xffffff)
            .toString(16)
            .toUpperCase()
            .padStart(6, '0')}`;
      try {
        return await tx.groupPnr.create({
          data: {
            sellingGroupId: data.sellingGroupId,
            inventoryLotId: data.inventoryLotId,
            pnrCode: code,
            allocatedSeats: data.allocatedSeats,
            bookedSeats: data.bookedSeats,
            heldSeats: data.heldSeats,
            confirmedSeats: data.confirmedSeats,
            availableSeats: data.availableSeats,
            paxKind: data.paxKind,
            sortOrder: data.sortOrder,
            status: data.availableSeats <= 0 ? 'FULL' : 'AVAILABLE',
          },
        });
      } catch (e) {
        const collided = (e as { code?: string })?.code === 'P2002';
        if (explicit || !collided || i === 4) {
          if (collided) throw new ConflictException({ code: 'group_pnr.code_already_in_use' });
          throw e;
        }
      }
    }
    throw new ConflictException({ code: 'group_pnr.code_already_in_use' });
  }
}
