import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { FriendController } from './friend.controller.js';
import { FriendService } from './friend.service.js';

@Module({
  imports: [NotificationModule],
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
