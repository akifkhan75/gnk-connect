import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { AdminPartnersController } from './admin-partners.controller';
import { PartnerAccountController } from './partner-account.controller';

@Module({
  controllers: [AdminPartnersController, PartnerAccountController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
