import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { parsePagination } from '../../common/pagination.js';
import type { AccessTokenPayload } from '../auth/services/token.service.js';
import { NotificationService } from './notification.service.js';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.list(
      user.sub,
      parsePagination({ cursor, limit }),
    );
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AccessTokenPayload) {
    return this.notifications.unreadCount(user.sub);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AccessTokenPayload) {
    return this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}
