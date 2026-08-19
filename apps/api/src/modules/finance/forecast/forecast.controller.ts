import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { ForecastService } from './forecast.service.js';

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecast: ForecastService) {}

  @Get()
  cashFlow(
    @CurrentUser() user: AccessTokenPayload,
    @Query('days') days?: string,
  ) {
    const parsed = days
      ? Number.parseInt(days, 10)
      : ForecastService.DEFAULT_DAYS;
    return this.forecast.getCashFlowForecast(
      user.sub,
      Number.isFinite(parsed) ? parsed : ForecastService.DEFAULT_DAYS,
    );
  }

  @Get('loans/:loanId')
  loanPayoff(
    @CurrentUser() user: AccessTokenPayload,
    @Param('loanId') loanId: string,
  ) {
    return this.forecast.getLoanPayoffForecast(user.sub, loanId);
  }
}
