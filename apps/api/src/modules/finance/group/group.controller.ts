import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  createGroupSchema,
  addGroupMemberSchema,
  type CreateGroupInput,
  type AddGroupMemberInput,
} from '@finance/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { parsePagination } from '../../../common/pagination.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { GroupService } from './group.service.js';
import { BalanceService } from '../balance/balance.service.js';
import { ExpenseService } from '../expense/expense.service.js';

@Controller('groups')
export class GroupController {
  constructor(
    private readonly groups: GroupService,
    private readonly balances: BalanceService,
    private readonly expenses: ExpenseService,
  ) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.groups.list(user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createGroupSchema)) body: CreateGroupInput,
  ) {
    return this.groups.create(user.sub, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.groups.get(user.sub, id);
  }

  @Get(':id/balances')
  balancesFor(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.balances.groupBalances(user.sub, id);
  }

  @Get(':id/expenses')
  expensesFor(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.expenses.listByGroup(
      user.sub,
      id,
      parsePagination({ cursor, limit }),
    );
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addGroupMemberSchema))
    body: AddGroupMemberInput,
  ) {
    return this.groups.addMember(user.sub, id, body.userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Param('userId') memberId: string,
  ) {
    return this.groups.removeMember(user.sub, id, memberId);
  }
}
