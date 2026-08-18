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
  createScheduledPaymentSchema,
  updateScheduledPaymentSchema,
  type CreateScheduledPaymentInput,
  type UpdateScheduledPaymentInput,
} from '@finance/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { parsePagination } from '../../../common/pagination.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { ScheduledPaymentService } from './scheduled-payment.service.js';

@Controller('scheduled-payments')
export class ScheduledPaymentController {
  constructor(private readonly scheduledPayments: ScheduledPaymentService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.scheduledPayments.list(
      user.sub,
      parsePagination({ cursor, limit }),
    );
  }

  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createScheduledPaymentSchema))
    body: CreateScheduledPaymentInput,
  ) {
    return this.scheduledPayments.create(user.sub, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateScheduledPaymentSchema))
    body: UpdateScheduledPaymentInput,
  ) {
    return this.scheduledPayments.update(user.sub, id, body);
  }

  @Post(':id/mark-paid')
  markPaid(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.scheduledPayments.markPaid(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.scheduledPayments.remove(user.sub, id);
  }
}
