import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PaginationQuery } from '../../common/pagination.js';

type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'NEW_MESSAGE'
  | 'MENTION'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'MONEY_REQUEST'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_DUE'
  | 'PAYMENT_OVERDUE'
  | 'LOAN_REMINDER'
  | 'GROUP_INVITATION'
  | 'SETTLEMENT_REQUEST'
  | 'SETTLEMENT_COMPLETED';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    type: NotificationType,
    payload: Prisma.InputJsonValue,
  ) {
    return this.prisma.notification.create({ data: { userId, type, payload } });
  }

  async list(userId: string, { cursor, limit }: PaginationQuery) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: 'Notification marked as read.' };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: 'All notifications marked as read.' };
  }

  // Used when opening a conversation: clears the NEW_MESSAGE notifications for
  // that conversation specifically, instead of every unread notification.
  async markConversationMessagesRead(userId: string, conversationId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        type: 'NEW_MESSAGE',
        payload: { path: ['conversationId'], equals: conversationId },
      },
      data: { readAt: new Date() },
    });
  }
}
