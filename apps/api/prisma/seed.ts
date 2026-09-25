import { PrismaClient } from '@prisma/client';
import { seedBase } from './seed-base';
import { seedDemo } from './seed-demo';

const prisma = new PrismaClient();

async function main() {
  const base = await seedBase(prisma);
  console.log('✅ Base data seeded');
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO !== 'false') {
    await seedDemo(prisma, base);
    console.log('✅ Demo data seeded');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
