import { Module } from '@nestjs/common';
import { FriendModule } from '../../friend/friend.module.js';
import { NotificationModule } from '../../notification/notification.module.js';
import { SettlementController } from './settlement.controller.js';
import { SettlementService } from './settlement.service.js';

@Module({
  imports: [FriendModule, NotificationModule],
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
