import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { CategoryModule } from './modules/finance/category/category.module.js';
import { IncomeModule } from './modules/finance/income/income.module.js';
import { ExpenseModule } from './modules/finance/expense/expense.module.js';
import { ScheduledPaymentModule } from './modules/finance/scheduled-payment/scheduled-payment.module.js';
import { LoanModule } from './modules/finance/loan/loan.module.js';
import { ReportingModule } from './modules/finance/reporting/reporting.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { FriendModule } from './modules/friend/friend.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { BalanceModule } from './modules/finance/balance/balance.module.js';
import { GroupModule } from './modules/finance/group/group.module.js';
import { MoneyRequestModule } from './modules/finance/money-request/money-request.module.js';
import { SettlementModule } from './modules/finance/settlement/settlement.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    CategoryModule,
    IncomeModule,
    ExpenseModule,
    ScheduledPaymentModule,
    LoanModule,
    ReportingModule,
    UploadModule,
    NotificationModule,
    FriendModule,
    ChatModule,
    BalanceModule,
    GroupModule,
    MoneyRequestModule,
    SettlementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
