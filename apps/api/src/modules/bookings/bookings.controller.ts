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
  ServiceUnavailableException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { z } from 'zod';
import {
  adminBookingListSchema,
  bookingAssignSchema,
  bookingDecisionSchema,
  bookingListSchema,
  bookingRejectSchema,
  addPassengersSchema,
  cancelBookingSchema,
  createBookingSchema,
  internalNoteSchema,
  passportScanSchema,
  requestConcessionSchema,
  reviewConcessionSchema,
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
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../core/config/env.config';
import type { PassportScanDto } from '@gnk/types';
import { BookingsService } from './bookings.service';

@Controller('partner/bookings')
export class PartnerBookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly config: ConfigService<EnvConfig, true>,
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
    return this.bookings.create(actor, dto, idempotencyKey ?? '', meta);
  }

  @Post('scan-passport')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 10 * 60_000 } })
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  async scanPassport(
    @Body(new ZodPipe(passportScanSchema)) dto: z.output<typeof passportScanSchema>,
  ): Promise<PassportScanDto> {
    return readPassportScan(this.config.get('GEMINI_API_KEY', { infer: true }), dto);
  }

  @Post(':id/passengers')
  @HttpCode(200)
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  addPassengers(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(addPassengersSchema)) dto: z.output<typeof addPassengersSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.addPassengers(actor, id, dto.passengers, meta);
  }

  @Post(':id/concessions')
  @HttpCode(200)
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  requestConcession(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(requestConcessionSchema)) dto: z.output<typeof requestConcessionSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.requestConcession(actor, id, dto, meta);
  }

  @Post(':id/concessions/:concessionId/cancel')
  @HttpCode(200)
  @RequirePartnerCapability('bookings:create')
  cancelConcession(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Param('concessionId', UUID) concessionId: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.cancelConcession(actor, id, concessionId, meta);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePartnerCapability('bookings:create')
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

  @Post(':id/concessions/:concessionId/review')
  @HttpCode(200)
  @RequirePermission('bookings:approve')
  reviewConcession(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Param('concessionId', UUID) concessionId: string,
    @Body(new ZodPipe(reviewConcessionSchema)) dto: z.output<typeof reviewConcessionSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.bookings.reviewConcession(actor, id, concessionId, dto, meta);
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

async function readPassportScan(
  key: string | undefined,
  dto: { image: string; mimeType: string },
): Promise<PassportScanDto> {
  if (!key) throw new ServiceUnavailableException('Passport scan is not available right now');
  const raw = dto.image.includes(',') ? dto.image.slice(dto.image.indexOf(',') + 1) : dto.image;
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'Extract machine-readable passport fields. Reply with JSON only: title (MR|MRS|MS|MISS|MSTR), firstName, lastName, gender (MALE|FEMALE), dateOfBirth (YYYY-MM-DD), nationality (ISO 3166-1 alpha-2), passportNumber, passportExpiry (YYYY-MM-DD). Use null when a field is unreadable.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Read this passport image.' },
              { inlineData: { mimeType: dto.mimeType, data: raw } },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 400, temperature: 0 },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  ).catch(() => null);
  if (!res?.ok)
    throw new ServiceUnavailableException('Could not read the passport. Enter details manually.');
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const json = text.replace(/```json|```/g, '').trim();
  let parsed: Record<string, string | null>;
  try {
    parsed = JSON.parse(json) as Record<string, string | null>;
  } catch {
    throw new ServiceUnavailableException('Could not read the passport. Enter details manually.');
  }
  const title = ['MR', 'MRS', 'MS', 'MISS', 'MSTR'].includes(parsed.title ?? '')
    ? (parsed.title as PassportScanDto['title'])
    : null;
  const gender = parsed.gender === 'MALE' || parsed.gender === 'FEMALE' ? parsed.gender : null;
  return {
    title,
    firstName: parsed.firstName || null,
    lastName: parsed.lastName || null,
    gender,
    dateOfBirth: parsed.dateOfBirth || null,
    nationality: parsed.nationality ? String(parsed.nationality).slice(0, 2).toUpperCase() : null,
    passportNumber: parsed.passportNumber || null,
    passportExpiry: parsed.passportExpiry || null,
  };
}
