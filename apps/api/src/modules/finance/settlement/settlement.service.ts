import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateSettlementInput } from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { FriendService } from '../../friend/friend.service.js';
import { NotificationService } from '../../notification/notification.service.js';

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendService,
    private readonly notifications: NotificationService,
  ) {}

  async create(userId: string, input: CreateSettlementInput) {
    if (input.counterpartyId === userId) {
      throw new BadRequestException({
        code: 'INVALID_COUNTERPARTY',
        message: "You can't settle up with yourself.",
      });
    }
    if (!(await this.friends.areFriends(userId, input.counterpartyId))) {
      throw new BadRequestException({
        code: 'NOT_FRIENDS',
        message: 'You can only settle up with a friend.',
      });
    }

    const payerId =
      input.direction === 'I_PAID' ? userId : input.counterpartyId;
    const receiverId =
      input.direction === 'I_PAID' ? input.counterpartyId : userId;

    const settlement = await this.prisma.settlement.create({
      data: {
        payerId,
        receiverId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'settlement.created',
        resourceType: 'Settlement',
        resourceId: settlement.id,
      },
    });
    await this.notifications.create(
      input.counterpartyId,
      'SETTLEMENT_COMPLETED',
      {
        settlementId: settlement.id,
        amountMinor: settlement.amountMinor.toString(),
        currency: settlement.currency,
        recordedByUserId: userId,
      },
    );
    return settlement;
  }

  async listWith(userId: string, counterpartyId: string) {
    const settlements = await this.prisma.settlement.findMany({
      where: {
        deletedAt: null,
        OR: [
          { payerId: userId, receiverId: counterpartyId },
          { payerId: counterpartyId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return { items: settlements };
  }
}
