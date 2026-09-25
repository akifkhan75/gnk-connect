import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(RolesGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Roles('GNK_ADMIN')
  @Get('rules')
  getRules() {
    return this.pricingService.getRules();
  }

  @Roles('GNK_ADMIN')
  @Post('rules')
  saveRule(@Body() body: any) {
    return this.pricingService.saveRule(body);
  }

  @Post('calculate')
  calculatePrice(@Body() body: any) {
    return this.pricingService.calculatePrice(body);
  }
}
