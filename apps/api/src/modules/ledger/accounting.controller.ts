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
import {
  accountCreateSchema,
  accountUpdateSchema,
  currencySchema,
  exchangeRateSchema,
  ledgerRangeSchema,
  periodSchema,
  trialBalanceSchema,
  voucherApproveSchema,
  voucherListSchema,
  voucherRejectSchema,
  voucherReverseSchema,
  voucherSchema,
} from '@gnk/validation';
import { UUID } from '../../core/http/parse-uuid';
import { Meta, type RequestMeta } from '../../core/http/request-meta';
import { ZodPipe } from '../../core/http/zod.pipe';
import { AuditService } from '../audit/audit.service';
import type { StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePermission } from '../auth/decorators';
import { ChartService } from './chart.service';
import { CurrenciesService } from './currencies.service';
import { ReportsService } from './reports.service';
import { VouchersService, type CreateAction } from './vouchers.service';

const createVoucherSchema = voucherSchema.and(
  z.object({ action: z.enum(['draft', 'submit', 'post']).default('draft') }),
);
type Range = z.output<typeof ledgerRangeSchema>;

@Controller('admin/accounting')
export class AdminAccountingController {
  constructor(
    private readonly chart: ChartService,
    private readonly vouchers: VouchersService,
    private readonly reports: ReportsService,
    private readonly currencies: CurrenciesService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Chart of accounts ----------

  @Get('accounts')
  @RequirePermission('ledger:read')
  accounts(@Query(new ZodPipe(trialBalanceSchema)) q: z.output<typeof trialBalanceSchema>) {
    return this.chart.list(q.asOf);
  }

  @Get('accounts/options')
  @RequirePermission('ledger:read')
  options() {
    return this.chart.options();
  }

  @Get('accounts/:id/balance')
  @RequirePermission('ledger:read')
  balance(@Param('id', UUID) id: string) {
    return this.chart.balance(id);
  }

  @Get('accounts/:id/ledger')
  @RequirePermission('ledger:read')
  accountLedger(@Param('id', UUID) id: string, @Query(new ZodPipe(ledgerRangeSchema)) q: Range) {
    return this.reports.accountLedger(id, q.from, q.to);
  }

  @Post('accounts')
  @RequirePermission('ledger:coa')
  async createAccount(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(accountCreateSchema)) dto: z.output<typeof accountCreateSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const account = await this.chart.create(dto);
    await this.log(actor, 'account.create', account.id, dto, meta);
    return this.chart.get(account.id);
  }

