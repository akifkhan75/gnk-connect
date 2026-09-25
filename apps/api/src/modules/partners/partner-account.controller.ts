import { Controller, Get, Patch, Body, Request, Post } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { RequirePartnerRole } from '../auth/decorators/roles.decorator';

@Controller('partner/account')
export class PartnerAccountController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @RequirePartnerRole('OWNER', 'MANAGER', 'STAFF', 'ACCOUNTANT')
  async getMyAccount(@Request() req: any) {
    return this.partnersService.getAccount(req.actor.accountId);
  }

  @Post('submit')
  @RequirePartnerRole('OWNER')
  async submitForReview(@Request() req: any) {
    // Only allow submitting if status is DRAFT or MORE_INFO_REQUIRED
    return this.partnersService.submitAccount(req.actor.accountId);
  }

  @Patch('profile')
  @RequirePartnerRole('OWNER')
  async updateProfile(@Request() req: any, @Body() data: any) {
    return this.partnersService.updateProfile(req.actor.accountId, data);
  }
}
