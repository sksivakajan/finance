import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { CreateCategoryInput, UpdateCategoryInput } from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.category.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, input: CreateCategoryInput) {
    try {
      return await this.prisma.category.create({
        data: { userId, name: input.name, kind: input.kind, icon: input.icon },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CATEGORY_EXISTS',
          message: `You already have a ${input.kind.toLowerCase()} category named "${input.name}".`,
        });
      }
      throw err;
    }
  }

  async update(userId: string, categoryId: string, input: UpdateCategoryInput) {
    await this.assertOwnership(userId, categoryId);
    try {
      return await this.prisma.category.update({
        where: { id: categoryId },
        data: { name: input.name, icon: input.icon },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CATEGORY_EXISTS',
          message: 'You already have a category with that name.',
        });
      }
      throw err;
    }
  }

  // "Delete" archives rather than hard-deletes: existing Income/Expense rows
  // may reference this category, and per docs/BLUEPRINT.md §57 the money
  // trail must stay explainable. Archived categories drop out of `list()`
  // but historical records keep their categoryId.
  async archive(userId: string, categoryId: string) {
    await this.assertOwnership(userId, categoryId);
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { archivedAt: new Date() },
    });
    return { message: 'Category archived.' };
  }

  private async assertOwnership(userId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.userId !== userId) {
      throw new BadRequestException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found.',
      });
    }
    return category;
  }
}
