import { PrismaClient, Realm, PaymentMethod } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export async function seedBase() {
  console.log('🌱 Seeding Base Data...');

  // 1. Roles & Permissions (Staff)
  const roleAdmin = await prisma.role.upsert({
    where: { key: 'SUPER_ADMIN' },
    update: {},
    create: { key: 'SUPER_ADMIN', name: 'Super Admin', isSystem: true },
  });

  // 2. Payment Methods
  await prisma.paymentMethodConfig.upsert({
    where: { method: PaymentMethod.BANK_TRANSFER },
    update: {},
    create: { method: PaymentMethod.BANK_TRANSFER, enabled: true, settings: {} },
  });

  // 3. AirDesk Supplier
  await prisma.supplier.upsert({
    where: { code: 'airdesk' },
    update: {},
    create: {
      code: 'airdesk',
      name: 'AirDesk Groups API Engine',
      adapterKey: 'airdesk-v2',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Base Data Seeded.');
}
