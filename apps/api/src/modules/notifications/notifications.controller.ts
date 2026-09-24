import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('history')
  getNotificationHistory(@Query('email') email?: string) {
    return this.notificationsService.getNotificationHistory(email);
  }

  @Post('broadcast')
  @Roles('GNK_ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  sendBroadcast(
    @Body('recipientEmail') recipientEmail: string,
    @Body('recipientName') recipientName: string,
    @Body('title') title: string,
    @Body('body') body: string
  ) {
    return this.notificationsService.sendNotification(
      recipientEmail,
      recipientName,
      'AGENT_APPROVED',
      'EMAIL',
      title,
      body
    );
  }
}
