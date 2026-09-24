import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('agency/:agencyId')
  getAgencyLedger(@Param('agencyId') agencyId: string) {
    return this.ledgerService.getAgencyTransactions(agencyId);
  }

  @Get('statement/:agencyId')
  getStatementOfAccount(
    @Param('agencyId') agencyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.ledgerService.generateStatementOfAccount(agencyId, from, to);
  }

  @Get('admin/summary')
  @Roles('GNK_ADMIN')
  getAdminSummary() {
    return this.ledgerService.getAdminFinancialSummary();
  }

  @Post('topup')
  @Roles('GNK_ADMIN')
  topUpAgencyWallet(
    @Body('agencyId') agencyId: string,
    @Body('amountPKR') amountPKR: number,
    @Body('reference') reference: string,
    @Body('description') description: string
  ) {
    return this.ledgerService.recordTransaction(
      agencyId,
      'CREDIT_DEPOSIT',
      amountPKR,
      reference,
      description
    );
  }
}
