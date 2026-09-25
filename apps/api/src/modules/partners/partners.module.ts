import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { AdminPartnersController } from './admin-partners.controller';
import { PartnerAccountController } from './partner-account.controller';
import { PartnerTeamController } from './partner-team.controller';

@Module({
  controllers: [AdminPartnersController, PartnerAccountController, PartnerTeamController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
