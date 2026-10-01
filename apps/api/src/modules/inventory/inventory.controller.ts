import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { isoDateSchema } from '@gnk/validation';
import { ZodPipe } from '../../core/http/zod.pipe';
import { UUID } from '../../core/http/parse-uuid';
import {
  CurrentActor,
  RequireApproved,
  RequirePartnerCapability,
  RequirePermission,
} from '../auth/decorators';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { InventoryCatalogService } from './inventory-catalog.service';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  sector: z.string().trim().max(40).optional(),
  airline: z.string().trim().max(80).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  minSeats: z.coerce.number().int().min(1).max(500).optional(),
  sort: z.enum(['departure', 'price', 'seats', 'recent']).default('recent'),
});

const createGroupSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  currency: z.string().length(3).optional(),
  sector: z.string().trim().max(40).optional(),
  airline: z.string().trim().max(80).optional(),
  paymentDeadlineHours: z.coerce.number().int().min(1).max(168).optional(),
  showAvailableSeats: z.boolean().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
});

const segmentSchema = z.object({
  marketingFlightNumber: z.string().trim().min(2).max(16),
  departureAirport: z.string().trim().length(3),
  arrivalAirport: z.string().trim().length(3),
  departureTimeUtc: z.string().datetime({ offset: true }).or(z.string().min(10)),
  arrivalTimeUtc: z.string().datetime({ offset: true }).or(z.string().min(10)),
  legDirection: z.enum(['OUTBOUND', 'INBOUND', 'SINGLE']).optional(),
  operatingCarrier: z.string().trim().max(40).optional(),
});

const lotSchema = z.object({
  flightSegmentId: z.string().uuid(),
  bucketCode: z.string().trim().min(1).max(32),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
  seatsTotal: z.coerce.number().int().min(1).max(500),
  childSeatsTotal: z.coerce.number().int().min(0).max(200).optional(),
  infantSeatsTotal: z.coerce.number().int().min(0).max(200).optional(),
  fareAmount: z.coerce.number().positive(),
  costAmount: z.coerce.number().nonnegative().optional(),
  childFareAmount: z.coerce.number().nonnegative().optional(),
  infantFareAmount: z.coerce.number().nonnegative().optional(),
  fareCurrency: z.string().length(3).optional(),
  status: z.enum(['OPEN', 'FROZEN', 'CLOSED']).optional(),
});

const pnrsSchema = z.object({
  pnrs: z
    .array(
      z.object({
        pnrCode: z.string().trim().min(2).max(48),
        allocatedSeats: z.coerce.number().int().min(1).max(500),
        sortOrder: z.coerce.number().int().min(0).optional(),
        paxKind: z.enum(['ADULT', 'CHILD', 'INFANT']).nullable().optional(),
      }),
    )
    .min(1),
});

@Controller('partner/inventory/groups')
export class PartnerInventoryGroupsController {
  constructor(private readonly catalog: InventoryCatalogService) {}

  @Get()
  @RequireApproved()
  list(@Query(new ZodPipe(listSchema)) q: z.output<typeof listSchema>) {
    return this.catalog.listGroups({ ...q, status: 'ACTIVE' });
  }

  @Get('filters')
  @RequireApproved()
  filters() {
    return this.catalog.filters();
  }

  @Get(':id')
  @RequireApproved()
  get(@Param('id', UUID) id: string) {
    return this.catalog.getGroup(id, true);
  }
}

@Controller('admin/inventory/groups')
export class AdminInventoryGroupsController {
  constructor(private readonly catalog: InventoryCatalogService) {}

  @Get()
  @RequirePermission('bookings:read')
  list(@Query(new ZodPipe(listSchema)) q: z.output<typeof listSchema>) {
    return this.catalog.listGroups(q);
  }

  @Get(':id')
  @RequirePermission('bookings:read')
  get(@Param('id', UUID) id: string) {
    return this.catalog.getGroup(id, false);
  }

  @Post()
  @RequirePermission('bookings:approve')
  create(@Body(new ZodPipe(createGroupSchema)) dto: z.output<typeof createGroupSchema>) {
    return this.catalog.createGroup(dto);
  }

  @Patch(':id')
  @RequirePermission('bookings:approve')
  update(
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(createGroupSchema.partial())) dto: z.output<typeof createGroupSchema>,
  ) {
    return this.catalog.updateGroup(id, dto);
  }

  @Post(':id/segments')
  @RequirePermission('bookings:approve')
  addSegment(
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(segmentSchema)) dto: z.output<typeof segmentSchema>,
  ) {
    return this.catalog.addSegment(id, dto);
  }

  @Post(':id/lots')
  @RequirePermission('bookings:approve')
  createLot(
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(lotSchema)) dto: z.output<typeof lotSchema>,
  ) {
    return this.catalog.createLot(id, dto);
  }

  @Patch('lots/:lotId')
  @RequirePermission('bookings:approve')
  updateLot(
    @Param('lotId', UUID) lotId: string,
    @Body(new ZodPipe(z.object({ status: z.enum(['OPEN', 'FROZEN', 'CLOSED']) })))
    dto: { status: 'OPEN' | 'FROZEN' | 'CLOSED' },
  ) {
    return this.catalog.updateLotStatus(lotId, dto.status);
  }

  @Put('lots/:lotId/pnrs')
  @RequirePermission('bookings:approve')
  upsertPnrs(
    @Param('lotId', UUID) lotId: string,
    @Body(new ZodPipe(pnrsSchema)) dto: z.output<typeof pnrsSchema>,
  ) {
    return this.catalog.upsertPnrs(lotId, dto.pnrs);
  }
}
