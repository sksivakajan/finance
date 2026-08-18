import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { UpdateProfileInput } from '@finance/shared';
import type {
  UserModel,
  UserProfileModel,
} from '../../generated/prisma/models.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordService } from '../auth/services/password.service.js';
import { RESERVED_USERNAMES } from '../../common/reserved-usernames.js';

const USERNAME_FORMAT = /^[a-zA-Z0-9_]{3,20}$/;

type UserWithRelations = UserModel & {
  profile: UserProfileModel | null;
  twoFactor?: { enabled: boolean } | null;
};

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true, twoFactor: { select: { enabled: true } } },
    });
    return this.toPublicView(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const {
      displayName,
      bio,
      avatarUrl,
      defaultCurrency,
      timezone,
      ...privacy
    } = input;
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        displayName,
        bio,
        avatarUrl,
        defaultCurrency,
        timezone,
        ...privacy,
      },
    });
    return this.me(userId);
  }

  async checkUsername(raw: string) {
    if (!USERNAME_FORMAT.test(raw)) {
      return { available: false, reason: 'invalid' as const };
    }
    const lower = raw.toLowerCase();
    if (RESERVED_USERNAMES.has(lower)) {
      return { available: false, reason: 'reserved' as const };
    }
    const existing = await this.prisma.user.findUnique({
      where: { username: lower },
    });
    return existing
      ? { available: false, reason: 'taken' as const }
      : { available: true };
  }

  async exportData(userId: string) {
    const [user, incomes, expenses, loans, scheduledPayments] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          include: { profile: true },
        }),
        this.prisma.income.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.expense.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.loan.findMany({
          where: { userId, deletedAt: null },
          include: { payments: true, schedule: true },
        }),
        this.prisma.scheduledPayment.findMany({
          where: { userId, deletedAt: null },
        }),
      ]);

    return this.serializeBigInts({
      exportedAt: new Date().toISOString(),
      account: this.toPublicView(user),
      incomes,
      expenses,
      loans,
      scheduledPayments,
    });
  }

  // BigInt (money columns) can't round-trip through JSON.stringify without a
  // replacer; this is the one place that conversion happens, cast back to the
  // input's shape since the values themselves are unchanged (bigint -> string).
  private serializeBigInts<T>(value: T): T {
    const json = JSON.stringify(value, (_key, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    return JSON.parse(json) as T;
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const ok = await this.passwords.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect password.',
      });
    }
    if (user.deletedAt) {
      throw new BadRequestException({
        code: 'ALREADY_DELETED',
        message: 'This account is already deactivated.',
      });
    }

    // Soft delete with a grace period, per docs/BLUEPRINT.md §5: sessions are
    // killed immediately (DEACTIVATED already blocks login), but the row and
    // its data are retained for the grace period rather than purged inline. A
    // scheduled job to hard-purge past the grace period lands with the
    // background-jobs infrastructure (spec §51), not here.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), status: 'DEACTIVATED' },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: userId,
          action: 'auth.account_deleted',
          resourceType: 'User',
          resourceId: userId,
        },
      }),
    ]);
    return { message: 'Your account has been deactivated.' };
  }

  private toPublicView(user: UserWithRelations) {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      username: user.username,
      usernameDisplay: user.usernameDisplay,
      createdAt: user.createdAt,
      twoFactorEnabled: user.twoFactor?.enabled ?? false,
      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            bio: user.profile.bio,
            avatarUrl: user.profile.avatarUrl,
            defaultCurrency: user.profile.defaultCurrency,
            timezone: user.profile.timezone,
            whoCanFriendRequest: user.profile.whoCanFriendRequest,
            whoCanMessage: user.profile.whoCanMessage,
            whoCanSeeProfile: user.profile.whoCanSeeProfile,
            whoCanAddToGroups: user.profile.whoCanAddToGroups,
          }
        : null,
    };
  }
}
