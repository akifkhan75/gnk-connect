import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import type { PartnerRole } from '@prisma/client';
import {
  adminPartnerListSchema,
  creditLimitSchema,
  inviteMemberSchema,
  kycReviewSchema,
  kycUploadSchema,
  partnerReviewSchema,
  updateAccountProfileSchema,
  updateMemberRoleSchema,
} from '@gnk/validation';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePartnerRole, RequirePermission } from '../auth/decorators';
import { PartnersService } from './partners.service';

const addDocumentSchema = kycUploadSchema.extend({ fileId: z.uuid() });

@Controller('partner/account')
export class PartnerAccountController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  get(@CurrentActor() actor: PartnerActor) {
    return this.partners.getAccount(actor.accountId);
  }

  @Patch()
  @RequirePartnerRole('OWNER')
  update(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(updateAccountProfileSchema)) dto: z.output<typeof updateAccountProfileSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.updateProfile(actor, dto, meta);
  }

  @Put('documents')
  @RequirePartnerRole('OWNER')
  addDocument(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(addDocumentSchema)) dto: z.output<typeof addDocumentSchema>,
  ) {
    return this.partners.addDocument(actor, dto.type, dto.fileId);
  }

  @Delete('documents/:id')
  @RequirePartnerRole('OWNER')
  removeDocument(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return this.partners.removeDocument(actor, id);
  }

  @Post('submit')
  @HttpCode(200)
  @RequirePartnerRole('OWNER')
  submit(@CurrentActor() actor: PartnerActor, @Meta() meta: RequestMeta) {
    return this.partners.submit(actor, meta);
  }
}

@Controller('partner/team')
export class PartnerTeamController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  get(@CurrentActor() actor: PartnerActor) {
    return this.partners.getTeam(actor);
  }

  @Post('invites')
  @RequirePartnerRole('OWNER', 'MANAGER')
  invite(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(inviteMemberSchema)) dto: z.output<typeof inviteMemberSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.invite(actor, dto.email, dto.role as PartnerRole, meta);
  }

  @Delete('invites/:id')
  @HttpCode(204)
  @RequirePartnerRole('OWNER', 'MANAGER')
  async revokeInvite(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    await this.partners.revokeInvite(actor, id);
  }

  @Patch('members/:userId')
  @RequirePartnerRole('OWNER', 'MANAGER')
  updateRole(
    @CurrentActor() actor: PartnerActor,
    @Param('userId', UUID) userId: string,
    @Body(new ZodPipe(updateMemberRoleSchema)) dto: z.output<typeof updateMemberRoleSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.updateRole(actor, userId, dto.role as PartnerRole, meta);
  }

  @Delete('members/:userId')
  @RequirePartnerRole('OWNER', 'MANAGER')
  remove(
    @CurrentActor() actor: PartnerActor,
    @Param('userId', UUID) userId: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.removeMember(actor, userId, meta);
  }
}

@Controller('admin/partners')
export class AdminPartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @RequirePermission('partners:read')
  list(@Query(new ZodPipe(adminPartnerListSchema)) q: z.output<typeof adminPartnerListSchema>) {
    return this.partners.adminList(q);
  }

  @Get('counts')
  @RequirePermission('partners:read')
  counts() {
    return this.partners.adminCounts();
  }

  @Get(':id')
  @RequirePermission('partners:read')
  detail(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.partners.adminDetail(id, actor);
  }

  // Permission (review vs suspend) is checked per action in the service.
  @Post(':id/review')
  @HttpCode(200)
  @RequirePermission('partners:read')
  review(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(partnerReviewSchema)) dto: z.output<typeof partnerReviewSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.review(actor, id, dto.action, dto.note, meta);
  }

  @Patch(':id/credit')
  @RequirePermission('partners:credit_limit')
  credit(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(creditLimitSchema)) dto: z.output<typeof creditLimitSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.setCredit(actor, id, dto.creditLimit, dto.pricingTierId, meta);
  }

  @Patch('documents/:documentId')
  @RequirePermission('partners:review')
  reviewDocument(
    @CurrentActor() actor: StaffActor,
    @Param('documentId', UUID) documentId: string,
    @Body(new ZodPipe(kycReviewSchema)) dto: z.output<typeof kycReviewSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.reviewDocument(
      actor,
      documentId,
      dto.status as 'VERIFIED' | 'REJECTED',
      dto.note,
      meta,
    );
  }
}
