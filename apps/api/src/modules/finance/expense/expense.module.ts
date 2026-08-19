import { Module } from '@nestjs/common';
import { FriendModule } from '../../friend/friend.module.js';
import { NotificationModule } from '../../notification/notification.module.js';
import { ExpenseController } from './expense.controller.js';
import { ExpenseService } from './expense.service.js';

@Module({
  imports: [FriendModule, NotificationModule],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
