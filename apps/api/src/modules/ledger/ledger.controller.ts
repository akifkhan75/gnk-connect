import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';

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
    @Query('to') to?: string,
  ) {
    return this.ledgerService.getStatementOfAccount(agencyId, from, to);
  }

  @Get('admin/summary')
  getAdminSummary() {
    return this.ledgerService.getAdminFinancialSummary();
  }

  @Get('admin/pending-topups')
  getPendingTopups() {
    return this.ledgerService.getPendingTopups();
  }

  @Post('topup')
  topUpAgencyWallet(
    @Body('accountId') accountId: string,
    @Body('amountPKR') amountPKR: number,
    @Body('reference') reference: string,
    @Body('bankName') bankName: string,
    @Body('proofFileId') proofFileId: string,
    @Body('submittedById') submittedById: string, // in reality comes from req.user
  ) {
    return this.ledgerService.submitTopup(
      accountId,
      amountPKR,
      reference,
      bankName,
      proofFileId,
      submittedById,
    );
  }

  @Post('topup/:id/verify')
  verifyTopup(
    @Param('id') paymentId: string,
    @Body('verifiedById') verifiedById: string, // in reality comes from req.user
  ) {
    return this.ledgerService.verifyTopup(paymentId, verifiedById);
  }
}
