import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { 
  LedgerTransaction, 
  StatementOfAccount, 
  AdminFinancialSummary, 
  LedgerEntryType 
} from '@gnk/types';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  // In-memory persistent ledger transactions store (backed by seed & live runtime)
  private transactions: LedgerTransaction[] = [
    {
      id: 'TXN-2026-00101',
      agencyId: 'agency-abc',
      agentId: 'user-agent-1',
      type: 'CREDIT_DEPOSIT',
      amountPKR: 1500000,
      balanceAfterPKR: 1500000,
      reference: 'HBL-DEP-849201',
      description: 'Advance wholesale deposit for group block allocations',
      createdAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 'TXN-2026-00102',
      agencyId: 'agency-abc',
      agentId: 'user-agent-1',
      bookingId: 'GNK-2026-00481',
      type: 'BOOKING_DEBIT',
      amountPKR: 850000,
      balanceAfterPKR: 650000,
      reference: 'GNK-2026-00481',
      description: 'Payment debit for Dubai Winter Shopping Group (3 Pax)',
      createdAt: '2026-08-10T14:30:00.000Z',
    },
    {
      id: 'TXN-2026-00103',
      agencyId: 'agency-abc',
      agentId: 'user-agent-1',
      type: 'COMMISSION_PAYOUT',
      amountPKR: 50000,
      balanceAfterPKR: 700000,
      reference: 'BONUS-2026-Q3',
      description: 'Q3 Wholesale Reseller Early-Bird Bonus',
      createdAt: '2026-08-31T18:00:00.000Z',
    },
    {
      id: 'TXN-2026-00104',
      agencyId: 'agency-abc',
      agentId: 'user-agent-1',
      bookingId: 'GNK-2026-00482',
      type: 'BOOKING_DEBIT',
      amountPKR: 350000,
      balanceAfterPKR: 350000,
      reference: 'GNK-2026-00482',
      description: 'Payment debit for Azerbaijan Explorer Group (1 Pax)',
      createdAt: '2026-09-05T11:15:00.000Z',
    },
    {
      id: 'TXN-2026-00105',
      agencyId: 'agency-abc',
      agentId: 'user-agent-1',
      type: 'CREDIT_DEPOSIT',
      amountPKR: 500000,
      balanceAfterPKR: 850000,
      reference: 'MCB-WIRE-491028',
      description: 'Bank wire transfer top-up',
      createdAt: '2026-09-18T09:40:00.000Z',
    },
  ];

  public getAgencyTransactions(agencyId: string): LedgerTransaction[] {
    return this.transactions
      .filter((t) => t.agencyId === agencyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public recordTransaction(
    agencyId: string,
    type: LedgerEntryType,
    amountPKR: number,
    reference: string,
    description: string,
    agentId?: string,
    bookingId?: string
  ): LedgerTransaction {
    const currentTxns = this.getAgencyTransactions(agencyId);
    const lastBalance = currentTxns.length > 0 ? currentTxns[0].balanceAfterPKR : 0;

    let newBalance = lastBalance;
    if (type === 'CREDIT_DEPOSIT' || type === 'COMMISSION_PAYOUT' || type === 'BOOKING_REFUND') {
      newBalance += amountPKR;
    } else if (type === 'BOOKING_DEBIT') {
      newBalance -= amountPKR;
    }

    const newTxn: LedgerTransaction = {
      id: `TXN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      agencyId,
      agentId,
      bookingId,
      type,
      amountPKR,
      balanceAfterPKR: newBalance,
      reference,
      description,
      createdAt: new Date().toISOString(),
    };

    this.transactions.push(newTxn);
    this.logger.log(`Recorded ledger txn [${newTxn.id}] for agency [${agencyId}]: ${type} PKR ${amountPKR.toLocaleString()}`);
    return newTxn;
  }

  public generateStatementOfAccount(
    agencyId: string,
    periodStart?: string,
    periodEnd?: string
  ): StatementOfAccount {
    const allTxns = this.getAgencyTransactions(agencyId).reverse(); // chronological

    const start = periodStart ? new Date(periodStart) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    const filtered = allTxns.filter((t) => {
      const dt = new Date(t.createdAt);
      return dt >= start && dt <= end;
    });

    let totalDebits = 0;
    let totalCredits = 0;

    filtered.forEach((t) => {
      if (t.type === 'BOOKING_DEBIT') {
        totalDebits += t.amountPKR;
      } else if (t.type === 'CREDIT_DEPOSIT' || t.type === 'COMMISSION_PAYOUT' || t.type === 'BOOKING_REFUND') {
        totalCredits += t.amountPKR;
      }
    });

    const openingBalance = filtered.length > 0 ? (filtered[0].balanceAfterPKR - (filtered[0].type === 'BOOKING_DEBIT' ? -filtered[0].amountPKR : filtered[0].amountPKR)) : 0;
    const closingBalance = filtered.length > 0 ? filtered[filtered.length - 1].balanceAfterPKR : 0;
    const creditLimit = 2000000; // 2 Million PKR credit limit standard

    return {
      statementNumber: `SOA-${end.getFullYear()}${(end.getMonth() + 1).toString().padStart(2, '0')}-${agencyId.slice(-4).toUpperCase()}`,
      agencyId,
      agencyName: agencyId === 'agency-abc' ? 'ABC Travels (Pvt) Ltd' : 'Partner Travel Agency',
      agencyNtn: '7392810-4',
      agencyDtsLicense: 'DTS-4920-KHI',
      officeAddress: 'Suite 402, Business Avenue, Shahrah-e-Faisal, Karachi, Pakistan',
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      openingBalancePKR: Math.max(0, openingBalance),
      closingBalancePKR: closingBalance,
      totalDebitsPKR: totalDebits,
      totalCreditsPKR: totalCredits,
      creditLimitPKR: creditLimit,
      availableCreditPKR: creditLimit + closingBalance,
      transactions: filtered.reverse(),
      generatedAt: new Date().toISOString(),
    };
  }

  public getAdminFinancialSummary(): AdminFinancialSummary {
    return {
      grossBookingsVolumePKR: 12450000,
      totalSupplierCostPKR: 11150000,
      retainedGnkMarginPKR: 1300000,
      totalAgencyWalletDepositsPKR: 8500000,
      totalOutstandingCreditPKR: 3200000,
      activeAgenciesCount: 14,
    };
  }
}
