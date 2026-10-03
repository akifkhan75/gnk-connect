import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export function createPrismaAdapter() {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://127.0.0.1:5432/unused',
  });
}

export function createPrismaClient() {
  return new PrismaClient({
    adapter: createPrismaAdapter(),
    log: ['warn', 'error'],
  });
}
