import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('history')
  getNotificationHistory(@Query('email') email?: string) {
    return this.notificationsService.getNotificationHistory(email);
  }

  @Post('broadcast')
  sendBroadcast(
    @Body('recipientEmail') recipientEmail: string,
    @Body('recipientName') recipientName: string,
    @Body('title') title: string,
    @Body('body') body: string,
  ) {
    return this.notificationsService.sendNotification(
      recipientEmail,
      recipientName,
      'AGENT_APPROVED',
      'EMAIL',
      title,
      body,
    );
  }
}
