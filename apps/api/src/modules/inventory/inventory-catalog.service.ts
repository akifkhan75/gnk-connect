import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CabinClass,
  FlightSegmentDirection,
  InventoryLotStatus,
  SellingGroupStatus,
} from '@prisma/client';
import { inventorySeatCount } from '@gnk/validation';
import { iso, isoDate, num } from '../../core/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InventoryEngineService } from './inventory-engine.service';

@Injectable()
export class InventoryCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: InventoryEngineService,
  ) {}

  async listGroups(q: {
    status?: SellingGroupStatus;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const where = {
      deletedAt: null,
      status: q.status ?? ('ACTIVE' as const),
      ...(q.q
        ? {
            OR: [
              { code: { contains: q.q, mode: 'insensitive' as const } },
              { name: { contains: q.q, mode: 'insensitive' as const } },
              { sector: { contains: q.q, mode: 'insensitive' as const } },
              { airline: { contains: q.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.sellingGroup.findMany({
        where,
        include: {
          memberships: {
            include: { segment: true },
            orderBy: { seq: 'asc' },
          },
          inventoryLots: {
            where: { deletedAt: null, status: 'OPEN' },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sellingGroup.count({ where }),
    ]);
    return {
      items: rows.map((g) => this.toGroupListItem(g, true)),
      total,
      page,
      pageSize,
    };
  }

  async getGroup(id: string, forPartner = true) {
    const g = await this.prisma.sellingGroup.findFirst({
      where: { id, deletedAt: null },
      include: {
        memberships: { include: { segment: true }, orderBy: { seq: 'asc' } },
        inventoryLots: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { groupPnrs: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!g) throw new NotFoundException('Group not found');
    if (forPartner && g.status !== 'ACTIVE') throw new NotFoundException('Group not found');
    return this.toGroupDetail(g, forPartner);
  }

  async createGroup(dto: {
    code: string;
    name?: string;
    description?: string;
    currency?: string;
    sector?: string;
    airline?: string;
    paymentDeadlineHours?: number;
    showAvailableSeats?: boolean;
    supplierId?: string;
    status?: SellingGroupStatus;
  }) {
    return this.prisma.sellingGroup.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        currency: dto.currency ?? 'PKR',
        sector: dto.sector,
        airline: dto.airline,
        paymentDeadlineHours: dto.paymentDeadlineHours ?? 24,
        showAvailableSeats: dto.showAvailableSeats ?? true,
        supplierId: dto.supplierId,
        status: dto.status ?? 'DRAFT',
      },
    });
  }

  async updateGroup(
    id: string,
    dto: Partial<{
      name: string;
      description: string;
      status: SellingGroupStatus;
      paymentDeadlineHours: number;
      showAvailableSeats: boolean;
      sector: string;
      airline: string;
    }>,
  ) {
    await this.prisma.sellingGroup.update({
      where: { id },
      data: { ...dto, rowVersion: { increment: 1 } },
    });
    return this.getGroup(id, false);
  }

  async addSegment(
    groupId: string,
    dto: {
      marketingFlightNumber: string;
      departureAirport: string;
      arrivalAirport: string;
      departureTimeUtc: string;
      arrivalTimeUtc: string;
      legDirection?: FlightSegmentDirection;
      operatingCarrier?: string;
      cabinClassBucket?: string;
    },
  ) {
    const segment = await this.prisma.flightSegment.create({
      data: {
        marketingFlightNumber: dto.marketingFlightNumber,
        departureAirport: dto.departureAirport.toUpperCase(),
        arrivalAirport: dto.arrivalAirport.toUpperCase(),
        departureTimeUtc: new Date(dto.departureTimeUtc),
        arrivalTimeUtc: new Date(dto.arrivalTimeUtc),
        operatingCarrier: dto.operatingCarrier,
        cabinClassBucket: dto.cabinClassBucket ?? 'ECONOMY',
      },
    });
    const seq = await this.prisma.sellingGroupFlightSegment.count({
      where: { sellingGroupId: groupId },
    });
    await this.prisma.sellingGroupFlightSegment.create({
      data: {
        sellingGroupId: groupId,
        flightSegmentId: segment.id,
        seq,
        legDirection: dto.legDirection ?? (seq === 0 ? 'OUTBOUND' : 'INBOUND'),
      },
    });
    return this.getGroup(groupId, false);
  }

  async createLot(
    groupId: string,
    dto: {
      flightSegmentId: string;
      bucketCode: string;
      cabinClass?: CabinClass;
      seatsTotal: number;
      childSeatsTotal?: number;
      infantSeatsTotal?: number;
      fareAmount: number;
      costAmount?: number;
      childFareAmount?: number;
      infantFareAmount?: number;
      fareCurrency?: string;
      status?: InventoryLotStatus;
    },
  ) {
    const lot = await this.prisma.inventoryLot.create({
      data: {
        sellingGroupId: groupId,
        flightSegmentId: dto.flightSegmentId,
        bucketCode: dto.bucketCode,
        cabinClass: dto.cabinClass ?? 'ECONOMY',
        seatsTotal: dto.seatsTotal,
        childSeatsTotal: dto.childSeatsTotal ?? 0,
        infantSeatsTotal: dto.infantSeatsTotal ?? 0,
        fareAmount: dto.fareAmount,
        costAmount: dto.costAmount,
        childFareAmount: dto.childFareAmount,
        infantFareAmount: dto.infantFareAmount,
        fareCurrency: dto.fareCurrency ?? 'PKR',
        status: dto.status ?? 'OPEN',
      },
    });
    await this.prisma.inventoryMovement.create({
      data: {
        inventoryLotId: lot.id,
        movementType: 'INITIAL_LOAD',
        seatsDelta: dto.seatsTotal,
      },
    });
    return lot;
  }

  async updateLotStatus(lotId: string, status: InventoryLotStatus) {
    await this.prisma.inventoryLot.update({
      where: { id: lotId },
      data: { status, rowVersion: { increment: 1 } },
    });
    const lot = await this.prisma.inventoryLot.findUniqueOrThrow({ where: { id: lotId } });
    return this.getGroup(lot.sellingGroupId, false);
  }

  async upsertPnrs(
    lotId: string,
    pnrs: {
      pnrCode: string;
      allocatedSeats: number;
      sortOrder?: number;
      paxKind?: 'ADULT' | 'CHILD' | 'INFANT' | null;
    }[],
  ) {
    const lot = await this.prisma.inventoryLot.findFirstOrThrow({
      where: { id: lotId, deletedAt: null },
    });
    const results: Awaited<ReturnType<typeof this.prisma.groupPnr.upsert>>[] = [];
    for (const [i, p] of pnrs.entries()) {
      results.push(
        await this.prisma.groupPnr.upsert({
          where: { inventoryLotId_pnrCode: { inventoryLotId: lotId, pnrCode: p.pnrCode } },
          create: {
            sellingGroupId: lot.sellingGroupId,
            inventoryLotId: lotId,
            pnrCode: p.pnrCode,
            allocatedSeats: p.allocatedSeats,
            availableSeats: p.allocatedSeats,
            sortOrder: p.sortOrder ?? i,
            paxKind: p.paxKind ?? null,
          },
          update: {
            allocatedSeats: p.allocatedSeats,
            availableSeats: p.allocatedSeats, // simplified: admin reset
            sortOrder: p.sortOrder ?? i,
            paxKind: p.paxKind ?? null,
            isActive: true,
            deletedAt: null,
            rowVersion: { increment: 1 },
          },
        }),
      );
    }
    return results;
  }

  private toGroupListItem(
    g: Awaited<ReturnType<InventoryCatalogService['loadListRow']>>,
    forPartner: boolean,
  ) {
    const legs = g.memberships.map((m) => ({
      segmentId: m.segment.id,
      direction: m.legDirection,
      flightNo: m.segment.marketingFlightNumber,
      from: m.segment.departureAirport,
      to: m.segment.arrivalAirport,
      departAt: iso(m.segment.departureTimeUtc)!,
      arriveAt: iso(m.segment.arrivalTimeUtc)!,
    }));
    const lots = g.inventoryLots.map((lot) => {
      const adultLeft = this.engine.adultAvailable(lot);
      const childLeft = this.engine.childAvailable(lot);
      const seatsLeft = lot.childSeatsTotal > 0 ? adultLeft + childLeft : adultLeft;
      return {
        id: lot.id,
        bucketCode: lot.bucketCode,
        cabinClass: lot.cabinClass,
        status: lot.status,
        fareAmount: num(lot.fareAmount),
        childFareAmount: lot.childFareAmount != null ? num(lot.childFareAmount) : null,
        infantFareAmount: lot.infantFareAmount != null ? num(lot.infantFareAmount) : null,
        currency: lot.fareCurrency ?? g.currency,
        seatsAvailable: forPartner && !g.showAvailableSeats ? null : seatsLeft,
        adultSeatsAvailable: forPartner && !g.showAvailableSeats ? null : adultLeft,
        childSeatsAvailable: forPartner && !g.showAvailableSeats ? null : childLeft,
        infantSeatsAvailable:
          forPartner && !g.showAvailableSeats ? null : this.engine.infantAvailable(lot),
        hasInfantFare: lot.infantFareAmount != null || lot.infantSeatsTotal > 0,
      };
    });
    const primaryLot = lots[0];
    const dep = legs[0];
    return {
      id: g.id,
      code: g.code,
      name: g.name ?? g.code,
      sector: g.sector ?? (dep ? `${dep.from}-${dep.to}` : null),
      airline: g.airline,
      currency: g.currency,
      status: g.status,
      paymentDeadlineHours: g.paymentDeadlineHours,
      showAvailableSeats: g.showAvailableSeats,
      departureDate: dep ? isoDate(new Date(dep.departAt)) : null,
      price: primaryLot?.fareAmount ?? null,
      seatsAvailable: primaryLot?.seatsAvailable ?? null,
      legs,
      lots,
    };
  }

  private toGroupDetail(
    g: Awaited<ReturnType<InventoryCatalogService['loadDetailRow']>>,
    forPartner: boolean,
  ) {
    const base = this.toGroupListItem(g, forPartner);
    return {
      ...base,
      description: g.description,
      lots: g.inventoryLots.map((lot) => {
        const listed = base.lots.find((l) => l.id === lot.id)!;
        return {
          ...listed,
          seatsTotal: forPartner ? undefined : lot.seatsTotal,
          costAmount: forPartner ? undefined : num(lot.costAmount),
          pnrs: forPartner
            ? undefined
            : lot.groupPnrs?.map((p) => ({
                id: p.id,
                pnrCode: p.pnrCode,
                allocatedSeats: p.allocatedSeats,
                availableSeats: p.availableSeats,
                heldSeats: p.heldSeats,
                confirmedSeats: p.confirmedSeats,
                status: p.status,
                sortOrder: p.sortOrder,
                paxKind: p.paxKind,
              })),
        };
      }),
    };
  }

  private loadListRow() {
    return this.prisma.sellingGroup.findFirstOrThrow({
      include: {
        memberships: { include: { segment: true }, orderBy: { seq: 'asc' } },
        inventoryLots: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private loadDetailRow() {
    return this.prisma.sellingGroup.findFirstOrThrow({
      include: {
        memberships: { include: { segment: true }, orderBy: { seq: 'asc' } },
        inventoryLots: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { groupPnrs: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }
}

// silence unused import in type-only usage
void inventorySeatCount;
