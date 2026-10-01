import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthCacheService } from '../auth/auth-cache.service';
import { PartnersService } from './partners.service';
import { PartnerUsersService } from './partner-users.service';
import { meta, mockPrisma, partner, staff } from '../../test/helpers';

const D = (n: number) => new Prisma.Decimal(n);

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acc-1',
    code: 'AGT-1',
    type: 'AGENCY',
    status: 'DRAFT',
    legalName: 'Al Noor',
    tradeName: 'Al Noor',
    city: 'LHE',
    address: 'x',
    phone: '1',
    email: 'a@b.c',
    documents: [
      {
        id: 'd1',
        type: 'DTS_LICENSE',
        status: 'PENDING',
        fileId: 'f1',
        file: { originalName: 'dts.pdf', mimeType: 'application/pdf' },
        reviewNote: null,
        createdAt: new Date(),
      },
      {
        id: 'd2',
        type: 'NTN_CERTIFICATE',
        status: 'PENDING',
        fileId: 'f2',
        file: { originalName: 'ntn.pdf', mimeType: 'application/pdf' },
        reviewNote: null,
        createdAt: new Date(),
      },
    ],
    members: [
      {
        id: 'm1',
        userId: 'pu-1',
        role: 'OWNER',
        createdAt: new Date(),
        user: {
          fullName: 'Owner',
          email: 'owner@demo.test',
          phone: '1',
          status: 'ACTIVE',
          lastLoginAt: null,
          emailVerifiedAt: new Date(),
        },
      },
    ],
    dtsLicenseNo: null,
    iataCode: null,
    ntn: null,
    cnic: null,
    creditLimit: D(0),
    reviewNote: null,
    rejectionReason: null,
    suspendedReason: null,
    approvedAt: null,
    createdAt: new Date(),
    pricingTierId: null,
    reviewedById: null,
    reviewedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe('PartnersService coverage', () => {
  const prisma = mockPrisma();
  const files = { assertPartnerFile: jest.fn() };
  const mailer = { partnerInvite: jest.fn() };
  const ledger = {
    balance: jest.fn().mockResolvedValue({ balance: 0, creditLimit: 0, availableFunds: 0 }),
    balances: jest.fn().mockResolvedValue(new Map()),
  };
  const notifications = { notifyStaff: jest.fn(), notifyAccount: jest.fn() };
  const bookings = { toListItem: jest.fn().mockReturnValue({ id: 'b' }) };
  const svc = new PartnersService(
    prisma as never,
    { encrypt: jest.fn(), decrypt: jest.fn((v: string) => v) } as never,
    mailer as never,
    { log: jest.fn() } as never,
    new AuthCacheService(),
    { revokeAllForUser: jest.fn() } as never,
    files as never,
    ledger as never,
    notifications as never,
    bookings as never,
  );

  beforeEach(() => {
    prisma.partnerAccount.findUnique.mockResolvedValue(account());
    prisma.partnerAccount.findUniqueOrThrow.mockResolvedValue(account());
  });

  it('manages documents, team, and admin review', async () => {
    await svc.addDocument(partner(), 'DTS_LICENSE', 'f1');
    prisma.kycDocument.deleteMany.mockResolvedValue({ count: 1 });
    await svc.removeDocument(partner(), 'd1');

    const ready = account({ status: 'DRAFT' });
    prisma.partnerAccount.findUniqueOrThrow.mockResolvedValue(ready);
    prisma.partnerAccount.findUnique.mockResolvedValue(ready);
    await svc.submit(partner(), meta);

    prisma.partnerMember.findMany.mockResolvedValue(ready.members);
    prisma.partnerInvite.findMany.mockResolvedValue([
      {
        id: 'i1',
        email: 'x@y.z',
        role: 'STAFF',
        expiresAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    await svc.getTeam(partner());

    prisma.partnerMember.findFirst.mockResolvedValue(null);
    prisma.partnerInvite.create.mockResolvedValue({
      id: 'inv',
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    await svc.invite(partner(), 'new@demo.test', 'STAFF', meta);
    prisma.partnerInvite.updateMany.mockResolvedValue({ count: 1 });
    await svc.revokeInvite(partner(), 'inv');

    prisma.partnerMember.findUnique.mockResolvedValue({
      id: 'm2',
      userId: 'u2',
      role: 'STAFF',
    });
    await svc.updateRole(partner(), 'u2', 'ACCOUNTANT', meta);
    prisma.partnerMember.count.mockResolvedValue(0);
    await svc.removeMember(partner(), 'u2', meta);

    prisma.partnerAccount.findMany.mockResolvedValue([]);
    prisma.partnerAccount.count.mockResolvedValue(0);
    await svc.adminList({ page: 1, pageSize: 25, status: 'all' });
    prisma.partnerAccount.groupBy.mockResolvedValue([{ status: 'SUBMITTED', _count: 2 }]);
    expect((await svc.adminCounts()).PENDING).toBe(2);

    prisma.partnerAccount.findUnique.mockResolvedValue(account({ status: 'SUBMITTED' }));
    prisma.booking.groupBy.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);
    await svc.adminDetail('acc-1', staff());
    await svc.review(staff(), 'acc-1', 'approve', undefined, meta);
    await svc.setCredit(staff(), 'acc-1', 1000, null, meta);
    prisma.kycDocument.findUnique.mockResolvedValue({
      id: 'd1',
      accountId: 'acc-1',
      status: 'PENDING',
    });
    await svc.reviewDocument(staff(), 'd1', 'VERIFIED', 'ok', meta);
  });

  it('rejects invalid team and document operations', async () => {
    prisma.partnerAccount.findUniqueOrThrow.mockResolvedValue(account({ status: 'APPROVED' }));
    await expect(svc.addDocument(partner(), 'DTS_LICENSE', 'f')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.removeDocument(partner(), 'd')).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.invite(partner({ accountType: 'INDIVIDUAL' }), 'a@b.c', 'STAFF', meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateRole(partner(), 'pu-1', 'STAFF', meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.partnerInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.revokeInvite(partner(), 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.review(staff([]), 'acc-1', 'approve', undefined, meta)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    prisma.partnerAccount.findUnique.mockResolvedValue(null);
    await expect(svc.getAccount('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PartnerUsersService coverage', () => {
  const prisma = mockPrisma();
  const partners = { getTeam: jest.fn().mockResolvedValue({ members: [], invites: [] }) };
  const svc = new PartnerUsersService(
    prisma as never,
    partners as never,
    { hash: jest.fn().mockResolvedValue('h') } as never,
    { revokeAllForUser: jest.fn() } as never,
    new AuthCacheService(),
    { partnerInvite: jest.fn(), accountCreated: jest.fn(), passwordReset: jest.fn() } as never,
    { log: jest.fn() } as never,
    { notifyPartnerUser: jest.fn() } as never,
    { publish: jest.fn() } as never,
  );

  it('adds members and lists admin users', async () => {
    prisma.partnerUser.findUnique.mockResolvedValue(null);
    prisma.partnerUser.create.mockResolvedValue({ id: 'u2' });
    await svc.addMember(
      partner(),
      {
        email: 'staff@demo.test',
        fullName: 'Staff',
        phone: '1',
        role: 'STAFF',
        password: 'temp-pass-1',
      } as never,
      meta,
    );

    prisma.partnerMember.findUnique.mockResolvedValue({ id: 'm2', role: 'STAFF' });
    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue({
      id: 'u2',
      status: 'ACTIVE',
      memberships: [{ accountId: 'acc-1' }],
    });
    await svc.setMemberStatus(partner(), 'u2', 'DISABLED', meta);

    prisma.partnerAccount.findUnique.mockResolvedValue({
      id: 'acc-1',
      deletedAt: null,
      type: 'AGENCY',
      tradeName: 'Al',
      legalName: 'Al',
    });
    prisma.partnerMember.findMany.mockResolvedValue([]);
    prisma.partnerInvite.findMany.mockResolvedValue([]);
    await svc.adminList('acc-1');
    await svc.adminCreate(
      staff(),
      'acc-1',
      { email: 'n@demo.test', fullName: 'N', phone: '1', role: 'STAFF', mode: 'invite' } as never,
      meta,
    );
    prisma.partnerMember.findUnique.mockResolvedValue({ id: 'm2', role: 'STAFF' });
    prisma.partnerMember.count.mockResolvedValue(2);
    await svc.adminUpdate(staff(), 'acc-1', 'u2', { role: 'ACCOUNTANT' } as never, meta);
    prisma.partnerUser.findUniqueOrThrow.mockResolvedValue({
      id: 'u2',
      email: 'n@demo.test',
      status: 'ACTIVE',
    });
    await svc.adminResetPassword(staff(), 'acc-1', 'u2', { mode: 'link' } as never, meta);
    prisma.partnerInvite.updateMany.mockResolvedValue({ count: 1 });
    await svc.adminRevokeInvite(staff(), 'acc-1', 'i1', meta);
  });

  it('blocks individual accounts and self-disable', async () => {
    await expect(
      svc.addMember(partner({ accountType: 'INDIVIDUAL' }), { role: 'STAFF' } as never, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.setMemberStatus(partner(), 'pu-1', 'DISABLED', meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.partnerAccount.findUnique.mockResolvedValue(null);
    await expect(svc.adminList('missing')).rejects.toBeInstanceOf(NotFoundException);
    prisma.partnerInvite.updateMany.mockResolvedValue({ count: 0 });
    prisma.partnerAccount.findUnique.mockResolvedValue({ id: 'acc-1', deletedAt: null });
    await expect(svc.adminRevokeInvite(staff(), 'acc-1', 'x', meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
