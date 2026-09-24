import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { AirDeskHttpClient } from './airdesk-http.client';
import { InventorySyncCron } from './inventory-sync.cron';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, AirDeskHttpClient, InventorySyncCron],
  exports: [SuppliersService, AirDeskHttpClient, InventorySyncCron],
})
export class SuppliersModule {}
