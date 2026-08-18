import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createLoanSchema,
  updateLoanSchema,
  createLoanPaymentSchema,
  type CreateLoanInput,
  type UpdateLoanInput,
  type CreateLoanPaymentInput,
} from '@finance/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { LoanService } from './loan.service.js';

@Controller('loans')
export class LoanController {
  constructor(private readonly loans: LoanService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.loans.list(user.sub);
  }

  @Get(':id')
  get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.loans.get(user.sub, id);
  }

  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createLoanSchema)) body: CreateLoanInput,
  ) {
    return this.loans.create(user.sub, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLoanSchema)) body: UpdateLoanInput,
  ) {
    return this.loans.update(user.sub, id, body);
  }

  @Post(':id/payments')
  addPayment(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createLoanPaymentSchema))
    body: CreateLoanPaymentInput,
  ) {
    return this.loans.addPayment(user.sub, id, body);
  }

  @Get(':id/payments')
  listPayments(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.loans.listPayments(user.sub, id);
  }
}
