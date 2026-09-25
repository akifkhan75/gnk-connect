import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';

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

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
  ) {
    return this.agentsService.updateApprovalStatus(id, status);
  }
}
