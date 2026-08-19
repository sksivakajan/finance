import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateExpenseInput, UpdateExpenseInput } from '@finance/shared';
import {
  splitEqual,
  splitExact,
  splitPercentage,
  splitShares,
  SplitError,
  type Share,
} from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { PaginationQuery } from '../../../common/pagination.js';
import { FriendService } from '../../friend/friend.service.js';
import { NotificationService } from '../../notification/notification.service.js';

interface SplitInputs {
  participantIds?: string[];
  exactShares?: { userId: string; shareMinor: bigint }[];
  percentageShares?: { userId: string; percentageBps: number }[];
  unitShares?: { userId: string; shareUnits: number }[];
}

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendService,
    private readonly notifications: NotificationService,
  ) {}

  async list(userId: string, { cursor, limit }: PaginationQuery) {
    const items = await this.prisma.expense.findMany({
      where: { ownerId: userId, deletedAt: null },
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

  /** Expenses someone else recorded that the current user is a participant
   * on — the read side of "why do I owe this" (docs/BLUEPRINT.md §57): a
   * participant can always see the expenses behind their own balance, even
   * though they didn't record them. */
  async listSharedWithMe(userId: string, { cursor, limit }: PaginationQuery) {
    const items = await this.prisma.expense.findMany({
      where: {
        deletedAt: null,
        ownerId: { not: userId },
        participants: { some: { userId } },
      },
      include: { splits: { where: { userId } } },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return {
      items: page.map((e) => ({
        ...e,
        myShareMinor: e.splits[0]?.shareMinor ?? null,
        splits: undefined,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    };
  }

  async listByGroup(
    userId: string,
    groupId: string,
    { cursor, limit }: PaginationQuery,
  ) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new NotFoundException({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found.',
      });
    }
    const items = await this.prisma.expense.findMany({
      where: { groupId, deletedAt: null },
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
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
      include: { participants: true, splits: true },
    });
    if (!expense) {
      throw new NotFoundException({
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found.',
      });
    }
    await this.assertReadable(userId, expense);
    return expense;
  }

  async create(userId: string, input: CreateExpenseInput) {
    const {
      participantIds,
      exactShares,
      percentageShares,
      unitShares,
      splitMethod,
      groupId,
      payerId,
      ...rest
    } = input;
    const resolvedPayerId = payerId ?? userId;

    if (splitMethod === 'NONE') {
      if (resolvedPayerId !== userId) {
        throw new BadRequestException({
          code: 'INVALID_PAYER',
          message:
            'A personal (unsplit) expense must be paid by the person recording it.',
        });
      }
      const expense = await this.prisma.expense.create({
        data: {
          ...rest,
          ownerId: userId,
          payerId: userId,
          splitMethod: 'NONE',
          visibility: 'PRIVATE',
        },
      });
      await this.audit(userId, 'expense.created', expense.id);
      return expense;
    }

    const participantUserIds = this.collectParticipantIds(splitMethod, {
      participantIds,
      exactShares,
      percentageShares,
      unitShares,
    });
    const allParticipants = [
      ...new Set([...participantUserIds, resolvedPayerId]),
    ];

    if (groupId) {
      await this.assertGroupMembersAllowed(userId, groupId, [
        ...allParticipants,
        resolvedPayerId,
      ]);
    } else {
      await this.assertFriendsAllowed(userId, [
        ...allParticipants,
        resolvedPayerId,
      ]);
    }

    const shares = this.computeShares(splitMethod, rest.amountMinor, {
      participantIds,
      exactShares,
      percentageShares,
      unitShares,
    });

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          ...rest,
          ownerId: userId,
          payerId: resolvedPayerId,
          splitMethod,
          groupId,
          visibility: groupId ? 'SHARED_WITH_GROUP' : 'PARTICIPANTS_ONLY',
        },
      });
      await tx.expenseParticipant.createMany({
        data: allParticipants.map((pid) => ({
          expenseId: created.id,
          userId: pid,
        })),
      });
      await tx.expenseSplit.createMany({
        data: shares.map((s) => ({
          expenseId: created.id,
          userId: s.userId,
          shareMinor: s.shareMinor,
          percentageBps: percentageShares?.find((p) => p.userId === s.userId)
            ?.percentageBps,
          shareUnits: unitShares?.find((u) => u.userId === s.userId)
            ?.shareUnits,
        })),
      });
      return created;
    });

    await this.audit(userId, 'expense.created', expense.id);
    for (const participantId of allParticipants) {
      if (participantId === userId) continue;
      await this.notifications.create(participantId, 'EXPENSE_CREATED', {
        expenseId: expense.id,
        ownerId: userId,
        amountMinor: expense.amountMinor.toString(),
        currency: expense.currency,
        merchant: expense.merchant,
      });
    }
    return expense;
  }

  async update(userId: string, id: string, input: UpdateExpenseInput) {
    const existing = await this.assertOwnership(userId, id);
    const {
      participantIds,
      exactShares,
      percentageShares,
      unitShares,
      splitMethod,
      groupId,
      payerId,
      ...rest
    } = input;

    // Only touching the split when the caller actually resends splitMethod —
    // otherwise this is a plain field edit (merchant, notes, category, ...)
    // and the existing split rows are left untouched.
    if (splitMethod === undefined) {
      const updated = await this.prisma.expense.update({
        where: { id },
        data: rest,
      });
      await this.audit(userId, 'expense.updated', id);
      return updated;
    }

    const resolvedPayerId = payerId ?? existing.payerId;
    const amountMinor = rest.amountMinor ?? existing.amountMinor;

    if (splitMethod === 'NONE') {
      await this.prisma.$transaction(async (tx) => {
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        await tx.expenseParticipant.deleteMany({ where: { expenseId: id } });
        await tx.expense.update({
          where: { id },
          data: {
            ...rest,
            payerId: userId,
            splitMethod: 'NONE',
            visibility: 'PRIVATE',
            groupId: null,
          },
        });
      });
      await this.audit(userId, 'expense.updated', id);
      return this.prisma.expense.findUniqueOrThrow({ where: { id } });
    }

    const participantUserIds = this.collectParticipantIds(splitMethod, {
      participantIds,
      exactShares,
      percentageShares,
      unitShares,
    });
    const allParticipants = [
      ...new Set([...participantUserIds, resolvedPayerId]),
    ];
    const effectiveGroupId = groupId ?? existing.groupId;
    if (effectiveGroupId) {
      await this.assertGroupMembersAllowed(
        userId,
        effectiveGroupId,
        allParticipants,
      );
    } else {
      await this.assertFriendsAllowed(userId, allParticipants);
    }
    const shares = this.computeShares(splitMethod, amountMinor, {
      participantIds,
      exactShares,
      percentageShares,
      unitShares,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
      await tx.expenseParticipant.deleteMany({ where: { expenseId: id } });
      const result = await tx.expense.update({
        where: { id },
        data: {
          ...rest,
          payerId: resolvedPayerId,
          splitMethod,
          groupId: effectiveGroupId,
          visibility: effectiveGroupId
            ? 'SHARED_WITH_GROUP'
            : 'PARTICIPANTS_ONLY',
        },
      });
      await tx.expenseParticipant.createMany({
        data: allParticipants.map((pid) => ({ expenseId: id, userId: pid })),
      });
      await tx.expenseSplit.createMany({
        data: shares.map((s) => ({
          expenseId: id,
          userId: s.userId,
          shareMinor: s.shareMinor,
          percentageBps: percentageShares?.find((p) => p.userId === s.userId)
            ?.percentageBps,
          shareUnits: unitShares?.find((u) => u.userId === s.userId)
            ?.shareUnits,
        })),
      });
      return result;
    });

    await this.audit(userId, 'expense.updated', id);
    for (const participantId of allParticipants) {
      if (participantId === userId) continue;
      await this.notifications.create(participantId, 'EXPENSE_UPDATED', {
        expenseId: id,
        ownerId: userId,
        amountMinor: updated.amountMinor.toString(),
        currency: updated.currency,
      });
    }
    return updated;
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

  private collectParticipantIds(
    splitMethod: string,
    input: SplitInputs,
  ): string[] {
    switch (splitMethod) {
      case 'EQUAL':
        return input.participantIds ?? [];
      case 'EXACT':
        return (input.exactShares ?? []).map((s) => s.userId);
      case 'PERCENTAGE':
        return (input.percentageShares ?? []).map((s) => s.userId);
      case 'SHARES':
        return (input.unitShares ?? []).map((s) => s.userId);
      default:
        return [];
    }
  }

  private computeShares(
    splitMethod: string,
    totalMinor: bigint,
    input: SplitInputs,
  ): Share[] {
    try {
      switch (splitMethod) {
        case 'EQUAL':
          return splitEqual(totalMinor, input.participantIds ?? []);
        case 'EXACT':
          return splitExact(totalMinor, input.exactShares ?? []);
        case 'PERCENTAGE':
          return splitPercentage(totalMinor, input.percentageShares ?? []);
        case 'SHARES':
          return splitShares(totalMinor, input.unitShares ?? []);
        default:
          return [];
      }
    } catch (err) {
      if (err instanceof SplitError) {
        throw new BadRequestException({ code: err.code, message: err.message });
      }
      throw err;
    }
  }

  /** Every non-owner participant (and the payer) must be a friend of the
   * expense owner, and nobody in the mix may be blocked either way — the
   * same trust boundary chat already enforces. */
  private async assertFriendsAllowed(
    userId: string,
    otherUserIds: string[],
  ): Promise<void> {
    for (const otherId of new Set(otherUserIds)) {
      if (otherId === userId) continue;
      if (!(await this.friends.areFriends(userId, otherId))) {
        throw new BadRequestException({
          code: 'NOT_FRIENDS',
          message: 'You can only split an expense with friends.',
        });
      }
      if (await this.friends.isBlockedEitherWay(userId, otherId)) {
        throw new BadRequestException({
          code: 'BLOCKED',
          message: 'Unable to split an expense with this user.',
        });
      }
    }
  }

  private async assertGroupMembersAllowed(
    userId: string,
    groupId: string,
    participantIds: string[],
  ): Promise<void> {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    if (!memberIds.has(userId)) {
      throw new BadRequestException({
        code: 'NOT_A_GROUP_MEMBER',
        message: 'You are not a member of this group.',
      });
    }
    for (const pid of participantIds) {
      if (!memberIds.has(pid)) {
        throw new BadRequestException({
          code: 'NOT_A_GROUP_MEMBER',
          message: 'Every participant must be a member of the group.',
        });
      }
    }
  }

  private async assertReadable(
    userId: string,
    expense: {
      ownerId: string;
      visibility: string;
      groupId: string | null;
      participants: { userId: string }[];
    },
  ): Promise<void> {
    if (expense.ownerId === userId) return;
    if (
      expense.visibility === 'PARTICIPANTS_ONLY' &&
      expense.participants.some((p) => p.userId === userId)
    )
      return;
    if (expense.visibility === 'SHARED_WITH_GROUP' && expense.groupId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: expense.groupId, userId } },
      });
      if (membership) return;
    }
    throw new NotFoundException({
      code: 'EXPENSE_NOT_FOUND',
      message: 'Expense not found.',
    });
  }

  private async assertOwnership(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!expense || expense.ownerId !== userId) {
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
