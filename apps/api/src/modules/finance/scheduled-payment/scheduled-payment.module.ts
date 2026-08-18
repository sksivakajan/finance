import { Module } from '@nestjs/common';
import { ScheduledPaymentController } from './scheduled-payment.controller.js';
import { ScheduledPaymentService } from './scheduled-payment.service.js';

@Module({
  controllers: [ScheduledPaymentController],
  providers: [ScheduledPaymentService],
  exports: [ScheduledPaymentService],
})
export class ScheduledPaymentModule {}
