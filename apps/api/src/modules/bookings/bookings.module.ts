import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { PricingModule } from '../pricing/pricing.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BookingSequenceService } from './booking-sequence.service';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SuppliersModule, PricingModule, PrismaModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingSequenceService],
  exports: [BookingsService],
})
export class BookingsModule {}
