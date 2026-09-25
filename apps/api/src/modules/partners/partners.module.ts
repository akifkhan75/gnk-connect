import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { AdminPartnersController } from './admin-partners.controller';
import { PartnerAccountController } from './partner-account.controller';
import { PartnerTeamController } from './partner-team.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminPartnersController, PartnerAccountController, PartnerTeamController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
