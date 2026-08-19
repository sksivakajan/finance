import { Module } from '@nestjs/common';
import { FriendModule } from '../../friend/friend.module.js';
import { NotificationModule } from '../../notification/notification.module.js';
import { MoneyRequestController } from './money-request.controller.js';
import { MoneyRequestService } from './money-request.service.js';

@Module({
  imports: [FriendModule, NotificationModule],
  controllers: [MoneyRequestController],
  providers: [MoneyRequestService],
  exports: [MoneyRequestService],
})
export class MoneyRequestModule {}
