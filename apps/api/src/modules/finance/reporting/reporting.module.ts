import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { ReportsController } from './reports.controller.js';
import { ReportingService } from './reporting.service.js';

@Module({
  controllers: [DashboardController, ReportsController],
  providers: [ReportingService],
})
export class ReportingModule {}
