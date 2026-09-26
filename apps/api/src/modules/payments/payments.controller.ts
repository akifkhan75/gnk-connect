import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { z } from 'zod';
import {
  adminPaymentListSchema,
  paymentRejectSchema,
  paymentVerifySchema,
  recordPaymentSchema,
  submitPaymentSchema,
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
import { PaymentsService } from './payments.service';

@Controller('partner/payments')
export class PartnerPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequirePartnerCapability('payments:view')
  list(@CurrentActor() actor: PartnerActor) {
    return this.payments.partnerList(actor);
  }

  @Get(':id/receipt')
  @RequirePartnerCapability('payments:view')
  receipt(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return this.payments.receipt(id, actor.accountId);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  @RequireApproved()
  @RequirePartnerCapability('payments:submit')
  submit(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(submitPaymentSchema)) dto: z.output<typeof submitPaymentSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.payments.submit(actor, dto, meta);
  }
}

@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequirePermission('payments:read')
  list(@Query(new ZodPipe(adminPaymentListSchema)) q: z.output<typeof adminPaymentListSchema>) {
    return this.payments.adminList(q);
  }

  @Get('counts')
  @RequirePermission('payments:read')
  counts() {
    return this.payments.adminCounts();
  }

  @Get(':id')
  @RequirePermission('payments:read')
  get(@Param('id', UUID) id: string) {
    return this.payments.adminGet(id);
  }

  @Get(':id/receipt')
  @RequirePermission('payments:read')
  receipt(@Param('id', UUID) id: string) {
    return this.payments.receipt(id);
  }

  @Post()
  @RequirePermission('payments:verify')
  record(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(recordPaymentSchema)) dto: z.output<typeof recordPaymentSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.payments.record(actor, dto, meta);
  }

  @Post(':id/verify')
  @HttpCode(200)
  @RequirePermission('payments:verify')
  verify(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(paymentVerifySchema, { optional: true }))
    dto: z.output<typeof paymentVerifySchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.payments.verify(actor, id, dto.depositAccountId, meta);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermission('payments:verify')
  reject(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(paymentRejectSchema)) dto: z.output<typeof paymentRejectSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.payments.reject(actor, id, dto.reason, meta);
  }
}
