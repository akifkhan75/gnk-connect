import { Body, Controller, Get, Put } from '@nestjs/common';
import { settingsSchema, type SettingsInput } from '@gnk/validation';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { AuditService } from '../audit/audit.service';
import type { StaffActor } from '../auth/auth.types';
import { CurrentActor, RequireApproved, RequirePermission } from '../auth/decorators';
import { SettingsService } from './settings.service';

@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('settings:manage')
  get() {
    return this.settings.get();
  }

  @Put()
  @RequirePermission('settings:manage')
  async update(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(settingsSchema)) dto: SettingsInput,
    @Meta() meta: RequestMeta,
  ) {
    const before = await this.settings.get();
    const after = await this.settings.update(dto, actor.userId);
    await this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action: 'settings.update',
      entityType: 'Setting',
      entityId: 'platform',
      before,
      after,
      meta,
    });
    return after;
  }
}

/** What partners need to pay GNK: bank accounts and payment terms. */
@Controller('partner/payment-instructions')
export class PartnerPaymentInstructionsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequireApproved()
  async get() {
    const s = await this.settings.get();
    return { bankAccounts: s.bankAccounts, note: s.booking.paymentTermsNote, company: s.company };
  }
}
