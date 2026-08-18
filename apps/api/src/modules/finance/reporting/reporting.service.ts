import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The last `months` month keys, oldest first, including the current month. */
function trailingMonthKeys(months: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1),
    );
    keys.push(monthKey(d));
  }
  return keys;
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(userId: string) {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const upcomingWindowEnd = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const [
      currentMonthIncome,
      currentMonthExpenses,
      lifetimeIncome,
      lifetimeExpenses,
      upcomingPayments,
      activeLoansOwedByMe,
      recentIncome,
      recentExpenses,
    ] = await Promise.all([
      this.prisma.income.aggregate({
        where: {
          userId,
          deletedAt: null,
          date: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          deletedAt: null,
          date: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.income.aggregate({
        where: { userId, deletedAt: null },
        _sum: { amountMinor: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, deletedAt: null },
        _sum: { amountMinor: true },
      }),
      this.prisma.scheduledPayment.findMany({
        where: {
          userId,
          deletedAt: null,
          status: { in: ['UPCOMING', 'DUE'] },
          dueDate: { lte: upcomingWindowEnd },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.loan.findMany({
        where: {
          userId,
          deletedAt: null,
          direction: 'I_OWE',
          status: 'ACTIVE',
        },
        include: { payments: { select: { amountMinor: true } } },
      }),
      this.prisma.income.findMany({
        where: { userId, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      this.prisma.expense.findMany({
        where: { userId, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    const totalRemainingOwed = activeLoansOwedByMe.reduce((sum, loan) => {
      const paid = loan.payments.reduce((s, p) => s + p.amountMinor, 0n);
      const remaining = loan.principalMinor - paid;
      return sum + (remaining > 0n ? remaining : 0n);
    }, 0n);

    const recentTransactions = [
      ...recentIncome.map((i) => ({
        type: 'INCOME' as const,
        id: i.id,
        amountMinor: i.amountMinor,
        currency: i.currency,
        date: i.date,
        label: i.source,
      })),
      ...recentExpenses.map((e) => ({
        type: 'EXPENSE' as const,
        id: e.id,
        amountMinor: e.amountMinor,
        currency: e.currency,
        date: e.date,
        label: e.merchant ?? e.description ?? 'Expense',
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);

    return {
      currentMonth: {
        incomeMinor: currentMonthIncome._sum.amountMinor ?? 0n,
        expensesMinor: currentMonthExpenses._sum.amountMinor ?? 0n,
      },
      balance: {
        amountMinor:
          (lifetimeIncome._sum.amountMinor ?? 0n) -
          (lifetimeExpenses._sum.amountMinor ?? 0n),
      },
      upcoming: {
        amountMinor: upcomingPayments.reduce(
          (sum, p) => sum + p.amountMinor,
          0n,
        ),
        count: upcomingPayments.length,
        items: upcomingPayments.slice(0, 5),
      },
      // Friend balances (owed to me / I owe friends) are Phase 3 scope —
      // shared expenses and the settlement engine don't exist yet.
      loanObligations: { remainingMinor: totalRemainingOwed },
      recentTransactions,
    };
  }

  async getMonthlySeries(
    userId: string,
    kind: 'INCOME' | 'EXPENSE',
    months: number,
  ) {
    const keys = trailingMonthKeys(months);
    const since = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth() - (months - 1),
        1,
      ),
    );

    const rows =
      kind === 'INCOME'
        ? await this.prisma.income.findMany({
            where: { userId, deletedAt: null, date: { gte: since } },
            select: { date: true, amountMinor: true },
          })
        : await this.prisma.expense.findMany({
            where: { userId, deletedAt: null, date: { gte: since } },
            select: { date: true, amountMinor: true },
          });

    const totals = new Map<string, bigint>(keys.map((k) => [k, 0n]));
    for (const row of rows) {
      const key = monthKey(row.date);
      totals.set(key, (totals.get(key) ?? 0n) + row.amountMinor);
    }
    return keys.map((month) => ({
      month,
      amountMinor: totals.get(month) ?? 0n,
    }));
  }

  async getCashFlow(userId: string, months: number) {
    const [income, expenses] = await Promise.all([
      this.getMonthlySeries(userId, 'INCOME', months),
      this.getMonthlySeries(userId, 'EXPENSE', months),
    ]);
    return income.map((row, i) => ({
      month: row.month,
      incomeMinor: row.amountMinor,
      expensesMinor: expenses[i]?.amountMinor ?? 0n,
      netMinor: row.amountMinor - (expenses[i]?.amountMinor ?? 0n),
    }));
  }

  async getCategoryBreakdown(
    userId: string,
    kind: 'INCOME' | 'EXPENSE',
    from: Date,
    to: Date,
  ) {
    const rows =
      kind === 'INCOME'
        ? await this.prisma.income.findMany({
            where: { userId, deletedAt: null, date: { gte: from, lt: to } },
            select: {
              amountMinor: true,
              categoryId: true,
              category: { select: { name: true, icon: true } },
            },
          })
        : await this.prisma.expense.findMany({
            where: { userId, deletedAt: null, date: { gte: from, lt: to } },
            select: {
              amountMinor: true,
              categoryId: true,
              category: { select: { name: true, icon: true } },
            },
          });

    const byCategory = new Map<
      string,
      { name: string; icon: string | null; amountMinor: bigint }
    >();
    for (const row of rows) {
      const key = row.categoryId ?? 'uncategorized';
      const existing = byCategory.get(key);
      const name = row.category?.name ?? 'Uncategorized';
      if (existing) {
        existing.amountMinor += row.amountMinor;
      } else {
        byCategory.set(key, {
          name,
          icon: row.category?.icon ?? null,
          amountMinor: row.amountMinor,
        });
      }
    }
    return Array.from(byCategory.entries())
      .map(([categoryId, v]) => ({ categoryId, ...v }))
      .sort((a, b) => (b.amountMinor > a.amountMinor ? 1 : -1));
  }
}
