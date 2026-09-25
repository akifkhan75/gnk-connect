import { Controller, Get, Patch, Param, Body, Post } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { RequirePermission } from '../auth/decorators/roles.decorator';

@Controller('admin/partners')
export class AdminPartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @RequirePermission('partners:read')
  async getAllPartners() {
    return this.partnersService.getAllPartners();
  }

  @Patch(':id/status')
  @RequirePermission('partners:review', 'partners:suspend')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'MORE_INFO_REQUIRED',
    @Body('reason') reason?: string,
  ) {
    return this.partnersService.updateApprovalStatus(id, status, reason);
  }
}
