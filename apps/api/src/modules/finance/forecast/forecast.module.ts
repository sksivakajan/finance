import { Module } from '@nestjs/common';
import { ForecastController } from './forecast.controller.js';
import { ForecastService } from './forecast.service.js';

@Module({
  controllers: [ForecastController],
  providers: [ForecastService],
})
export class ForecastModule {}
