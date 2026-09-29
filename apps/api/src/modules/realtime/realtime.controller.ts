import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { CurrentActor } from '../auth/decorators';
import { RealtimeService } from './realtime.service';

@Controller('partner/events')
export class PartnerEventsController {
  constructor(private readonly realtime: RealtimeService) {}

  @Get()
  @SkipThrottle()
  stream(@CurrentActor() actor: PartnerActor, @Res() res: Response) {
    this.realtime.open(actor, res);
  }
}

@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly realtime: RealtimeService) {}

  @Get()
  @SkipThrottle()
  stream(@CurrentActor() actor: StaffActor, @Res() res: Response) {
    this.realtime.open(actor, res);
  }
}
