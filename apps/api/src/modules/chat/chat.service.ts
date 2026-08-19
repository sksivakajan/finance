import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateMessageInput, UpdateMessageInput } from '@finance/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PaginationQuery } from '../../common/pagination.js';
import { NotificationService } from '../notification/notification.service.js';
import { FriendService } from '../friend/friend.service.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly friends: FriendService,
  ) {}

  async getOrCreateConversation(userId: string, friendUserId: string) {
    if (friendUserId === userId) {
      throw new BadRequestException({
        code: 'CANNOT_MESSAGE_SELF',
        message: "You can't start a conversation with yourself.",
      });
    }
    if (!(await this.friends.areFriends(userId, friendUserId))) {
      throw new BadRequestException({
        code: 'NOT_FRIENDS',
        message: 'You can only message friends.',
      });
    }
    if (await this.friends.isBlockedEitherWay(userId, friendUserId)) {
      throw new BadRequestException({
        code: 'BLOCKED',
        message: 'Unable to message this user.',
      });
    }
    if (!(await this.friends.allowsMessagesFrom(friendUserId))) {
      throw new BadRequestException({
        code: 'MESSAGING_NOT_ALLOWED',
        message: 'This user is not accepting messages.',
      });
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: friendUserId } } },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: { create: [{ userId }, { userId: friendUserId }] },
      },
    });
  }

  async listConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: { include: { user: { include: { profile: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    const results = await Promise.all(
      memberships.map(async (m) => {
        const other = m.conversation.members.find(
          (cm) => cm.userId !== userId,
        )?.user;
        const lastMessage = m.conversation.messages[0] ?? null;
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            deletedAt: null,
            createdAt: { gt: m.lastReadAt ?? new Date(0) },
          },
        });
        return {
          conversationId: m.conversationId,
          otherUser: other
            ? {
                id: other.id,
                username: other.username,
                usernameDisplay: other.usernameDisplay,
                displayName: other.profile?.displayName ?? null,
                avatarUrl: other.profile?.avatarUrl ?? null,
              }
            : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                body: lastMessage.deletedAt ? null : lastMessage.body,
                type: lastMessage.type,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
                deleted: Boolean(lastMessage.deletedAt),
              }
            : null,
          unreadCount,
        };
      }),
    );

    results.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt.getTime() ?? 0;
      return bTime - aTime;
    });
    return { items: results };
  }

  async listMessages(
    userId: string,
    conversationId: string,
    { cursor, limit }: PaginationQuery,
  ) {
    await this.assertMember(userId, conversationId);
    const items = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return {
      items: page.map((m) => this.toMessageView(m)),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    };
  }

  async createMessage(
    userId: string,
    conversationId: string,
    input: CreateMessageInput,
  ) {
    const member = await this.assertMember(userId, conversationId);
    const otherMembers = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: userId } },
    });
    for (const other of otherMembers) {
      if (await this.friends.isBlockedEitherWay(userId, other.userId)) {
        throw new BadRequestException({
          code: 'BLOCKED',
          message: 'Unable to send messages in this conversation.',
        });
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: input.type,
        body: input.body,
        attachmentUrl: input.attachmentUrl,
      },
    });
    // Mark the sender's own membership read up to the message they just sent.
    await this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: message.createdAt },
    });

    const sender = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    for (const other of otherMembers) {
      await this.notifications.create(other.userId, 'NEW_MESSAGE', {
        conversationId,
        fromUserId: userId,
        fromUsername: sender.usernameDisplay,
        preview: (
          message.body ?? (message.attachmentUrl ? '[attachment]' : '')
        ).slice(0, 140),
      });
    }

    return this.toMessageView(message);
  }

  async updateMessage(
    userId: string,
    messageId: string,
    input: UpdateMessageInput,
  ) {
    const message = await this.assertOwnMessage(userId, messageId);
    const updated = await this.prisma.message.update({
      where: { id: message.id },
      data: { body: input.body, editedAt: new Date() },
    });
    return this.toMessageView(updated);
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.assertOwnMessage(userId, messageId);
    const updated = await this.prisma.message.update({
      where: { id: message.id },
      data: { deletedAt: new Date(), body: null, attachmentUrl: null },
    });
    return this.toMessageView(updated);
  }

  async markRead(userId: string, conversationId: string) {
    const member = await this.assertMember(userId, conversationId);
    await this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });
    await this.notifications.markConversationMessagesRead(
      userId,
      conversationId,
    );
    return { message: 'Conversation marked as read.' };
  }

  private async assertMember(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.',
      });
    }
    return member;
  }

  private async assertOwnMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) {
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found.',
      });
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_MESSAGE',
        message: 'You can only edit or delete your own messages.',
      });
    }
    return message;
  }

  private toMessageView(message: {
    id: string;
    conversationId: string;
    senderId: string;
    type: string;
    body: string | null;
    attachmentUrl: string | null;
    editedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      body: message.deletedAt ? null : message.body,
      attachmentUrl: message.deletedAt ? null : message.attachmentUrl,
      editedAt: message.editedAt,
      deleted: Boolean(message.deletedAt),
      createdAt: message.createdAt,
    };
  }
}
