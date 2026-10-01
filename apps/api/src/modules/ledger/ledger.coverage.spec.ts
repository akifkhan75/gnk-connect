import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChartService } from './chart.service';
import { CurrenciesService } from './currencies.service';
import { ReportsService } from './reports.service';
import { VouchersService } from './vouchers.service';
import { mockPrisma, staff, meta } from '../../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

const account = {
  id: 'a1',
  code: '1000',
  name: 'Cash',
  class: 'ASSET',
  parentId: null,
  isGroup: false,
  isActive: true,
  systemKey: null,
  currency: 'PKR',
  description: null,
  accountId: null,
};

describe('ChartService coverage', () => {
  const prisma = mockPrisma();
  const svc = new ChartService(prisma as never);

  it('lists, options, balances, and creates accounts', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.ledgerAccount.findMany.mockResolvedValue([account]);
    expect((await svc.list()).length).toBe(1);
    expect((await svc.options())[0].id).toBe('a1');
    prisma.ledgerAccount.findUnique.mockResolvedValue(account);
    await svc.balance('a1');
    await svc.get('a1');
    prisma.currency.findUnique.mockResolvedValue({ isActive: true });
    prisma.ledgerAccount.create.mockResolvedValue(account);
    await svc.create({
      code: '1100',
      name: 'Bank',
      class: 'ASSET',
      parentId: null,
      isGroup: true,
      currency: 'PKR',
    } as never);
    prisma.ledgerEntry.findFirst.mockResolvedValue(null);
    await svc.update('a1', { name: 'Cash PKR' } as never);
  });

  it('rejects missing accounts and inactive currency', async () => {
    prisma.ledgerAccount.findUnique.mockResolvedValue(null);
    await expect(svc.get('x')).rejects.toBeInstanceOf(NotFoundException);
    prisma.currency.findUnique.mockResolvedValue({ isActive: false });
    await expect(
      svc.create({
        code: '1',
        name: 'X',
        class: 'ASSET',
        isGroup: true,
        currency: 'USD',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CurrenciesService coverage', () => {
  const prisma = mockPrisma();
  const svc = new CurrenciesService(prisma as never);

  it('lists currencies, rates, and periods', async () => {
    prisma.currency.findMany.mockResolvedValue([
      { code: 'PKR', name: 'Rupee', symbol: 'Rs', isActive: true },
      { code: 'USD', name: 'Dollar', symbol: '$', isActive: true },
    ]);
    prisma.exchangeRate.findMany.mockResolvedValue([
      { currency: 'USD', rate: D(280), date: new Date('2026-01-01'), createdAt: new Date() },
    ]);
    const rows = await svc.currencies();
    expect(rows.find((c) => c.code === 'PKR')?.latestRate).toBe(1);

    await svc.saveCurrency({ code: 'USD', name: 'Dollar', symbol: '$', isActive: true } as never);
    prisma.staffUser.findMany.mockResolvedValue([]);
    prisma.exchangeRate.findMany.mockResolvedValue([]);
    await svc.rates('USD');
    prisma.currency.findUnique.mockResolvedValue({ isActive: true });
    await svc.addRate(
      { currency: 'USD', rate: 280, date: '2026-01-01', note: null } as never,
      'su-1',
    );

    prisma.closedPeriod.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);
    await svc.periods();
    prisma.ledgerTransaction.count.mockResolvedValue(0);
    await svc.closePeriod('2020-01', 'su-1');
    await svc.reopenPeriod('2020-01');
  });

  it('blocks deactivating PKR and current-month close', async () => {
    await expect(
      svc.saveCurrency({ code: 'PKR', name: 'Rupee', isActive: false } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    const now = new Date().toISOString().slice(0, 7);
    await expect(svc.closePeriod(now, 'su-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ReportsService coverage', () => {
  const prisma = mockPrisma();
  const chart = {
    sums: jest.fn().mockResolvedValue(new Map()),
    get: jest.fn().mockResolvedValue({ id: 'a1', code: '1000', name: 'Cash' }),
  };
  const svc = new ReportsService(prisma as never, chart as never);

  it('builds ledger, trial balance, and income statement', async () => {
    prisma.ledgerAccount.findUnique.mockResolvedValue({ id: 'a1', currency: 'PKR' });
    prisma.ledgerEntry.findMany.mockResolvedValue([]);
    await svc.accountLedger('a1', '2026-01-01', '2026-01-31');
    prisma.ledgerAccount.findMany.mockResolvedValue([]);
    await svc.trialBalance('2026-01-31');
    prisma.$queryRaw.mockResolvedValue([]);
    const pnl = await svc.incomeStatement('2026-01-01', '2026-01-31');
    expect(pnl.netProfit).toBe(0);
    prisma.ledgerAccount.findUnique.mockResolvedValue(null);
    await expect(svc.accountLedger('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('VouchersService coverage', () => {
  const prisma = mockPrisma();
  const ledger = {
    resolveLines: jest.fn().mockResolvedValue([]),
    partnerOf: jest.fn().mockResolvedValue(null),
    checkLines: jest.fn().mockResolvedValue(undefined),
    postDraft: jest.fn().mockResolvedValue({ reference: 'RV-1' }),
    reverse: jest.fn().mockResolvedValue({ id: 'v2', reference: 'REV-1' }),
  };
  const settings = {
    get: jest.fn().mockResolvedValue({ accounting: { requireJvApproval: true } }),
  };
  const svc = new VouchersService(
    prisma as never,
    ledger as never,
    settings as never,
    { notifyStaff: jest.fn(), notifyStaffUser: jest.fn() } as never,
    { publish: jest.fn() } as never,
    { log: jest.fn() } as never,
  );

  const draft = {
    id: 'v1',
    reference: 'DRAFT-1',
    type: 'JOURNAL',
    status: 'DRAFT',
    date: new Date('2026-01-15'),
    description: 'Opening',
    partnerAccountId: null,
    bookingId: null,
    paymentId: null,
    createdById: 'su-1',
    approvedById: null,
    submittedAt: null,
    approvedAt: null,
    postedAt: null,
    rejectionReason: null,
    reversalOf: null,
    reversedBy: null,
    draftLines: [],
    entries: [],
    attachments: [],
  };

  it('lists, counts, gets, and creates a draft', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([]);
    prisma.ledgerTransaction.count.mockResolvedValue(0);
    await svc.list({ page: 1, pageSize: 25, type: 'all', status: 'all' } as never);
    prisma.ledgerTransaction.groupBy.mockResolvedValue([{ status: 'DRAFT', _count: 2 }]);
    expect((await svc.counts()).DRAFT).toBe(2);

    prisma.ledgerTransaction.findUnique.mockResolvedValue(draft);
    prisma.storedFile.findMany.mockResolvedValue([]);
    prisma.staffUser.findMany.mockResolvedValue([{ id: 'su-1', fullName: 'Admin' }]);
    prisma.partnerAccount.findMany.mockResolvedValue([]);
    prisma.ledgerAccount.findMany.mockResolvedValue([]);
    await svc.get(staff(), 'v1');

    prisma.ledgerTransaction.create.mockResolvedValue(draft);
    await svc.create(
      staff(),
      {
        type: 'JOURNAL',
        date: '2026-01-15',
        description: 'Opening',
        lines: [],
        attachmentIds: [],
      } as never,
      'draft',
      meta,
    );
  });

  it('updates, submits, rejects, posts, reverses, and removes', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      ...draft,
      createdById: 'su-1',
    });
    prisma.ledgerTransaction.findUnique.mockResolvedValue(draft);
    await svc.update(
      staff(),
      'v1',
      {
        type: 'JOURNAL',
        date: '2026-01-16',
        description: 'Edited',
        lines: [],
        attachmentIds: [],
      } as never,
      meta,
    );

    prisma.ledgerTransaction.updateMany.mockResolvedValue({ count: 1 });
    await svc.submit(staff(), 'v1', meta);

    prisma.ledgerTransaction.findUnique.mockResolvedValue({ ...draft, status: 'SUBMITTED' });
    await svc.reject(staff(), 'v1', 'fix it', meta);

    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      ...draft,
      type: 'RECEIPT',
      status: 'DRAFT',
    });
    await svc.post(staff(), 'v1', meta);

    prisma.ledgerTransaction.findUnique
      .mockResolvedValueOnce({ ...draft, status: 'POSTED', reference: 'JV-1' })
      .mockResolvedValueOnce({ ...draft, id: 'v2', reference: 'REV-1', status: 'POSTED' });
    await svc.reverse(staff(), 'v1', { date: '2026-01-16', reason: 'error' }, meta);

    prisma.ledgerTransaction.findUnique.mockResolvedValue(draft);
    prisma.ledgerTransaction.deleteMany.mockResolvedValue({ count: 1 });
    await svc.remove(staff(), 'v1', meta);
  });

  it('rejects missing vouchers and pending period closes', async () => {
    prisma.ledgerTransaction.findUnique.mockResolvedValue(null);
    await expect(svc.get(staff(), 'missing')).rejects.toBeInstanceOf(NotFoundException);
    const currencies = new CurrenciesService(prisma as never);
    prisma.ledgerTransaction.count.mockResolvedValue(3);
    await expect(currencies.closePeriod('2020-01', 'su-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
