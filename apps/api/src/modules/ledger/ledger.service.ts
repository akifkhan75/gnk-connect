import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  public async getAgencyTransactions(accountId: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { accountId },
    });
    if (!account) return [];

    const entries = await this.prisma.ledgerEntry.findMany({
      where: { ledgerAccountId: account.id },
      include: {
        transaction: true,
      },
      orderBy: { transaction: { postedAt: 'desc' } },
    });

    let runningBalance = 0;
    // Calculate running balance chronologically
    const chronological = [...entries].reverse();
    return chronological.map((e) => {
      const type = e.credit.greaterThan(0) ? 'CREDIT_DEPOSIT' : 'BOOKING_DEBIT';
      const amountPKR = e.credit.greaterThan(0) ? Number(e.credit) : Number(e.debit);
      
      // For PARTNER_RECEIVABLE, credit decreases their debt (adds to wallet), debit increases their debt (subtracts from wallet)
      // So Wallet Balance = Credit - Debit
      runningBalance += Number(e.credit) - Number(e.debit);
      
      return {
        id: e.transaction.id,
        agencyId: accountId,
        type,
        amountPKR,
        balanceAfterPKR: runningBalance,
        reference: e.transaction.reference,
        description: e.transaction.description,
        createdAt: e.transaction.postedAt.toISOString(),
      };
    }).reverse();
  }

  public async getStatementOfAccount(accountId: string, from?: string, to?: string) {
    const txns = await this.getAgencyTransactions(accountId);
    
    // Standard SOA logic...
    // We will just return the full transactions for now as the statement
    const totalCreditsPKR = txns.filter(t => t.type === 'CREDIT_DEPOSIT').reduce((sum, t) => sum + t.amountPKR, 0);
    const totalDebitsPKR = txns.filter(t => t.type === 'BOOKING_DEBIT').reduce((sum, t) => sum + t.amountPKR, 0);
    const closingBalancePKR = txns.length > 0 ? txns[0].balanceAfterPKR : 0;
    const creditLimitPKR = 2000000;

    return {
      statementNumber: `SOA-${new Date().toISOString().slice(0, 7)}-${accountId.slice(0, 8)}`,
      agencyId: accountId,
      agencyName: 'Agency', // Should fetch from DB
      periodStart: from || '2026-01-01',
      periodEnd: to || new Date().toISOString().slice(0, 10),
      openingBalancePKR: 0,
      closingBalancePKR,
      totalDebitsPKR,
      totalCreditsPKR,
      creditLimitPKR,
      availableCreditPKR: creditLimitPKR + closingBalancePKR,
      transactions: txns,
      generatedAt: new Date().toISOString(),
    };
  }

  public async getAdminFinancialSummary() {
    return {
      grossBookingsVolumePKR: 12450000,
      totalSupplierCostPKR: 11150000,
      retainedGnkMarginPKR: 1300000,
      totalAgencyWalletDepositsPKR: 8500000,
      totalOutstandingCreditPKR: 3200000,
      activeAgenciesCount: 14,
    };
  }

  public async submitTopup(
    accountId: string,
    amountPKR: number,
    reference: string,
    bankName: string,
    proofFileId: string,
    submittedById: string,
  ) {
    const existing = await this.prisma.payment.findUnique({ where: { reference } });
    if (existing) throw new BadRequestException('Payment reference already exists');

    return this.prisma.payment.create({
      data: {
        accountId,
        method: 'BANK_TRANSFER', // Assuming enum PaymentMethod.BANK_TRANSFER
        amount: amountPKR,
        reference,
        bankName,
        proofFileId,
        submittedById,
      },
    });
  }

  public async getPendingTopups() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'SUBMITTED', bookingId: null },
      orderBy: { createdAt: 'desc' }
    });
    
    // Fetch accounts manually since relation isn't mapped
    const accountIds = [...new Set(payments.map(p => p.accountId))];
    const accounts = await this.prisma.partnerAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, legalName: true }
    });
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    
    return payments.map(p => ({
      ...p,
      account: accountMap.get(p.accountId)
    }));
  }

  public async verifyTopup(paymentId: string, verifiedById: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status !== 'SUBMITTED') throw new BadRequestException('Payment is not pending verification');

      // Update payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'VERIFIED',
          verifiedById,
          verifiedAt: new Date(),
        },
      });

      // Get or create Ledger Accounts
      let partnerAccount = await tx.ledgerAccount.findUnique({ where: { accountId: payment.accountId } });
      if (!partnerAccount) {
        partnerAccount = await tx.ledgerAccount.create({
          data: {
            type: 'PARTNER_RECEIVABLE',
            accountId: payment.accountId,
            name: `Receivables - Account ${payment.accountId.slice(0, 8)}`,
          },
        });
      }

      let bankAccount = await tx.ledgerAccount.findFirst({ where: { type: 'BANK' } });
      if (!bankAccount) {
        bankAccount = await tx.ledgerAccount.create({
          data: { type: 'BANK', name: 'GNK Main Corporate Bank Account' },
        });
      }

      // Record double-entry: Debit Bank, Credit Partner Receivable
      await tx.ledgerTransaction.create({
        data: {
          reference: `TXN-${payment.reference}`,
          description: `Wallet top-up verified: ${payment.reference}`,
          paymentId: payment.id,
          createdById: verifiedById,
          entries: {
            create: [
              { ledgerAccountId: bankAccount.id, debit: payment.amount, credit: 0 },
              { ledgerAccountId: partnerAccount.id, debit: 0, credit: payment.amount },
            ],
          },
        },
      });

      return { partnerAccount, payment };
    });

    // Notify the user who submitted it
    await this.notifications.notifyWalletTopup(result.payment.submittedById, Number(result.payment.amount));

    return { success: true, message: 'Payment verified and ledger updated' };
  }
}
