import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createMoneyRequestSchema,
  type CreateMoneyRequestInput,
} from '@finance/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { MoneyRequestService } from './money-request.service.js';

@Controller('money-requests')
export class MoneyRequestController {
  constructor(private readonly moneyRequests: MoneyRequestService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('direction') direction?: string,
  ) {
    return this.moneyRequests.list(
      user.sub,
      direction === 'outgoing' ? 'outgoing' : 'incoming',
    );
  }

  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createMoneyRequestSchema))
    body: CreateMoneyRequestInput,
  ) {
    return this.moneyRequests.create(user.sub, body);
  }

  @Post(':id/pay')
  pay(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.moneyRequests.pay(user.sub, id);
  }

  @Post(':id/decline')
  decline(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.moneyRequests.decline(user.sub, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.moneyRequests.cancel(user.sub, id);
  }
}
