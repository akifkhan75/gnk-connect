import { PrismaClient, PartnerRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  // Ideally use argon2id as specified in DB docs, using simple hash here for seed
  return crypto
    .pbkdf2Sync(password, 'gnk_connect_static_salt_v1', 1000, 64, 'sha512')
    .toString('hex');
}

export async function seedDemo() {
  console.log('🌱 Seeding Demo Data...');
  const defaultPassword = 'demo' + crypto.randomBytes(4).toString('hex');
  const passwordHash = hashPassword(defaultPassword);

  const agency = await prisma.partnerAccount.upsert({
    where: { code: 'AGT-DEMO' },
    update: {},
    create: {
      code: 'AGT-DEMO',
      type: 'AGENCY',
      legalName: 'Demo Agency Travels',
      city: 'Karachi',
      country: 'PK',
      phone: '+923000000000',
      email: 'demo@agency.com',
      status: 'APPROVED',
    },
  });

  const partnerUser = await prisma.partnerUser.upsert({
    where: { email: 'user@demo.com' },
    update: {},
    create: {
      email: 'user@demo.com',
      passwordHash,
      fullName: 'Demo Partner User',
      phone: '+923000000001',
    },
  });

  await prisma.partnerMember.upsert({
    where: { accountId_userId: { accountId: agency.id, userId: partnerUser.id } },
    update: {},
    create: {
      accountId: agency.id,
      userId: partnerUser.id,
      role: PartnerRole.OWNER,
    },
  });

  const staffUser = await prisma.staffUser.upsert({
    where: { email: 'admin@gnk.com' },
    update: {},
    create: {
      email: 'admin@gnk.com',
      passwordHash,
      fullName: 'Demo Admin User',
    },
  });

  console.log('✅ Demo Data Seeded.');
  console.log('🔑 Passwords for user@demo.com and admin@gnk.com: ' + defaultPassword);
}
