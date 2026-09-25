import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('rules')
  getRules() {
    return this.pricingService.getRules();
  }

  @Post('rules')
  saveRule(@Body() body: any) {
    return this.pricingService.saveRule(body);
  }

  @Post('calculate')
  calculatePrice(@Body() body: any) {
    return this.pricingService.calculatePrice(body);
  }
}
