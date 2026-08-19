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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
