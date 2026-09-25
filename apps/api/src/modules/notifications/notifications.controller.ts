import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Realm } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(
    // Usually from Req.user
    @Body('userId') userId: string,
    @Body('realm') realm: Realm,
  ) {
    // Hardcoded for testing since we don't have full auth wired
    return this.notificationsService.getMyNotifications(userId || 'user-123', realm || 'PARTNER');
  }

  @Get('unread-count')
  getUnreadCount(
    @Body('userId') userId: string,
    @Body('realm') realm: Realm,
  ) {
    return this.notificationsService.getUnreadCount(userId || 'user-123', realm || 'PARTNER');
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId || 'user-123');
  }

  @Patch('read-all')
  markAllAsRead(
    @Body('userId') userId: string,
    @Body('realm') realm: Realm,
  ) {
    return this.notificationsService.markAllAsRead(userId || 'user-123', realm || 'PARTNER');
  }
}
