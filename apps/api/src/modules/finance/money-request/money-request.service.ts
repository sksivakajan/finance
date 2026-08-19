import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateMoneyRequestInput } from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { FriendService } from '../../friend/friend.service.js';
import { NotificationService } from '../../notification/notification.service.js';

@Injectable()
export class MoneyRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendService,
    private readonly notifications: NotificationService,
  ) {}

  async create(userId: string, input: CreateMoneyRequestInput) {
    if (input.receiverId === userId) {
      throw new BadRequestException({
        code: 'INVALID_RECEIVER',
        message: "You can't request money from yourself.",
      });
    }
    if (!(await this.friends.areFriends(userId, input.receiverId))) {
      throw new BadRequestException({
        code: 'NOT_FRIENDS',
        message: 'You can only request money from a friend.',
      });
    }
    const request = await this.prisma.moneyRequest.create({
      data: {
        senderId: userId,
        receiverId: input.receiverId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        reason: input.reason,
        dueDate: input.dueDate,
        relatedExpenseId: input.relatedExpenseId,
      },
    });
    await this.notifications.create(input.receiverId, 'MONEY_REQUEST', {
      requestId: request.id,
      fromUserId: userId,
      amountMinor: request.amountMinor.toString(),
      currency: request.currency,
      reason: request.reason,
    });
    return request;
  }

  async list(userId: string, direction: 'incoming' | 'outgoing') {
    const items = await this.prisma.moneyRequest.findMany({
      where:
        direction === 'incoming'
          ? { receiverId: userId, status: 'PENDING', deletedAt: null }
          : { senderId: userId, status: 'PENDING', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  }

  async pay(userId: string, requestId: string) {
    const request = await this.getPending(requestId);
    if (request.receiverId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_REQUEST',
        message: 'Only the person being asked to pay can settle this request.',
      });
    }
    const [, settlement] = await this.prisma.$transaction([
      this.prisma.moneyRequest.update({
        where: { id: requestId },
        data: { status: 'PAID', respondedAt: new Date() },
      }),
      this.prisma.settlement.create({
        data: {
          payerId: request.receiverId,
          receiverId: request.senderId,
          amountMinor: request.amountMinor,
          currency: request.currency,
          notes: `Money request: ${request.reason}`,
        },
      }),
    ]);
    await this.notifications.create(request.senderId, 'PAYMENT_RECEIVED', {
      requestId: request.id,
      settlementId: settlement.id,
      amountMinor: request.amountMinor.toString(),
      currency: request.currency,
      fromUserId: userId,
    });
    return { message: 'Money request paid.', settlementId: settlement.id };
  }

  async decline(userId: string, requestId: string) {
    const request = await this.getPending(requestId);
    if (request.receiverId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_REQUEST',
        message: 'Only the person being asked to pay can decline this request.',
      });
    }
    await this.prisma.moneyRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });
    return { message: 'Money request declined.' };
  }

  async cancel(userId: string, requestId: string) {
    const request = await this.getPending(requestId);
    if (request.senderId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_REQUEST',
        message: 'Only the requester can cancel this request.',
      });
    }
    await this.prisma.moneyRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    });
    return { message: 'Money request cancelled.' };
  }

  private async getPending(requestId: string) {
    const request = await this.prisma.moneyRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.deletedAt || request.status !== 'PENDING') {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Money request not found.',
      });
    }
    return request;
  }
}
