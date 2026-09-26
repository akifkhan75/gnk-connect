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
  addMemberSchema,
  adminPartnerListSchema,
  adminPartnerUserCreateSchema,
  adminPartnerUserUpdateSchema,
  adminPasswordResetSchema,
  creditLimitSchema,
  inviteMemberSchema,
  memberStatusSchema,
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
import { CurrentActor, RequirePartnerCapability, RequirePermission } from '../auth/decorators';
import { PartnerUsersService } from './partner-users.service';
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
  @RequirePartnerCapability('account:manage')
  update(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(updateAccountProfileSchema)) dto: z.output<typeof updateAccountProfileSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.updateProfile(actor, dto, meta);
  }

  @Put('documents')
  @RequirePartnerCapability('account:manage')
  addDocument(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(addDocumentSchema)) dto: z.output<typeof addDocumentSchema>,
  ) {
    return this.partners.addDocument(actor, dto.type, dto.fileId);
  }

  @Delete('documents/:id')
  @RequirePartnerCapability('account:manage')
  removeDocument(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    return this.partners.removeDocument(actor, id);
  }

  @Post('submit')
  @HttpCode(200)
  @RequirePartnerCapability('account:manage')
  submit(@CurrentActor() actor: PartnerActor, @Meta() meta: RequestMeta) {
    return this.partners.submit(actor, meta);
  }
}

@Controller('partner/team')
export class PartnerTeamController {
  constructor(
    private readonly partners: PartnersService,
    private readonly users: PartnerUsersService,
  ) {}

  /** Add a member directly with a temporary password (they change it at first sign-in). */
  @Post('members')
  @RequirePartnerCapability('team:manage')
  addMember(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(addMemberSchema)) dto: z.output<typeof addMemberSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.users.addMember(actor, dto, meta);
  }

  @Patch('members/:userId/status')
  @RequirePartnerCapability('team:manage')
  setStatus(
    @CurrentActor() actor: PartnerActor,
    @Param('userId', UUID) userId: string,
    @Body(new ZodPipe(memberStatusSchema)) dto: z.output<typeof memberStatusSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.users.setMemberStatus(actor, userId, dto.status, meta);
  }

  @Get()
  get(@CurrentActor() actor: PartnerActor) {
    return this.partners.getTeam(actor);
  }

  @Post('invites')
  @RequirePartnerCapability('team:manage')
  invite(
    @CurrentActor() actor: PartnerActor,
    @Body(new ZodPipe(inviteMemberSchema)) dto: z.output<typeof inviteMemberSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.invite(actor, dto.email, dto.role as PartnerRole, meta);
  }

  @Delete('invites/:id')
  @HttpCode(204)
  @RequirePartnerCapability('team:manage')
  async revokeInvite(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    await this.partners.revokeInvite(actor, id);
  }

  @Patch('members/:userId')
  @RequirePartnerCapability('team:manage')
  updateRole(
    @CurrentActor() actor: PartnerActor,
    @Param('userId', UUID) userId: string,
    @Body(new ZodPipe(updateMemberRoleSchema)) dto: z.output<typeof updateMemberRoleSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.partners.updateRole(actor, userId, dto.role as PartnerRole, meta);
  }

  @Delete('members/:userId')
  @RequirePartnerCapability('team:manage')
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
  constructor(
    private readonly partners: PartnersService,
    private readonly users: PartnerUsersService,
  ) {}

  // ---------- Partner users ----------

  @Get(':id/users')
  @RequirePermission('partners:read')
  listUsers(@Param('id', UUID) id: string) {
    return this.users.adminList(id);
  }

  @Post(':id/users')
  @RequirePermission('partner_users:manage')
  createUser(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(adminPartnerUserCreateSchema))
    dto: z.output<typeof adminPartnerUserCreateSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.users.adminCreate(actor, id, dto, meta);
  }

  @Patch(':id/users/:userId')
  @RequirePermission('partner_users:manage')
  updateUser(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Param('userId', UUID) userId: string,
    @Body(new ZodPipe(adminPartnerUserUpdateSchema))
    dto: z.output<typeof adminPartnerUserUpdateSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.users.adminUpdate(actor, id, userId, dto, meta);
  }

  @Post(':id/users/:userId/reset-password')
  @HttpCode(200)
  @RequirePermission('partner_users:manage')
  resetUserPassword(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Param('userId', UUID) userId: string,
    @Body(new ZodPipe(adminPasswordResetSchema)) dto: z.output<typeof adminPasswordResetSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.users.adminResetPassword(actor, id, userId, dto, meta);
  }

  @Delete(':id/invites/:inviteId')
  @RequirePermission('partner_users:manage')
  revokeInvite(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Param('inviteId', UUID) inviteId: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.users.adminRevokeInvite(actor, id, inviteId, meta);
  }

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
