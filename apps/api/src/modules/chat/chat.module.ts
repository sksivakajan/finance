import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { FriendModule } from '../friend/friend.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [NotificationModule, FriendModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
