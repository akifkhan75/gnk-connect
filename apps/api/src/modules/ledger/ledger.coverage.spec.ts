import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextAccountCode } from '@gnk/validation';
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
  isLocked: false,
  systemKey: null,
  currency: 'PKR',
  description: null,
  accountId: null,
};

describe('nextAccountCode', () => {
  it('pads a 4-digit parent so children start at a 7-digit …0001', () => {
    expect(
      nextAccountCode('1100', ['1000', '1100', '1110', '1120', '1121'], ['1110', '1120']),
    ).toBe('1100001');
  });

  it('increments beside a 7-digit parent', () => {
    expect(nextAccountCode('1100000', ['1100000'], [])).toBe('1100001');
    expect(nextAccountCode('1100000', ['1100000', '1100001'], ['1100001'])).toBe('1100002');
  });

  it('skips codes already used elsewhere', () => {
    expect(nextAccountCode('1100000', ['1100000', '1100001', '1100002'], [])).toBe('1100003');
  });

  it('appends -01 for non-numeric parents', () => {
    expect(nextAccountCode('1200-AGT', ['1200-AGT'], [])).toBe('1200-AGT-01');
    expect(nextAccountCode('1200-AGT', ['1200-AGT', '1200-AGT-01'], ['1200-AGT-01'])).toBe(
      '1200-AGT-02',
    );
  });
});

describe('ChartService coverage', () => {
  const prisma = mockPrisma();
  const svc = new ChartService(prisma as never, {} as never);

  it('lists, options, balances, and creates accounts', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.ledgerAccount.findMany.mockResolvedValue([account]);
    expect((await svc.list()).length).toBe(1);
    expect((await svc.options())[0].id).toBe('a1');
    prisma.ledgerAccount.findUnique.mockResolvedValue(account);
    await svc.balance('a1');
    await svc.get('a1');
    prisma.currency.findUnique.mockResolvedValue({ isActive: true });
    prisma.ledgerAccount.findUnique.mockResolvedValue({
      ...account,
      id: 'p1',
      code: '1100',
      isGroup: true,
    });
    prisma.ledgerAccount.findMany.mockResolvedValue([{ code: '1100', parentId: null }]);
    prisma.ledgerAccount.create.mockResolvedValue(account);
    await svc.create({
      name: 'Bank',
      class: 'ASSET',
      parentId: 'p1',
      isGroup: true,
      currency: 'PKR',
    } as never);
    prisma.ledgerEntry.findFirst.mockResolvedValue(null);
    await svc.update('a1', { name: 'Cash PKR', isLocked: true } as never);
    prisma.ledgerAccount.count.mockResolvedValue(0);
    prisma.ledgerAccount.delete.mockResolvedValue(account);
    await svc.remove('a1');
    prisma.ledgerAccount.findUnique.mockResolvedValue({ ...account, systemKey: 'CASH' });
    await expect(svc.remove('a1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('posts an opening balance against Opening Balance Equity', async () => {
    const ledger = { systemAccount: jest.fn(), post: jest.fn() };
    const chart = new ChartService(prisma as never, ledger as never);
    const parent = { ...account, id: 'p1', code: '1100', isGroup: true };
    const created = { ...account, id: 'new', code: '1100001', parentId: 'p1', isGroup: false };
    prisma.ledgerAccount.findUnique.mockResolvedValue(parent);
    prisma.currency.findUnique.mockResolvedValue({ isActive: true });
    prisma.ledgerAccount.findMany.mockResolvedValue([{ code: '1100', parentId: null }]);
    prisma.ledgerAccount.create.mockResolvedValue(created);
    ledger.systemAccount.mockResolvedValue({ id: 'eq', code: '3400' });
    await chart.create(
      {
        name: 'Petty cash',
        class: 'ASSET',
        parentId: 'p1',
        isGroup: false,
        currency: 'PKR',
        openingBalance: 500,
      } as never,
      'staff-1',
    );
    expect(ledger.post).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'JOURNAL',
        createdById: 'staff-1',
        lines: expect.arrayContaining([
          expect.objectContaining({ ledgerAccountId: 'new', debit: 500 }),
          expect.objectContaining({ ledgerAccountId: 'eq', credit: 500 }),
        ]),
      }),
    );
    prisma.ledgerAccount.findUnique.mockResolvedValue(created);
    prisma.ledgerEntry.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.$queryRaw.mockResolvedValue([]);
    await chart.setOpening('new', 250, 'staff-1');
    prisma.ledgerEntry.findFirst.mockResolvedValue({ id: 'e1' });
    await expect(chart.setOpening('new', 250, 'staff-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects missing accounts and inactive currency', async () => {
    prisma.ledgerAccount.findUnique.mockResolvedValue(null);
    await expect(svc.get('x')).rejects.toBeInstanceOf(NotFoundException);
    prisma.currency.findUnique.mockResolvedValue({ isActive: false });
    prisma.ledgerAccount.findUnique.mockResolvedValue({
      ...account,
      id: 'p1',
      code: '1100',
      isGroup: true,
    });
    await expect(
      svc.create({
        name: 'X',
        class: 'ASSET',
        parentId: 'p1',
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

  it('exposes active rates for the public website and rejects a PKR rate', async () => {
    prisma.currency.findMany.mockResolvedValue([
      { code: 'PKR', name: 'Rupee', symbol: 'Rs', isActive: true },
      { code: 'USD', name: 'Dollar', symbol: '$', isActive: true },
      { code: 'EUR', name: 'Euro', symbol: '€', isActive: true },
    ]);
    prisma.exchangeRate.findMany.mockResolvedValue([
      { currency: 'USD', rate: D(278), date: new Date('2026-01-01'), createdAt: new Date() },
    ]);
    await expect(svc.publicRates()).resolves.toEqual({
      base: 'PKR',
      currencies: [
        { code: 'PKR', name: 'Rupee', symbol: 'Rs', rate: 1 },
        { code: 'USD', name: 'Dollar', symbol: '$', rate: 278 },
      ],
    });
    await expect(
      svc.addRate({ currency: 'PKR', rate: 1, date: '2026-01-01', note: null } as never, 'su-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    const bs = await svc.balanceSheet('2026-01-31');
    expect(bs.totalAssets).toBe(0);
    prisma.booking.findMany.mockResolvedValue([]);
    const sales = await svc.sales('2026-01-01', '2026-01-31', true);
    expect(sales.bookings).toBe(0);
    expect((await svc.commission('2026-01-01', '2026-01-31')).rows).toEqual([]);
    expect((await svc.salesByPartner('2026-01-01', '2026-01-31')).rows).toEqual([]);
    expect((await svc.salesBySupplier('2026-01-01', '2026-01-31')).rows).toEqual([]);
    const exp = await svc.expenses('2026-01-01', '2026-01-31');
    expect(exp.total).toBe(0);
    prisma.ledgerAccount.findMany.mockResolvedValue([]);
    const cash = await svc.cashBank('2026-01-01', '2026-01-31');
    expect(cash.accounts).toEqual([]);
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
