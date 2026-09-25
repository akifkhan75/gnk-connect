import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { UUID } from '../../core/http/parse-uuid';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { CurrentActor } from '../auth/decorators';
import { NotificationsService } from './notifications.service';

@Controller('partner/notifications')
export class PartnerNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentActor() actor: PartnerActor, @Query('unread') unread?: string) {
    return this.notifications.list('PARTNER', actor.userId, unread === 'true');
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentActor() actor: PartnerActor) {
    await this.notifications.markRead('PARTNER', actor.userId);
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@CurrentActor() actor: PartnerActor, @Param('id', UUID) id: string) {
    await this.notifications.markRead('PARTNER', actor.userId, id);
  }
}

@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentActor() actor: StaffActor, @Query('unread') unread?: string) {
    return this.notifications.list('STAFF', actor.userId, unread === 'true');
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentActor() actor: StaffActor) {
    await this.notifications.markRead('STAFF', actor.userId);
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string) {
    await this.notifications.markRead('STAFF', actor.userId, id);
  }
}