  @Patch('accounts/:id')
  @RequirePermission('ledger:coa')
  async updateAccount(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(accountUpdateSchema)) dto: z.output<typeof accountUpdateSchema>,
    @Meta() meta: RequestMeta,
  ) {
    await this.chart.update(id, dto);
    await this.log(actor, 'account.update', id, dto, meta);
    return this.chart.get(id);
  }

  // ---------- Vouchers ----------

  @Get('vouchers')
  @RequirePermission('ledger:read')
  list(@Query(new ZodPipe(voucherListSchema)) q: z.output<typeof voucherListSchema>) {
    return this.vouchers.list(q);
  }

  @Get('vouchers/counts')
  @RequirePermission('ledger:read')
  counts() {
    return this.vouchers.counts();
  }

  @Get('vouchers/:id')
  @RequirePermission('ledger:read')
  get(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    return this.vouchers.get(actor, id);
  }

  /** Permission depends on the voucher type; the service checks it. */
  @Post('vouchers')
  @RequirePermission('ledger:read')
  create(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(createVoucherSchema)) dto: z.output<typeof createVoucherSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const { action, ...voucher } = dto;
    return this.vouchers.create(actor, voucher, action as CreateAction, meta);
  }

  @Put('vouchers/:id')
  @RequirePermission('ledger:read')
  update(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(voucherSchema)) dto: z.output<typeof voucherSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.vouchers.update(actor, id, dto, meta);
  }

  @Post('vouchers/:id/submit')
  @HttpCode(200)
  @RequirePermission('ledger:jv_prepare')
  submit(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.vouchers.submit(actor, id, meta);
  }

  @Post('vouchers/:id/post')
  @HttpCode(200)
  @RequirePermission('ledger:read')
  post(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    return this.vouchers.post(actor, id, meta);
  }

  @Post('vouchers/:id/approve')
  @HttpCode(200)
  @RequirePermission('ledger:jv_approve')
  approve(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(voucherApproveSchema, { optional: true }))
    dto: z.output<typeof voucherApproveSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.vouchers.approve(actor, id, dto.selfApprovalReason, meta);
  }

  @Post('vouchers/:id/reject')
  @HttpCode(200)
  @RequirePermission('ledger:jv_approve')
  reject(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(voucherRejectSchema)) dto: z.output<typeof voucherRejectSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.vouchers.reject(actor, id, dto.reason, meta);
  }

  @Post('vouchers/:id/reverse')
  @HttpCode(200)
  @RequirePermission('ledger:jv_approve')
  reverse(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Body(new ZodPipe(voucherReverseSchema)) dto: z.output<typeof voucherReverseSchema>,
    @Meta() meta: RequestMeta,
  ) {
    return this.vouchers.reverse(actor, id, dto, meta);
  }

  @Delete('vouchers/:id')
  @HttpCode(204)
  @RequirePermission('ledger:read')
  async remove(
    @CurrentActor() actor: StaffActor,
    @Param('id', UUID) id: string,
    @Meta() meta: RequestMeta,
  ) {
    await this.vouchers.remove(actor, id, meta);
  }

  // ---------- Reports ----------

  @Get('reports/trial-balance')
  @RequirePermission('ledger:read')
  trialBalance(@Query(new ZodPipe(trialBalanceSchema)) q: z.output<typeof trialBalanceSchema>) {
    return this.reports.trialBalance(q.asOf);
  }

  @Get('reports/income-statement')
  @RequirePermission('ledger:read')
  incomeStatement(@Query(new ZodPipe(ledgerRangeSchema)) q: Range) {
    return this.reports.incomeStatement(q.from, q.to);
  }

  // ---------- Currencies & rates ----------

  @Get('currencies')
  @RequirePermission('ledger:read')
  currencyList() {
    return this.currencies.currencies();
  }

  @Put('currencies')
  @RequirePermission('ledger:coa')
  async saveCurrency(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(currencySchema)) dto: z.output<typeof currencySchema>,
    @Meta() meta: RequestMeta,
  ) {
    const out = await this.currencies.saveCurrency(dto);
    await this.log(actor, 'currency.save', dto.code, dto, meta);
    return out;
  }

  @Get('rates')
  @RequirePermission('ledger:read')
  rates(@Query('currency') currency?: string) {
    return this.currencies.rates(currency?.toUpperCase());
  }

  @Post('rates')
  @RequirePermission('ledger:coa')
  async addRate(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(exchangeRateSchema)) dto: z.output<typeof exchangeRateSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const out = await this.currencies.addRate(dto, actor.userId);
    await this.log(actor, 'exchange_rate.add', dto.currency, dto, meta);
    return out;
  }

  // ---------- Periods ----------

  @Get('periods')
  @RequirePermission('ledger:read')
  periods() {
    return this.currencies.periods();
  }

  @Post('periods/close')
  @HttpCode(200)
  @RequirePermission('ledger:periods')
  async close(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(periodSchema)) dto: z.output<typeof periodSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const out = await this.currencies.closePeriod(dto.month, actor.userId);
    await this.log(actor, 'period.close', dto.month, dto, meta);
    return out;
  }

  @Post('periods/reopen')
  @HttpCode(200)
  @RequirePermission('ledger:periods')
  async reopen(
    @CurrentActor() actor: StaffActor,
    @Body(new ZodPipe(periodSchema)) dto: z.output<typeof periodSchema>,
    @Meta() meta: RequestMeta,
  ) {
    const out = await this.currencies.reopenPeriod(dto.month);
    await this.log(actor, 'period.reopen', dto.month, dto, meta);
    return out;
  }

  private log(
    actor: StaffActor,
    action: string,
    entityId: string,
    after: unknown,
    meta: RequestMeta,
  ) {
    return this.audit.log({
      actor: { realm: 'STAFF', userId: actor.userId },
      action,
      entityType: action.split('.')[0],
      entityId,
      after,
      meta,
    });
  }
}
