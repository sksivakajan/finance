import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateGroupInput } from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { FriendService } from '../../friend/friend.service.js';

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendService,
  ) {}

  async create(userId: string, input: CreateGroupInput) {
    const memberIds = [
      ...new Set(input.memberUserIds.filter((id) => id !== userId)),
    ];
    for (const memberId of memberIds) {
      if (!(await this.friends.areFriends(userId, memberId))) {
        throw new BadRequestException({
          code: 'NOT_FRIENDS',
          message: 'You can only add friends to a group.',
        });
      }
    }

    const group = await this.prisma.group.create({
      data: {
        name: input.name,
        avatarUrl: input.avatarUrl,
        createdById: userId,
        members: {
          create: [
            { userId, role: 'OWNER' },
            ...memberIds.map((id) => ({ userId: id, role: 'MEMBER' as const })),
          ],
        },
      },
      include: {
        members: { include: { user: { include: { profile: true } } } },
      },
    });
    return this.toGroupView(group);
  }

  async list(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: { include: { user: { include: { profile: true } } } },
          },
        },
      },
    });
    return {
      items: memberships
        .filter((m) => !m.group.archivedAt)
        .map((m) => this.toGroupView(m.group)),
    };
  }

  async get(userId: string, groupId: string) {
    const group = await this.assertMember(userId, groupId);
    return this.toGroupView(group);
  }

  async addMember(userId: string, groupId: string, newMemberId: string) {
    const group = await this.assertMember(userId, groupId);
    if (!(await this.friends.areFriends(userId, newMemberId))) {
      throw new BadRequestException({
        code: 'NOT_FRIENDS',
        message: 'You can only add friends to a group.',
      });
    }
    const already = group.members.some((m) => m.userId === newMemberId);
    if (already) {
      throw new BadRequestException({
        code: 'ALREADY_MEMBER',
        message: 'That person is already in the group.',
      });
    }
    await this.prisma.groupMember.create({
      data: { groupId, userId: newMemberId, role: 'MEMBER' },
    });
    return this.get(userId, groupId);
  }

  async removeMember(
    userId: string,
    groupId: string,
    memberIdToRemove: string,
  ) {
    const group = await this.assertMember(userId, groupId);
    const actingMembership = group.members.find((m) => m.userId === userId)!;
    const isSelfLeaving = memberIdToRemove === userId;
    if (!isSelfLeaving && actingMembership.role !== 'OWNER') {
      throw new BadRequestException({
        code: 'NOT_GROUP_OWNER',
        message: 'Only the group owner can remove members.',
      });
    }
    const targetMembership = group.members.find(
      (m) => m.userId === memberIdToRemove,
    );
    if (!targetMembership) {
      throw new NotFoundException({
        code: 'NOT_A_GROUP_MEMBER',
        message: 'That person is not in the group.',
      });
    }
    if (targetMembership.role === 'OWNER') {
      throw new BadRequestException({
        code: 'CANNOT_REMOVE_OWNER',
        message:
          'The group owner cannot be removed. Archive the group instead.',
      });
    }
    await this.prisma.groupMember.delete({
      where: { id: targetMembership.id },
    });
    return {
      message: isSelfLeaving ? 'You left the group.' : 'Member removed.',
    };
  }

  private async assertMember(userId: string, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, archivedAt: null },
      include: {
        members: { include: { user: { include: { profile: true } } } },
      },
    });
    if (!group || !group.members.some((m) => m.userId === userId)) {
      throw new NotFoundException({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found.',
      });
    }
    return group;
  }

  private toGroupView(group: {
    id: string;
    name: string;
    avatarUrl: string | null;
    createdById: string;
    createdAt: Date;
    members: {
      userId: string;
      role: string;
      joinedAt: Date;
      user: {
        id: string;
        username: string;
        usernameDisplay: string;
        profile: { displayName: string; avatarUrl: string | null } | null;
      };
    }[];
  }) {
    return {
      id: group.id,
      name: group.name,
      avatarUrl: group.avatarUrl,
      createdById: group.createdById,
      createdAt: group.createdAt,
      members: group.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        username: m.user.username,
        usernameDisplay: m.user.usernameDisplay,
        displayName: m.user.profile?.displayName ?? null,
        avatarUrl: m.user.profile?.avatarUrl ?? null,
      })),
    };
  }
}
