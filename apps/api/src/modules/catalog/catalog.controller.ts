import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { z } from 'zod';
import {
  adminProductListSchema,
  groupSearchSchema,
  productVisibilitySchema,
} from '@gnk/validation';
import type { PublicGroupDto } from '@gnk/types';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { AuditService } from '../audit/audit.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { CurrentActor, Public, RequirePermission } from '../auth/decorators';
import { CatalogService } from './catalog.service';

type Search = z.output<typeof groupSearchSchema>;

@Controller('partner/groups')
export class PartnerGroupsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  search(@CurrentActor() actor: PartnerActor, @Query(new ZodPipe(groupSearchSchema)) q: Search) {
    return this.catalog.search(actor, q);
  }

  @Get('filters')
  filters() {
    return this.catalog.filters();
  }

  @Get(':productId')
  detail(@CurrentActor() actor: PartnerActor, @Param('productId', UUID) productId: string) {
    return this.catalog.detail(actor, productId);
  }
}

/** Public website listing: upcoming groups without any prices. */
@Controller('public/groups')
export class PublicGroupsController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  async list(
    @Query(new ZodPipe(groupSearchSchema)) q: Search,
  ): Promise<{ items: PublicGroupDto[]; total: number }> {
    const page = await this.catalog.search(null, { ...q, pageSize: Math.min(q.pageSize, 50) });
    return {
      total: page.total,
      items: page.items.map((g) => ({
        productId: g.productId,
        departureId: g.departureId,
        type: g.type,
        title: g.title,
        sector: g.sector,
        airline: g.airline,
        destination: g.destination,
        departureDate: g.departureDate,
        returnDate: g.returnDate,
        durationDays: g.durationDays,
        baggage: g.baggage,
        status: g.status,
        seatsAvailable: g.seatsAvailable,
      })),
    };
  }
}

@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
  ) {}

  @Get('products')
  @RequirePermission('catalog:read')
  list(
    @CurrentActor() actor: StaffActor,
    @Query(new ZodPipe(adminProductListSchema)) q: z.output<typeof adminProductListSchema>,
  ) {
    return this.catalog.adminList(actor, q);
  }

  @Get('options')
  @RequirePermission('pricing:read')
  options() {
    return this.catalog.adminOptions();
  }

  @Get('products/:id')
  @RequirePermission('catalog:read')
  detail(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.catalog.adminDetail(actor, id);
  }

  @Patch('products/:id')
  @RequirePermission('catalog:publish')
  async visibility(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(productVisibilitySchema)) dto: z.output<typeof productVisibilitySchema>,
    @Meta() meta: RequestMeta,
  ) {
    const before = await this.catalog.setVisibility(id, dto);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'product.visibility',
      entityType: 'Product',
      entityId: id,
      before: { isPublished: before.isPublished, isFeatured: before.isFeatured },
      after: dto,
      meta,
    });
    return this.catalog.adminDetail(actor, id);
  }
}
