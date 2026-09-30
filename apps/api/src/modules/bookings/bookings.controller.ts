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
  airlineManifestExportSchema,
  assignConcessionPnrSchema,
  assignPassengerSeatPnrSchema,
  bookingAssignSchema,
  bookingDecisionSchema,
  bookingListSchema,
  bookingRejectSchema,
  bulkPassengerExportSchema,
  cancelBookingSchema,
  concessionDecisionSchema,
  concessionRequestSchema,
  createBookingSchema,
  emailTicketSchema,
  extendDeadlineSchema,
  extensionRequestSchema,
  grantConcessionSchema,
  internalNoteSchema,
  manifestExportFormatSchema,
  passportOcrExtractSchema,
  passportScanAttachSchema,
  reviseDiscountSchema,
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
import { BookingConcessionService } from './booking-concession.service';
import { BookingDocumentsService } from './booking-documents.service';
import { BookingEngineService } from './booking-engine.service';
import { BookingsService } from './bookings.service';
import {
  AirlineManifestExportService,
  type Airline,
} from './manifest-export/airline-manifest-export.service';
import { PassengerManifestExportService } from './passenger-manifest-export.service';
import { PassportOcrService } from './passport-ocr.service';

const pdfFile = ({ filename, content }: { filename: string; content: Buffer }) =>
  new StreamableFile(content, {
    type: 'application/pdf',
    disposition: `attachment; filename="${filename}"`,
    length: content.length,
  });

const fileResponse = ({
  filename,
  content,
  contentType,
}: {
  filename: string;
  content: Buffer;
  contentType: string;
}) =>
  new StreamableFile(content, {
    type: contentType,
    disposition: `attachment; filename="${filename}"`,
    length: content.length,
  });

