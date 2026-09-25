import { Controller, Get, Post, Patch, Delete, Param, Body, Request } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { RequirePartnerRole } from '../auth/decorators/roles.decorator';

@Controller('partner/team')
export class PartnerTeamController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @RequirePartnerRole('OWNER', 'MANAGER', 'STAFF', 'ACCOUNTANT')
  async getTeam(@Request() req: any) {
    return this.partnersService.getTeamMembers(req.actor.accountId);
  }

  @Post('invite')
  @RequirePartnerRole('OWNER', 'MANAGER')
  async inviteMember(@Request() req: any, @Body() data: any) {
    return this.partnersService.inviteMember(
      req.actor.accountId,
      req.actor.userId,
      req.actor.role,
      data,
    );
  }

  @Patch(':userId/role')
  @RequirePartnerRole('OWNER', 'MANAGER')
  async updateRole(
    @Request() req: any,
    @Param('userId') targetUserId: string,
    @Body('role') newRole: string,
  ) {
    return this.partnersService.updateMemberRole(
      req.actor.accountId,
      req.actor.userId,
      req.actor.role,
      targetUserId,
      newRole,
    );
  }

  @Delete(':userId')
  @RequirePartnerRole('OWNER', 'MANAGER')
  async removeMember(@Request() req: any, @Param('userId') targetUserId: string) {
    return this.partnersService.removeMember(
      req.actor.accountId,
      req.actor.userId,
      req.actor.role,
      targetUserId,
    );
  }
}
