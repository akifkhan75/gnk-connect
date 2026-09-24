import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  getAllAgents() {
    return this.agentsService.getAllAgents();
  }

  @Get('agencies')
  getAgencies() {
    return this.agentsService.getAgencies();
  }

  @Roles('GNK_ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
  ) {
    return this.agentsService.updateApprovalStatus(id, status);
  }
}
