import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { z } from 'zod';
import {
  adminBookingListSchema,
  bookingDecisionSchema,
  bookingListSchema,
  bookingRejectSchema,
  cancelBookingSchema,
  createBookingSchema,
  internalNoteSchema,
} from '@gnk/validation';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import {
  CurrentActor,
  RequireApproved,
  RequirePartnerRole,
  RequirePermission,
} from '../auth/decorators';
import { BookingsService } from './bookings.service';

@Controller('partner/bookings')
export class PartnerBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(
    @CurrentActor() actor: PartnerActor,
    @Query(new ZodPipe(bookingListSchema)) q: z.output<typeof bookingListSchema>,
  ) {
    return this.bookings.partnerList(actor, q);
  }

  @Get('counts')
  counts(@CurrentActor() actor: PartnerActor) {
    return this.bookings.partnerCounts(actor);
  }

  @Get(':id')
  get(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return this.bookings.partnerGet(actor, id);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @RequireApproved()
  @RequirePartnerRole('OWNER', 'MANAGER', 'STAFF')
  create(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(createBookingSchema)) dto: z.output<typeof createBookingSchema>,
    @Headers('idempotency-key') idempotencyKey: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.create(actor, dto, idempotencyKey ?? '', meta);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePartnerRole('OWNER', 'MANAGER', 'STAFF')
  cancel(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(cancelBookingSchema)) dto: z.output<typeof cancelBookingSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.partnerCancel(actor, id, dto.reason, meta);
  }
}

@Controller('partner/invoices')
export class PartnerInvoicesController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(@CurrentActor() actor: PartnerActor) {
    return this.bookings.partnerInvoices(actor);
  }

  @Get(':id')
  get(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return this.bookings.invoice(id, actor.accountId);
  }
}

@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @RequirePermission('bookings:read')
  list(
    @CurrentActor() actor: StaffActor,
    @Query(new ZodPipe(adminBookingListSchema)) q: z.output<typeof adminBookingListSchema>,
  ) {
    return this.bookings.adminList(actor, q);
  }

  @Get('counts')
  @RequirePermission('bookings:read')
  counts() {
    return this.bookings.adminCounts();
  }

  @Get(':id')
  @RequirePermission('bookings:read')
  get(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.bookings.adminGet(actor, id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  approve(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(bookingDecisionSchema)) dto: z.output<typeof bookingDecisionSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.approve(actor, id, dto.note, meta);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  reject(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(bookingRejectSchema)) dto: z.output<typeof bookingRejectSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.reject(actor, id, dto.reason, meta);
  }

  @Post(':id/push')
  @HttpCode(200)
  @RequirePermission('bookings:push_supplier')
  push(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.push(actor, id, meta);
  }

  @Post(':id/sync')
  @HttpCode(200)
  @RequirePermission('bookings:push_supplier')
  sync(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.bookings.syncStatus(actor, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermission('bookings:cancel')
  cancel(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(bookingRejectSchema)) dto: z.output<typeof bookingRejectSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.cancel(actor, id, dto.reason, meta);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @RequirePermission('bookings:cancel')
  complete(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.bookings.complete(actor, id);
  }

  @Patch(':id/notes')
  @RequirePermission('bookings:approve')
  notes(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(internalNoteSchema)) dto: z.output<typeof internalNoteSchema>,
  ) {
    return this.bookings.setNotes(actor, id, dto.internalNotes);
  }

  @Post('passengers/:passengerId/reveal')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  @RequirePermission('bookings:reveal_pii')
  reveal(
    @CurrentActor() actor: StaffActor,
    @Param('passengerId', UUID) passengerId: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.revealPassport(actor, passengerId, meta);
  }
}

@Controller('admin/invoices')
export class AdminInvoicesController {
  constructor(private readonly bookings: BookingsService) {}

  @Get(':id')
  @RequirePermission('bookings:read')
  get(@Param('id', UUID) id: string) {
    return this.bookings.invoice(id);
  }
}
