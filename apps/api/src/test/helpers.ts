import { ALL_PERMISSIONS, type Permission } from '@gnk/types';
import type { PartnerActor, StaffActor } from '../modules/auth/auth.types';
import type { RequestMeta } from '../core/http/request-meta';

export const meta: RequestMeta = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  requestId: 'req-1',
};

export const partner = (overrides: Partial<PartnerActor> = {}): PartnerActor => ({
  realm: 'PARTNER',
  userId: 'pu-1',
  sessionId: 'sess-p',
  email: 'owner@demo.test',
  fullName: 'Owner Demo',
  accountId: 'acc-1',
  accountCode: 'AGT-000001',
  accountName: 'Al Noor Travels',
  accountType: 'AGENCY',
  accountStatus: 'APPROVED',
  role: 'OWNER',
  mustChangePassword: false,
  ...overrides,
});

export const staff = (permissions: Permission[] = ALL_PERMISSIONS): StaffActor => ({
  realm: 'STAFF',
  userId: 'su-1',
  sessionId: 'sess-s',
  email: 'admin@ci.test',
  fullName: 'Admin User',
  roles: ['SUPER_ADMIN'],
  permissions: new Set(permissions),
  mustChangePassword: false,
});

const model = () => ({
  findUnique: jest.fn(),
  findUniqueOrThrow: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  createMany: jest.fn().mockResolvedValue({ count: 0 }),
  update: jest.fn(),
  updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  groupBy: jest.fn().mockResolvedValue([]),
  aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
});

type PrismaModelMock = ReturnType<typeof model>;

export type PrismaMock = Record<string, PrismaModelMock> & {
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
};

export function mockPrisma(): PrismaMock {
  const prisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn(),
  } as unknown as PrismaMock;
  const names = [
    'partnerAccount',
    'partnerUser',
    'partnerMember',
    'partnerInvite',
    'staffUser',
    'role',
    'permission',
    'rolePermission',
    'staffUserRole',
    'session',
    'oneTimeToken',
    'storedFile',
    'kycDocument',
    'supplier',
    'product',
    'departure',
    'pricingRule',
    'pricingTier',
    'priceQuote',
    'documentSequence',
    'booking',
    'bookingConcession',
    'passenger',
    'bookingStatusEvent',
    'supplierCallLog',
    'paymentMethodConfig',
    'payment',
    'paymentAttachment',
    'paymentAllocation',
    'currency',
    'exchangeRate',
    'ledgerAccount',
    'ledgerTransaction',
    'ledgerEntry',
    'voucherAttachment',
    'closedPeriod',
    'invoice',
    'notification',
    'auditLog',
    'setting',
  ];
  for (const name of names) prisma[name] = model();
  prisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') return (arg as (tx: PrismaMock) => unknown)(prisma);
    return Promise.all(arg as Promise<unknown>[]);
  });
  return prisma;
}

export function resStub() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
}

export const silent = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  notifyAccount: jest.fn(),
  notifyPartnerUser: jest.fn(),
  notifyStaff: jest.fn(),
  notifyStaffUser: jest.fn(),
  publish: jest.fn(),
};
