import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Connected to PostgreSQL database via Prisma');
    } catch (err: any) {
      console.warn('⚠️ Prisma connection warning (running in offline/mock mode if DB not up):', err.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
