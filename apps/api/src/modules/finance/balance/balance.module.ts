import { Module } from '@nestjs/common';
import { FriendModule } from '../../friend/friend.module.js';
import { BalanceController } from './balance.controller.js';
import { BalanceService } from './balance.service.js';

@Module({
  imports: [FriendModule],
  controllers: [BalanceController],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
