import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AgentsModule } from './modules/agents/agents.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    SuppliersModule,
    PricingModule,
    AgentsModule,
    BookingsModule,
    UploadsModule,
    LedgerModule,
    NotificationsModule,
  ],
})
export class AppModule {}
