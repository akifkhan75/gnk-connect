import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { z } from 'zod';
import {
  adminBookingListSchema,
  bookingAssignSchema,
  bookingDecisionSchema,
  bookingListSchema,
  bookingRejectSchema,
  cancelBookingSchema,
  concessionDecisionSchema,
  concessionRequestSchema,
  createBookingSchema,
  extendDeadlineSchema,
  extensionRequestSchema,
  internalNoteSchema,
  setBookingPassengersSchema,
  ticketBookingSchema,
} from '@gnk/validation';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import {
  CurrentActor,
  RequireApproved,
  RequirePartnerCapability,
  RequirePermission,
} from '../auth/decorators';
import { BookingDocumentsService } from './booking-documents.service';
import { BookingEngineService } from './booking-engine.service';
import { BookingsService } from './bookings.service';

const pdfFile = ({ filename, content }: { filename: string; content: Buffer }) =>
  new StreamableFile(content, {
    type: 'application/pdf',
    disposition: `attachment; filename="${filename}"`,
    length: content.length,
  });

@Controller('partner/bookings')
export class PartnerBookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly engine: BookingEngineService,
    private readonly documents: BookingDocumentsService,
  ) {}

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
  @RequirePartnerCapability('bookings:create')
  create(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(createBookingSchema)) dto: z.output<typeof createBookingSchema>,
    @Headers('idempotency-key') idempotencyKey: string,
    @Meta() meta: RequestMeta,
  ) {
    if (dto.inventoryLotId) {
      return this.engine.placeAndHold(
        actor,
        {
          inventoryLotId: dto.inventoryLotId,
          adults: dto.adults!,
          children: dto.children,
          infants: dto.infants,
          passengers: dto.passengers,
          agentNotes: dto.agentNotes,
        },
        idempotencyKey ?? '',
        meta,
      );
    }
    return this.bookings.create(
      actor,
      { quoteId: dto.quoteId!, passengers: dto.passengers, agentNotes: dto.agentNotes },
      idempotencyKey ?? '',
      meta,
    );
  }

  @Put(':id/passengers')
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  async setPassengers(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(setBookingPassengersSchema)) dto: z.output<typeof setBookingPassengersSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const b = await this.bookings.partnerGet(actor, id);
    if (b.inventoryLotId) {
      await this.engine.setPassengersInventory(
        id,
        dto.passengers,
        { realm: 'PARTNER', id: actor.userId },
        meta,
      );
      return this.bookings.partnerGet(actor, id);
    }
    return this.bookings.setPassengers(actor, id, dto.passengers, meta);
  }

  @Post(':id/concession-requests')
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  requestConcession(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(concessionRequestSchema)) dto: z.output<typeof concessionRequestSchema>,
  ) {
    return this.engine.requestConcession(actor, id, dto);
  }

  @Get(':id/concession-requests')
  @RequireApproved()
  async listConcessions(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    await this.bookings.partnerGet(actor, id); // ownership check
    return this.engine.listConcessions(id);
  }

  @Post(':id/extension-request')
  @HttpCode(200)
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  requestExtension(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(extensionRequestSchema)) dto: z.output<typeof extensionRequestSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.engine.requestExtension(actor, id, dto, meta);
  }

  @Get(':id/documents/reservation')
  @RequireApproved()
  async reservationPdf(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return pdfFile(await this.documents.reservationPdf(id, actor.accountId));
  }

  @Get(':id/documents/confirmation')
  @RequireApproved()
  async confirmationPdf(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return pdfFile(await this.documents.confirmationPdf(id, actor.accountId));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePartnerCapability('bookings:create')
  async cancel(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(cancelBookingSchema)) dto: z.output<typeof cancelBookingSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const b = await this.bookings.partnerGet(actor, id);
    if (b.inventoryLotId) {
      await this.engine.cancelInventoryBooking(
        id,
        { realm: 'PARTNER', id: actor.userId },
        dto.reason,
        meta,
      );
      return this.bookings.partnerGet(actor, id);
    }
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
  constructor(
    private readonly bookings: BookingsService,
    private readonly engine: BookingEngineService,
    private readonly documents: BookingDocumentsService,
  ) {}

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

  @Post('jobs/sweep-stale-holds')
  @RequirePermission('bookings:approve')
  sweepHolds() {
    return this.engine.expireStaleHolds().then((expired) => ({ expired }));
  }

  @Get(':id')
  @RequirePermission('bookings:read')
  get(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.bookings.adminGet(actor, id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  confirm(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.engine.confirm(actor, id, meta);
  }

  @Post(':id/ticket')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  ticket(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(ticketBookingSchema)) dto: z.output<typeof ticketBookingSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.engine.markTicketed(actor, id, dto.passengerTickets, meta);
  }

  @Post(':id/extension-approve')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  extend(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(extendDeadlineSchema)) dto: z.output<typeof extendDeadlineSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.engine.adjustDeadline(id, dto.extensionMinutes, actor, meta);
  }

  @Get(':id/concession-requests')
  @RequirePermission('bookings:read')
  listConcessions(@Param('id', UUID) id: string) {
    return this.engine.listConcessions(id);
  }

  @Get(':id/documents/reservation')
  @RequirePermission('bookings:read')
  async reservationPdf(@Param('id', UUID) id: string) {
    return pdfFile(await this.documents.reservationPdf(id));
  }

  @Get(':id/documents/confirmation')
  @RequirePermission('bookings:read')
  async confirmationPdf(@Param('id', UUID) id: string) {
    return pdfFile(await this.documents.confirmationPdf(id));
  }

  @Post('concession-requests/:requestId/decide')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  decideConcession(
    @CurrentActor() actor: StaffActor,
    @Param('requestId', UUID) requestId: string,
    @Body(new ZodPipe(concessionDecisionSchema)) dto: z.output<typeof concessionDecisionSchema>,
  ) {
    return this.engine.decideConcession(actor, requestId, dto.decision, dto);
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
  async cancel(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(bookingRejectSchema)) dto: z.output<typeof bookingRejectSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const b = await this.bookings.adminGet(actor, id);
    if (b.inventoryLotId) {
      await this.engine.cancelInventoryBooking(
        id,
        { realm: 'STAFF', id: actor.userId },
        dto.reason,
        meta,
      );
      return this.bookings.adminGet(actor, id);
    }
    return this.bookings.cancel(actor, id, dto.reason, meta);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @RequirePermission('bookings:cancel')
  complete(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.bookings.complete(actor, id);
  }

  @Patch(':id/assign')
  @RequirePermission('bookings:read')
  assign(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(bookingAssignSchema)) dto: z.output<typeof bookingAssignSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.assign(actor, id, dto.staffId, meta);
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
