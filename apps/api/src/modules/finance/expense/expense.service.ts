import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateExpenseInput, UpdateExpenseInput } from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { PaginationQuery } from '../../../common/pagination.js';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, { cursor, limit }: PaginationQuery) {
    const items = await this.prisma.expense.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    };
  }

  async get(userId: string, id: string) {
    return this.assertOwnership(userId, id);
  }

  async create(userId: string, input: CreateExpenseInput) {
    const expense = await this.prisma.expense.create({
      data: { ...input, userId },
    });
    await this.audit(userId, 'expense.created', expense.id);
    return expense;
  }

  async update(userId: string, id: string, input: UpdateExpenseInput) {
    await this.assertOwnership(userId, id);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: input,
    });
    await this.audit(userId, 'expense.updated', id);
    return expense;
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit(userId, 'expense.deleted', id);
    return { message: 'Expense deleted.' };
  }

  private async assertOwnership(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!expense || expense.userId !== userId) {
      throw new BadRequestException({
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found.',
      });
    }
    return expense;
  }

  private async audit(actorId: string, action: string, resourceId: string) {
    await this.prisma.auditLog.create({
      data: { actorId, action, resourceType: 'Expense', resourceId },
    });
  }
}
