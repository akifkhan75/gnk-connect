import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { z } from 'zod';
import {
  createQuoteSchema,
  pricingRuleSchema,
  pricingSimulateSchema,
  pricingTierSchema,
} from '@gnk/validation';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { AuditService } from '../audit/audit.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import {
  CurrentActor,
  RequireApproved,
  RequirePartnerCapability,
  RequirePermission,
} from '../auth/decorators';
import { PricingService } from './pricing.service';

@Controller('partner/quotes')
export class PartnerQuotesController {
  constructor(private readonly pricing: PricingService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @RequireApproved()
  @RequirePartnerCapability('bookings:create')
  create(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(createQuoteSchema)) dto: z.output<typeof createQuoteSchema>,
  ) {
    return this.pricing.createQuote(actor, dto.departureId, dto.seats);
  }

  @Get(':id')
  @RequireApproved()
  get(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return this.pricing.getQuote(actor, id);
  }
}

@Controller('admin/pricing')
export class AdminPricingController {
  constructor(
    private readonly pricing: PricingService,
    private readonly audit: AuditService,
  ) {}

  @Get('rules')
  @RequirePermission('pricing:read')
  rules() {
    return this.pricing.listRules();
  }

  @Post('rules')
  @RequirePermission('pricing:write')
  async create(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(pricingRuleSchema)) dto: z.output<typeof pricingRuleSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const rule = await this.pricing.createRule(dto, actor.userId);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'pricing_rule.create',
      entityType: 'PricingRule',
      entityId: rule.id,
      after: rule,
      meta,
    });
    return this.pricing.listRules();
  }

  @Put('rules/:id')
  @RequirePermission('pricing:write')
  async update(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(pricingRuleSchema)) dto: z.output<typeof pricingRuleSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const before = await this.pricing.getRule(id);
    const after = await this.pricing.updateRule(id, dto, actor.userId);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'pricing_rule.update',
      entityType: 'PricingRule',
      entityId: id,
      before,
      after,
      meta,
    });
    return this.pricing.listRules();
  }

  @Delete('rules/:id')
  @RequirePermission('pricing:write')
  async remove(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    const before = await this.pricing.getRule(id);
    await this.pricing.deleteRule(id, actor.userId);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'pricing_rule.delete',
      entityType: 'PricingRule',
      entityId: id,
      before,
      meta,
    });
    return this.pricing.listRules();
  }

  @Post('simulate')
  @HttpCode(200)
  @RequirePermission('pricing:read')
  simulate(@Body(new ZodPipe(pricingSimulateSchema)) dto: z.output<typeof pricingSimulateSchema>) {
    return this.pricing.simulate(dto.accountId, dto.departureId, dto.seats);
  }

  @Get('tiers')
  @RequirePermission('pricing:read')
  tiers() {
    return this.pricing.listTiers();
  }

  @Post('tiers')
  @RequirePermission('pricing:write')
  async createTier(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(pricingTierSchema)) dto: z.output<typeof pricingTierSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const tier = await this.pricing.createTier(dto.name, dto.description);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'pricing_tier.create',
      entityType: 'PricingTier',
      entityId: tier.id,
      after: tier,
      meta,
    });
    return this.pricing.listTiers();
  }

  @Delete('tiers/:id')
  @RequirePermission('pricing:write')
  async deleteTier(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    await this.pricing.deleteTier(id);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'pricing_tier.delete',
      entityType: 'PricingTier',
      entityId: id,
      meta,
    });
    return this.pricing.listTiers();
  }
}
