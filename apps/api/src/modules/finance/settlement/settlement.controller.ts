import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  createSettlementSchema,
  type CreateSettlementInput,
} from '@finance/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { SettlementService } from './settlement.service.js';

@Controller('settlements')
export class SettlementController {
  constructor(private readonly settlements: SettlementService) {}

  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createSettlementSchema))
    body: CreateSettlementInput,
  ) {
    return this.settlements.create(user.sub, body);
  }

  @Get(':friendId')
  listWith(
    @CurrentUser() user: AccessTokenPayload,
    @Param('friendId') friendId: string,
  ) {
    return this.settlements.listWith(user.sub, friendId);
  }
}
