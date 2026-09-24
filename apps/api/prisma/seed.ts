import { seedBase } from './seed-base';
import { seedDemo } from './seed-demo';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await seedBase();

  if (process.env.NODE_ENV !== 'production') {
    await seedDemo();
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
