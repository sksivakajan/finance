import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createIncomeSchema,
  updateIncomeSchema,
  type CreateIncomeInput,
  type UpdateIncomeInput,
} from '@finance/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { parsePagination } from '../../../common/pagination.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { IncomeService } from './income.service.js';

@Controller('income')
export class IncomeController {
  constructor(private readonly income: IncomeService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.income.list(user.sub, parsePagination({ cursor, limit }));
  }

  @Get(':id')
  get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.income.get(user.sub, id);
  }

  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createIncomeSchema)) body: CreateIncomeInput,
  ) {
    return this.income.create(user.sub, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateIncomeSchema)) body: UpdateIncomeInput,
  ) {
    return this.income.update(user.sub, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.income.remove(user.sub, id);
  }
}