@Controller('partner/bookings')
export class PartnerBookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly engine: BookingEngineService,
    private readonly documents: BookingDocumentsService,
    private readonly passportOcr: PassportOcrService,
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

  @Post('passport-ocr/extract-text')
  @RequireApproved()
  extractPassportOcr(
    @Body(new ZodPipe(passportOcrExtractSchema))
    dto: z.output<typeof passportOcrExtractSchema>,
  ) {
    return this.passportOcr.extractFromText(dto.ocrText);
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

  @Get('concession-requests')
  @RequireApproved()
  listConcessionQueue(@CurrentActor() actor: PartnerActor) {
    return this.engine.listConcessionQueue({ accountId: actor.accountId });
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

  @Get(':id/documents/ticket')
  @RequireApproved()
  async ticketPdf(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return pdfFile(await this.documents.ticketPdf(id, actor.accountId));
  }

  @Post(':id/ticket/email')
  @HttpCode(200)
  @RequireApproved()
  emailTicket(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(emailTicketSchema)) dto: z.output<typeof emailTicketSchema>,
  ) {
    return this.documents.emailTicket(id, dto, actor.accountId);
  }

  @Post(':id/passengers/:passengerId/passport-scan')
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  attachPassportScan(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Param('passengerId', UUID) passengerId: string,
    @Body(new ZodPipe(passportScanAttachSchema)) dto: z.output<typeof passportScanAttachSchema>,
  ) {
    return this.passportOcr.attachScan(actor, id, passengerId, dto.fileId);
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
    private readonly concessions: BookingConcessionService,
    private readonly passportOcr: PassportOcrService,
    private readonly passengerManifest: PassengerManifestExportService,
    private readonly airlineManifest: AirlineManifestExportService,
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

  @Get('concession-requests')
  @RequirePermission('bookings:read')
  listConcessionQueue() {
    return this.engine.listConcessionQueue({ status: 'REQUESTED' });
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

  @Post('concession-requests/:requestId/pnr')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  assignConcessionPnr(
    @CurrentActor() actor: StaffActor,
    @Param('requestId', UUID) requestId: string,
    @Body(new ZodPipe(assignConcessionPnrSchema)) dto: z.output<typeof assignConcessionPnrSchema>,
  ) {
    return this.concessions.assignConcessionPnr(actor, requestId, dto);
  }

  @Post('passport-ocr/extract-text')
  @RequirePermission('bookings:read')
  extractPassportOcr(
    @Body(new ZodPipe(passportOcrExtractSchema))
    dto: z.output<typeof passportOcrExtractSchema>,
  ) {
    return this.passportOcr.extractFromText(dto.ocrText);
  }

  @Get('export/passengers')
  @RequirePermission('bookings:reveal_pii')
  async exportPassengersBulk(
    @Query(new ZodPipe(bulkPassengerExportSchema)) q: z.output<typeof bulkPassengerExportSchema>,
  ) {
    return fileResponse(await this.passengerManifest.exportManifestList(q.bookingIds, q.format));
  }

  @Get('export/airblue')
  @RequirePermission('bookings:reveal_pii')
  async exportAirBlue(
    @Query(new ZodPipe(airlineManifestExportSchema))
    q: z.output<typeof airlineManifestExportSchema>,
  ) {
    return fileResponse(await this.airlineManifest.export(q.bookingIds, 'airblue' as Airline));
  }

  @Get('export/airsial')
  @RequirePermission('bookings:reveal_pii')
  async exportAirSial(
    @Query(new ZodPipe(airlineManifestExportSchema))
    q: z.output<typeof airlineManifestExportSchema>,
  ) {
    return fileResponse(await this.airlineManifest.export(q.bookingIds, 'airsial' as Airline));
  }

  @Get('export/saudi')
  @RequirePermission('bookings:reveal_pii')
  async exportSaudi(
    @Query(new ZodPipe(airlineManifestExportSchema))
    q: z.output<typeof airlineManifestExportSchema>,
  ) {
    return fileResponse(await this.airlineManifest.export(q.bookingIds, 'saudi' as Airline));
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

  @Post(':id/extension-reject')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  rejectExtension(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(bookingDecisionSchema)) dto: z.output<typeof bookingDecisionSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.engine.rejectExtension(actor, id, dto.note, meta);
  }

  @Post(':id/request-passengers')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  requestPassengers(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.engine.requestPassengers(actor, id, meta);
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

  @Get(':id/documents/ticket')
  @RequirePermission('bookings:read')
  async ticketPdf(@Param('id', UUID) id: string) {
    return pdfFile(await this.documents.ticketPdf(id));
  }

  @Post(':id/ticket/email')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  emailTicket(
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(emailTicketSchema)) dto: z.output<typeof emailTicketSchema>,
  ) {
    return this.documents.emailTicket(id, dto);
  }

  @Get(':id/passengers/export')
  @RequirePermission('bookings:reveal_pii')
  async exportPassengers(
    @Param('id', UUID) id: string,
    @Query(new ZodPipe(manifestExportFormatSchema)) q: z.output<typeof manifestExportFormatSchema>,
  ) {
    return fileResponse(await this.passengerManifest.exportManifest(id, q.format));
  }

  @Post(':id/concessions')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  grantConcession(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(grantConcessionSchema)) dto: z.output<typeof grantConcessionSchema>,
  ) {
    return this.concessions.grantDirect(actor, id, dto);
  }

  @Patch(':id/concessions/discount')
  @RequirePermission('bookings:approve')
  reviseDiscount(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(reviseDiscountSchema)) dto: z.output<typeof reviseDiscountSchema>,
  ) {
    return this.concessions.reviseDiscount(actor, id, dto);
  }

  @Post(':id/passenger-seat-pnr')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  assignPassengerSeatPnr(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(assignPassengerSeatPnrSchema))
    dto: z.output<typeof assignPassengerSeatPnrSchema>,
  ) {
    return this.concessions.assignPassengerSeatPnr(actor, id, dto);
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
