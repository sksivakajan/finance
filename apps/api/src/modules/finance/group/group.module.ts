import { Module } from '@nestjs/common';
import { FriendModule } from '../../friend/friend.module.js';
import { BalanceModule } from '../balance/balance.module.js';
import { ExpenseModule } from '../expense/expense.module.js';
import { GroupController } from './group.controller.js';
import { GroupService } from './group.service.js';

@Module({
  imports: [FriendModule, BalanceModule, ExpenseModule],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
