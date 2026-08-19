import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { ReportingService } from './reporting.service.js';

const MAX_MONTHS = 24;
const MAX_DAYS = 180;

function parseMonths(raw?: string): number {
  const n = raw ? Number.parseInt(raw, 10) : 6;
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_MONTHS) : 6;
}

function parseDays(raw?: string): number {
  const n = raw ? Number.parseInt(raw, 10) : 30;
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_DAYS) : 30;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('income')
  income(
    @CurrentUser() user: AccessTokenPayload,
    @Query('months') months?: string,
  ) {
    return this.reporting.getMonthlySeries(
      user.sub,
      'INCOME',
      parseMonths(months),
    );
  }

  @Get('expenses')
  expenses(
    @CurrentUser() user: AccessTokenPayload,
    @Query('months') months?: string,
  ) {
    return this.reporting.getMonthlySeries(
      user.sub,
      'EXPENSE',
      parseMonths(months),
    );
  }

  @Get('cash-flow')
  cashFlow(
    @CurrentUser() user: AccessTokenPayload,
    @Query('months') months?: string,
  ) {
    return this.reporting.getCashFlow(user.sub, parseMonths(months));
  }

  @Get('balance-history')
  balanceHistory(
    @CurrentUser() user: AccessTokenPayload,
    @Query('days') days?: string,
  ) {
    return this.reporting.getBalanceHistory(user.sub, parseDays(days));
  }

  @Get('category-breakdown')
  categoryBreakdown(
    @CurrentUser() user: AccessTokenPayload,
    @Query('kind') kind?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const defaultFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const defaultTo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const resolvedKind = kind === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to ? new Date(to) : defaultTo;
    return this.reporting.getCategoryBreakdown(
      user.sub,
      resolvedKind,
      fromDate,
      toDate,
    );
  }
}
