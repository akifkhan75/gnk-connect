import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { MockAirDeskAdapter } from '@gnk/suppliers';
import { importSupplierProducts } from '../src/modules/catalog/catalog-import';

/**
 * Local/staging demo data: an approved agency, a pending individual agent, one
 * staff user per role and a published catalogue from the mock AirDesk feed.
 * Refuses to run in production.
 */
export async function seedDemo(
  prisma: PrismaClient,
  base: { adminId: string; supplierId: string },
) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seed must not run in production');

  const password = process.env.SEED_DEMO_PASSWORD || randomBytes(6).toString('base64url') + 'Demo!';
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const created: string[] = [];

  // Sets the password only for new users, or legacy users whose hash isn't argon2.
  const ensurePartnerUser = async (email: string, fullName: string, phone: string) => {
    const existing = await prisma.partnerUser.findUnique({ where: { email } });
    if (existing?.passwordHash?.startsWith('$argon2')) return existing;
    created.push(email);
    return prisma.partnerUser.upsert({
      where: { email },
      update: { passwordHash: hash, status: 'ACTIVE', emailVerifiedAt: new Date() },
      create: { email, fullName, phone, passwordHash: hash, emailVerifiedAt: new Date() },
    });
  };

  const agency = await prisma.partnerAccount.upsert({
    where: { code: 'AGT-DEMO' },
    update: {
      status: 'APPROVED',
      approvedAt: new Date(),
      creditLimit: 500000,
      legalName: 'Al-Noor Travel & Tours (Pvt) Ltd',
      tradeName: 'Al-Noor Travels',
    },
    create: {
      code: 'AGT-DEMO',
      type: 'AGENCY',
      status: 'APPROVED',
      legalName: 'Al-Noor Travel & Tours (Pvt) Ltd',
      tradeName: 'Al-Noor Travels',
      dtsLicenseNo: 'DTS-ISB-4417',
      ntn: '45123678',
      city: 'Islamabad',
      address: 'Office 12, Jinnah Avenue, Blue Area, Islamabad',
      phone: '+923001234567',
      email: 'owner@alnoor.demo',
      creditLimit: 500000,
      approvedAt: new Date(),
    },
  });
  const owner = await ensurePartnerUser('owner@alnoor.demo', 'Bilal Ahmed', '+923001234567');
  const agent = await ensurePartnerUser('agent@alnoor.demo', 'Sana Tariq', '+923211234567');
  for (const [user, role] of [
    [owner, 'OWNER'],
    [agent, 'STAFF'],
  ] as const) {
    await prisma.partnerMember.upsert({
      where: { accountId_userId: { accountId: agency.id, userId: user.id } },
      update: {},
      create: { accountId: agency.id, userId: user.id, role },
    });
  }

  const pending = await prisma.partnerAccount.upsert({
    where: { code: 'AGT-PEND' },
    update: {},
    create: {
      code: 'AGT-PEND',
      type: 'INDIVIDUAL',
      status: 'SUBMITTED',
      legalName: 'Imran Qureshi',
      city: 'Lahore',
      address: 'House 5, Street 9, Gulberg III, Lahore',
      phone: '+923331234567',
      email: 'imran@pending.demo',
    },
  });
  const pendingUser = await ensurePartnerUser(
    'imran@pending.demo',
    'Imran Qureshi',
    '+923331234567',
  );
  await prisma.partnerMember.upsert({
    where: { accountId_userId: { accountId: pending.id, userId: pendingUser.id } },
    update: {},
    create: { accountId: pending.id, userId: pendingUser.id, role: 'OWNER' },
  });

  const staff = [
    ['ops@gnkconnect.pk', 'Hamza Operations', 'OPERATIONS'],
    ['finance@gnkconnect.pk', 'Ayesha Finance', 'FINANCE'],
    ['partners@gnkconnect.pk', 'Usman Partners', 'PARTNER_MANAGER'],
  ] as const;
  for (const [email, fullName, role] of staff) {
    const existing = await prisma.staffUser.findUnique({ where: { email } });
    if (existing?.passwordHash?.startsWith('$argon2')) continue;
    created.push(email);
    await prisma.staffUser.upsert({
      where: { email },
      update: { passwordHash: hash, status: 'ACTIVE' },
      create: {
        email,
        fullName,
        passwordHash: hash,
        roles: { create: { role: { connect: { key: role } } } },
      },
    });
  }

  await prisma.setting.update({
    where: { key: 'bankAccounts' },
    data: {
      value: [
        {
          bank: 'Meezan Bank (demo)',
          title: 'GNK Connect (Pvt) Ltd',
          accountNo: '0101-0105123456',
          iban: 'PK36MEZN0001010105123456',
          branch: 'Blue Area, Islamabad',
        },
      ],
    },
  });

  const products = await new MockAirDeskAdapter().listProducts();
  const result = await importSupplierProducts(prisma, base.supplierId, products, {
    publishNew: true,
  });
  await prisma.product.updateMany({
    where: { supplierId: base.supplierId, deletedAt: null },
    data: { isPublished: true },
  });
  await prisma.product.updateMany({
    where: { supplierProductId: { in: ['AD-UMRAH-15-EXEC', 'AD-LHE-JED-SV'] } },
    data: { isFeatured: true },
  });
  await prisma.supplier.update({
    where: { id: base.supplierId },
    data: { lastSyncAt: new Date(), lastSyncStatus: 'OK' },
  });

  console.log(
    `📦 Catalogue: ${result.products} products, ${result.departures} departures (published)`,
  );
  if (created.length) {
    console.log(`\n👥 Demo users (password for all: ${password})\n   ${created.join('\n   ')}\n`);
  } else {
    console.log('👥 Demo users already exist; passwords unchanged.');
  }
}
