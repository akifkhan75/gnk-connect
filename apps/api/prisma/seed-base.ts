import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PERMISSIONS, STAFF_ROLES } from '@gnk/types';

/** Reference data every environment needs. Idempotent. */
export async function seedBase(prisma: PrismaClient) {
  // Permissions + system roles (plan 04 §4.2)
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }
  const permissionIds = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));
  for (const [key, role] of Object.entries(STAFF_ROLES)) {
    const row = await prisma.role.upsert({
      where: { key },
      update: { name: role.name },
      create: { key, name: role.name, isSystem: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: row.id } });
    await prisma.rolePermission.createMany({
      data: role.permissions.map((p) => ({ roleId: row.id, permissionId: permissionIds.get(p)! })),
    });
  }

  // First super admin (invite others from the admin console)
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@gnkconnect.pk').toLowerCase();
  let admin = await prisma.staffUser.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString('base64url');
    admin = await prisma.staffUser.create({
      data: {
        email: adminEmail,
        fullName: 'GNK Administrator',
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        roles: { create: { role: { connect: { key: 'SUPER_ADMIN' } } } },
      },
    });
    console.log(
      `\n🔑 Super admin created: ${adminEmail} / ${password}\n   (shown once; change it after signing in)\n`,
    );
  }

  await prisma.paymentMethodConfig.upsert({
    where: { method: 'BANK_TRANSFER' },
    update: {},
    create: { method: 'BANK_TRANSFER', enabled: true },
  });
  await prisma.paymentMethodConfig.upsert({
    where: { method: 'CASH' },
    update: {},
    create: { method: 'CASH', enabled: true },
  });

  const supplier = await prisma.supplier.upsert({
    where: { code: 'airdesk' },
    update: { adapterKey: 'airdesk', name: 'AirDesk' },
    create: { code: 'airdesk', name: 'AirDesk', adapterKey: 'airdesk', status: 'ACTIVE' },
  });

  // Exactly one active DEFAULT pricing rule is required (plan 07 §4.1).
  const hasDefault = await prisma.pricingRule.findFirst({
    where: { scope: 'DEFAULT', isActive: true, deletedAt: null },
  });
  if (!hasDefault) {
    await prisma.pricingRule.create({
      data: {
        name: 'Default markup',
        scope: 'DEFAULT',
        markupType: 'FIXED',
        markupValue: 10000,
        rounding: 'NEAREST_100',
        createdById: admin.id,
      },
    });
  }

  const defaults: Record<string, unknown> = {
    company: {
      name: 'GNK Connect',
      address: 'Blue Area, Islamabad, Pakistan',
      phone: '051 2222031',
      email: 'support@gnkconnect.com',
    },
    bankAccounts: [],
    booking: {
      quoteTtlMinutes: 30,
      holdTtlHours: 24,
      paymentTermsNote:
        'Bookings are sent to the airline once your account balance or credit covers the total. Deposit by bank transfer and upload the slip under Payments.',
    },
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as object },
    });
  }

  // Starter FX rates (PKR per 1 unit). Admin updates these in Settings → Currencies.
  const starterRates: { currency: string; rate: number }[] = [
    { currency: 'USD', rate: 278 },
    { currency: 'SAR', rate: 74.1 },
    { currency: 'AED', rate: 75.7 },
  ];
  for (const r of starterRates) {
    const exists = await prisma.exchangeRate.findFirst({ where: { currency: r.currency } });
    if (!exists) {
      await prisma.exchangeRate.create({
        data: {
          currency: r.currency,
          rate: r.rate,
          date: new Date(),
          note: 'Seeded starting rate — update from Settings',
          createdById: admin.id,
        },
      });
    }
  }

  return { adminId: admin.id, supplierId: supplier.id };
}
