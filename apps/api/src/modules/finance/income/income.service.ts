import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateIncomeInput, UpdateIncomeInput } from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { PaginationQuery } from '../../../common/pagination.js';

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, { cursor, limit }: PaginationQuery) {
    const items = await this.prisma.income.findMany({
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
    const income = await this.assertOwnership(userId, id);
    return income;
  }

  create(userId: string, input: CreateIncomeInput) {
    return this.prisma.income.create({
      data: { ...input, userId },
    });
  }

  async update(userId: string, id: string, input: UpdateIncomeInput) {
    await this.assertOwnership(userId, id);
    return this.prisma.income.update({ where: { id }, data: input });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await this.prisma.income.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Income deleted.' };
  }

  private async assertOwnership(userId: string, id: string) {
    const income = await this.prisma.income.findFirst({
      where: { id, deletedAt: null },
    });
    if (!income || income.userId !== userId) {
      throw new BadRequestException({
        code: 'INCOME_NOT_FOUND',
        message: 'Income record not found.',
      });
    }
    return income;
  }
}
