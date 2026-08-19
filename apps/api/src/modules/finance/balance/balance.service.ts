import { BadRequestException, Injectable } from '@nestjs/common';
import { simplifyDebts, type NetBalance } from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { FriendService } from '../../friend/friend.service.js';

interface CurrencyNet {
  currency: string;
  netMinor: bigint;
}

@Injectable()
export class BalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendService,
  ) {}

  /** Net balance with one specific counterpart, per currency (never summed
   * across currencies — see docs/BLUEPRINT.md #20 on the currency-mismatch
   * invariant). Positive = they owe the current user; negative = the current
   * user owes them. */
  async netWith(
    userId: string,
    otherUserId: string,
  ): Promise<{ currency: string; netMinor: string }[]> {
    const net = await this.computeNet(userId, [otherUserId]);
    return (net.get(otherUserId) ?? []).map((c) => ({
      currency: c.currency,
      netMinor: c.netMinor.toString(),
    }));
  }

  /** Every friend the user has a nonzero balance with. */
  async listAll(userId: string) {
    const friendIds = await this.friends.listFriendUserIds(userId);
    if (friendIds.length === 0) return { items: [] };
    const net = await this.computeNet(userId, friendIds);
    const publicUsers = await this.friends.getPublicUsersById([...net.keys()]);
    return {
      items: [...net.entries()]
        .filter(([, balances]) => balances.length > 0)
        .map(([otherId, balances]) => ({
          user: publicUsers.get(otherId) ?? null,
          balances: balances.map((b) => ({
            currency: b.currency,
            netMinor: b.netMinor.toString(),
          })),
        })),
    };
  }

  /** Debt-simplification suggestion within a group per docs/BLUEPRINT.md §12:
   * read-only, never auto-applied. Scoped to a group (not an open-ended
   * friend circle — see docs/BLUEPRINT.md #20 for why). */
  async optimizeGroup(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new BadRequestException({
        code: 'NOT_A_GROUP_MEMBER',
        message: 'You are not a member of this group.',
      });
    }
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);

    const splits = await this.prisma.expenseSplit.findMany({
      where: { expense: { groupId, deletedAt: null } },
      select: {
        userId: true,
        shareMinor: true,
        expense: { select: { payerId: true, currency: true } },
      },
    });

    // Deliberately no settlements here (see the note on groupBalances below
    // for why): this is the group's own unsettled tab, not netted against
    // interpersonal payments outside it. Group-scoped optimization also
    // assumes a single currency (the group's expenses all share one in
    // practice), so pick the currency actually used and ignore the rest.
    const currency = splits[0]?.expense.currency ?? 'LKR';
    const perUser = new Map<string, bigint>();
    const add = (id: string, amount: bigint) =>
      perUser.set(id, (perUser.get(id) ?? 0n) + amount);
    for (const id of memberIds) perUser.set(id, 0n);
    for (const s of splits) {
      if (s.expense.currency !== currency) continue;
      add(s.userId, -s.shareMinor);
      add(s.expense.payerId, s.shareMinor);
    }

    const balances: NetBalance[] = [...perUser.entries()].map(
      ([id, netMinor]) => ({ userId: id, netMinor }),
    );
    const transfers = simplifyDebts(balances);
    const publicUsers = await this.friends.getPublicUsersById(memberIds);
    return {
      currency,
      transfers: transfers.map((t) => ({
        from: publicUsers.get(t.fromUserId) ?? null,
        to: publicUsers.get(t.toUserId) ?? null,
        amountMinor: t.amountMinor.toString(),
      })),
    };
  }

  /** Per-member net balance within a group (not simplified — the raw
   * "who owes what into the group's pool" figure shown on a group page).
   *
   * Deliberately excludes Settlement rows: a Settlement has no group of its
   * own (only an optional per-expense SettlementItem allocation, which isn't
   * wired up yet — see docs/BLUEPRINT.md #20), so there's no reliable way to
   * tell "this payment was for this group's tab" from "these two people
   * happened to also settle an unrelated direct expense." Including
   * settlements here would double-count money that already nets out
   * correctly in the interpersonal /balances view. This is the group's own
   * unsettled tab, not a running balance. */
  async groupBalances(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new BadRequestException({
        code: 'NOT_A_GROUP_MEMBER',
        message: 'You are not a member of this group.',
      });
    }
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);

    const splits = await this.prisma.expenseSplit.findMany({
      where: { expense: { groupId, deletedAt: null } },
      select: {
        userId: true,
        shareMinor: true,
        expense: { select: { payerId: true, currency: true } },
      },
    });
    const perUser = new Map<string, Map<string, bigint>>();
    const add = (id: string, currency: string, amount: bigint) => {
      if (!perUser.has(id)) perUser.set(id, new Map());
      const m = perUser.get(id)!;
      m.set(currency, (m.get(currency) ?? 0n) + amount);
    };
    for (const id of memberIds) perUser.set(id, new Map());
    for (const s of splits) {
      add(s.userId, s.expense.currency, -s.shareMinor);
      add(s.expense.payerId, s.expense.currency, s.shareMinor);
    }

    const publicUsers = await this.friends.getPublicUsersById(memberIds);
    return {
      items: memberIds.map((id) => ({
        user: publicUsers.get(id) ?? null,
        balances: [...(perUser.get(id) ?? new Map<string, bigint>())]
          .filter(([, v]) => v !== 0n)
          .map(([currency, netMinor]) => ({
            currency,
            netMinor: netMinor.toString(),
          })),
      })),
    };
  }

  /** Computes net(userId, other) for every `otherIds` entry in a fixed number
   * of queries (not one query per pair), grouped by currency. Positive =
   * `other` owes `userId`. */
  private async computeNet(
    userId: string,
    otherIds: string[],
  ): Promise<Map<string, CurrencyNet[]>> {
    const [owedToUser, owedByUser, settlementsOut, settlementsIn] =
      await Promise.all([
        this.prisma.expenseSplit.findMany({
          where: {
            userId: { in: otherIds },
            expense: { payerId: userId, deletedAt: null },
          },
          select: {
            userId: true,
            shareMinor: true,
            expense: { select: { currency: true } },
          },
        }),
        this.prisma.expenseSplit.findMany({
          where: {
            userId,
            expense: { payerId: { in: otherIds }, deletedAt: null },
          },
          select: {
            shareMinor: true,
            expense: { select: { currency: true, payerId: true } },
          },
        }),
        this.prisma.settlement.findMany({
          where: {
            payerId: userId,
            receiverId: { in: otherIds },
            deletedAt: null,
          },
        }),
        this.prisma.settlement.findMany({
          where: {
            receiverId: userId,
            payerId: { in: otherIds },
            deletedAt: null,
          },
        }),
      ]);

    const net = new Map<string, Map<string, bigint>>();
    const add = (otherId: string, currency: string, amount: bigint) => {
      if (!net.has(otherId)) net.set(otherId, new Map());
      const m = net.get(otherId)!;
      m.set(currency, (m.get(currency) ?? 0n) + amount);
    };
    // Other owes user (other is a participant on an expense user paid).
    for (const s of owedToUser) add(s.userId, s.expense.currency, s.shareMinor);
    // User owes other (user is a participant on an expense other paid).
    for (const s of owedByUser)
      add(s.expense.payerId, s.expense.currency, -s.shareMinor);
    // User paid other -> reduces what user owes other -> positive for user.
    for (const s of settlementsOut)
      add(s.receiverId, s.currency, s.amountMinor);
    // Other paid user -> reduces what other owes user -> negative adjustment.
    for (const s of settlementsIn) add(s.payerId, s.currency, -s.amountMinor);

    const result = new Map<string, CurrencyNet[]>();
    for (const otherId of otherIds) {
      const currencies = net.get(otherId);
      result.set(
        otherId,
        currencies
          ? [...currencies.entries()]
              .filter(([, v]) => v !== 0n)
              .map(([currency, netMinor]) => ({ currency, netMinor }))
          : [],
      );
    }
    return result;
  }
}
