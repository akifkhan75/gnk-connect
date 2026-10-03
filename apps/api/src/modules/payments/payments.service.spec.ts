import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { meta, mockPrisma, partner, staff } from '../../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

const paymentRow = {
  id: 'pay-1',
  reference: 'PAY-1',
  method: 'BANK_TRANSFER',
  status: 'SUBMITTED',
  amount: D(15000),
  bankName: 'HBL',
  transactionRef: 'TX-1',
  paidAt: new Date(),
  bookingId: null,
  proofFileId: 'f1',
  notes: null,
  rejectionReason: null,
  createdAt: new Date(),
  verifiedAt: null,
  verifiedById: null,
  accountId: 'acc-1',
  account: {
    id: 'acc-1',
    legalName: 'Al Noor',
    code: 'AGT-1',
    address: 'x',
    city: 'LHE',
    phone: '1',
    email: 'a@b.c',
  },
  attachments: [],
  allocations: [],
  Booking: null,
};

describe('PaymentsService', () => {
  const prisma = mockPrisma();
  const files = { assertPartnerFile: jest.fn() };
  const sequences = { next: jest.fn().mockResolvedValue('PAY-1') };
  const ledger = {
    cashOrBankAccount: jest.fn().mockResolvedValue({ id: 'bank' }),
    systemAccount: jest.fn().mockResolvedValue({ id: 'bank' }),
    postPayment: jest.fn().mockResolvedValue({ reference: 'RV-1' }),
  };
  const notifications = { notifyStaff: jest.fn(), notifyAccount: jest.fn() };
  const settings = { get: jest.fn().mockResolvedValue({ company: { name: 'GNK' } }) };
  const audit = { log: jest.fn() };
  const realtime = { publish: jest.fn() };
  const svc = new PaymentsService(
    prisma as never,
    sequences as never,
    ledger as never,
    files as never,
    notifications as never,
    audit as never,
    realtime as never,
    settings as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payment.findMany.mockResolvedValue([paymentRow]);
    prisma.payment.findUnique.mockResolvedValue(paymentRow);
    prisma.payment.create.mockResolvedValue(paymentRow);
    prisma.payment.count.mockResolvedValue(1);
    prisma.payment.groupBy.mockResolvedValue([{ status: 'SUBMITTED', _count: 2 }]);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
  });

  it('lists partner payments and submits with proof', async () => {
    const listed = await svc.partnerList(partner());
    expect(listed[0].reference).toBe('PAY-1');
    const created = await svc.submit(
      partner(),
      {
        amount: 15000,
        method: 'BANK_TRANSFER',
        bankName: 'HBL',
        transactionRef: 'TX-1',
        paidAt: '2026-10-01',
        proofFileId: 'f1',
        attachmentIds: [],
        allocations: [],
      } as never,
      meta,
    );
    expect(files.assertPartnerFile).toHaveBeenCalled();
    expect(created.reference).toBe('PAY-1');
  });

  it('issues a receipt only after verification', async () => {
    await expect(svc.receipt('pay-1', 'acc-1')).rejects.toBeInstanceOf(NotFoundException);
    prisma.payment.findUnique.mockResolvedValue({
      ...paymentRow,
      status: 'VERIFIED',
      verifiedById: 'su-1',
    });
    prisma.ledgerTransaction.findFirst.mockResolvedValue({
      reference: 'RV-1',
      date: new Date(),
      entries: [{ debit: D(15000), account: { code: '1110', name: 'HBL' } }],
    });
    prisma.staffUser.findUnique.mockResolvedValue({ fullName: 'Finance' });
    const receipt = await svc.receipt('pay-1', 'acc-1');
    expect(receipt.number).toBe('RV-1');
  });

  it('admin list/counts/get/verify/reject', async () => {
    const page = await svc.adminList({ page: 1, pageSize: 25, status: 'SUBMITTED' });
    expect(page.total).toBe(1);
    expect(await svc.adminCounts()).toMatchObject({ SUBMITTED: 2, all: 2 });
    await expect(svc.adminGet('pay-1')).resolves.toMatchObject({ id: 'pay-1' });

    await svc.verify(staff(), 'pay-1', undefined, meta);
    expect(ledger.postPayment).toHaveBeenCalled();

    prisma.payment.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.verify(staff(), 'pay-1', undefined, meta)).rejects.toBeInstanceOf(
      ConflictException,
    );

    await svc.reject(staff(), 'pay-1', 'unclear slip', meta);
  });
});
