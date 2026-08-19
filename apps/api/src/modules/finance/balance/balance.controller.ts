import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { BalanceService } from './balance.service.js';

@Controller()
export class BalanceController {
  constructor(private readonly balances: BalanceService) {}

  @Get('balances')
  listAll(@CurrentUser() user: AccessTokenPayload) {
    return this.balances.listAll(user.sub);
  }

  @Get('balances/optimize')
  optimize(
    @CurrentUser() user: AccessTokenPayload,
    @Query('groupId') groupId: string,
  ) {
    return this.balances.optimizeGroup(user.sub, groupId);
  }

  @Get('balances/:friendId')
  netWith(
    @CurrentUser() user: AccessTokenPayload,
    @Param('friendId') friendId: string,
  ) {
    return this.balances.netWith(user.sub, friendId);
  }
}
