import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationService } from '../notification/notification.service.js';

type PublicUser = {
  id: string;
  username: string;
  usernameDisplay: string;
  displayName: string | null;
  avatarUrl: string | null;
};

@Injectable()
export class FriendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async search(userId: string, rawQuery: string) {
    const q = rawQuery.trim().toLowerCase();
    if (q.length < 2) return { items: [] };

    const blockedPairs = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const excludedIds = new Set<string>([userId]);
    for (const b of blockedPairs) {
      excludedIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        id: { notIn: [...excludedIds] },
        OR: [
          { username: { contains: q } },
          { usernameDisplay: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { profile: true },
      take: 20,
    });

    return {
      items: users
        .filter((u) => u.profile?.whoCanSeeProfile !== 'NOBODY')
        .map((u) => this.toPublicUser(u)),
    };
  }

  async sendRequest(userId: string, username: string) {
    const receiver = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { profile: true },
    });
    if (!receiver || receiver.deletedAt) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'No user with that username.',
      });
    }
    if (receiver.id === userId) {
      throw new BadRequestException({
        code: 'CANNOT_FRIEND_SELF',
        message: "You can't send yourself a friend request.",
      });
    }
    if (await this.isBlockedEitherWay(userId, receiver.id)) {
      throw new BadRequestException({
        code: 'REQUEST_NOT_ALLOWED',
        message: 'Unable to send a friend request to this user.',
      });
    }
    // FRIENDS/NOBODY both mean "not open to fresh requests from a stranger" —
    // FRIENDS is meaningless for a *first* request since you're not one yet.
    if (
      receiver.profile &&
      receiver.profile.whoCanFriendRequest !== 'EVERYONE'
    ) {
      throw new BadRequestException({
        code: 'REQUEST_NOT_ALLOWED',
        message: 'This user is not accepting friend requests.',
      });
    }
    if (await this.areFriends(userId, receiver.id)) {
      throw new BadRequestException({
        code: 'ALREADY_FRIENDS',
        message: 'You are already friends with this user.',
      });
    }

    // Nicety: if they already sent *us* a request, accept it instead of erroring.
    const reverseIncoming = await this.prisma.friendRequest.findFirst({
      where: { senderId: receiver.id, receiverId: userId, status: 'PENDING' },
    });
    if (reverseIncoming) {
      return this.respond(userId, reverseIncoming.id, 'accept');
    }

    const existing = await this.prisma.friendRequest.findFirst({
      where: { senderId: userId, receiverId: receiver.id, status: 'PENDING' },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'REQUEST_ALREADY_SENT',
        message: 'You already sent this user a friend request.',
      });
    }

    const request = await this.prisma.friendRequest.create({
      data: { senderId: userId, receiverId: receiver.id },
      include: { sender: { include: { profile: true } } },
    });
    await this.notifications.create(receiver.id, 'FRIEND_REQUEST', {
      requestId: request.id,
      fromUsername: request.sender.usernameDisplay,
      fromUserId: userId,
    });
    return request;
  }

  async listRequests(userId: string, direction: 'incoming' | 'outgoing') {
    const requests = await this.prisma.friendRequest.findMany({
      where:
        direction === 'incoming'
          ? { receiverId: userId, status: 'PENDING' }
          : { senderId: userId, status: 'PENDING' },
      include: {
        sender: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: requests.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        user: this.toPublicUser(
          direction === 'incoming' ? r.sender : r.receiver,
        ),
      })),
    };
  }

  async respond(
    userId: string,
    requestId: string,
    action: 'accept' | 'reject' | 'cancel',
  ) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.status !== 'PENDING') {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Friend request not found.',
      });
    }

    if (action === 'cancel') {
      if (request.senderId !== userId) {
        throw new ForbiddenException({
          code: 'NOT_YOUR_REQUEST',
          message: 'You can only cancel a request you sent.',
        });
      }
      await this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });
      return { message: 'Friend request cancelled.' };
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_REQUEST',
        message: 'You can only respond to requests sent to you.',
      });
    }

    if (action === 'reject') {
      await this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });
      return { message: 'Friend request rejected.' };
    }

    // accept
    const [userAId, userBId] = this.canonicalPair(
      request.senderId,
      request.receiverId,
    );
    const [, receiver] = await this.prisma.$transaction([
      this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { profile: true },
      }),
      this.prisma.friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: {},
      }),
    ]);
    await this.notifications.create(
      request.senderId,
      'FRIEND_REQUEST_ACCEPTED',
      {
        requestId: request.id,
        byUsername: receiver.usernameDisplay,
        byUserId: userId,
      },
    );
    return { message: 'Friend request accepted.' };
  }

  async listFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: friendships.map((f) => ({
        friendshipId: f.id,
        since: f.createdAt,
        user: this.toPublicUser(f.userAId === userId ? f.userB : f.userA),
      })),
    };
  }

  async removeFriend(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (
      !friendship ||
      (friendship.userAId !== userId && friendship.userBId !== userId)
    ) {
      throw new NotFoundException({
        code: 'FRIENDSHIP_NOT_FOUND',
        message: 'Friendship not found.',
      });
    }
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
    return { message: 'Friend removed.' };
  }

  async block(userId: string, targetUserId: string) {
    if (targetUserId === userId) {
      throw new BadRequestException({
        code: 'CANNOT_BLOCK_SELF',
        message: "You can't block yourself.",
      });
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    const [userAId, userBId] = this.canonicalPair(userId, targetUserId);
    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({ where: { userAId, userBId } }),
      this.prisma.friendRequest.updateMany({
        where: {
          status: 'PENDING',
          OR: [
            { senderId: userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: userId },
          ],
        },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      }),
      this.prisma.block.upsert({
        where: {
          blockerId_blockedId: { blockerId: userId, blockedId: targetUserId },
        },
        create: { blockerId: userId, blockedId: targetUserId },
        update: {},
      }),
    ]);
    return { message: 'User blocked.' };
  }

  async unblock(userId: string, targetUserId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId: userId, blockedId: targetUserId },
    });
    return { message: 'User unblocked.' };
  }

  async listBlocked(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { items: blocks.map((b) => this.toPublicUser(b.blocked)) };
  }

  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    const [userAId, userBId] = this.canonicalPair(userId, otherUserId);
    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    return Boolean(friendship);
  }

  async isBlockedEitherWay(
    userId: string,
    otherUserId: string,
  ): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    });
    return Boolean(block);
  }

  private canonicalPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  private toPublicUser(user: {
    id: string;
    username: string;
    usernameDisplay: string;
    profile: { displayName: string; avatarUrl: string | null } | null;
  }): PublicUser {
    return {
      id: user.id,
      username: user.username,
      usernameDisplay: user.usernameDisplay,
      displayName: user.profile?.displayName ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };
  }
}
