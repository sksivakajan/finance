import { BadRequestException, Injectable } from '@nestjs/common';
import type { RecurrenceFrequency } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  nextOccurrence,
  occurrencesInWindow,
} from '../scheduled-payment/recurrence.js';

interface ForecastEvent {
  date: Date;
  amountMinor: bigint;
  label: string;
  kind: 'INCOME' | 'EXPENSE' | 'SCHEDULED_PAYMENT' | 'LOAN_INSTALLMENT';
}

const MAX_FORECAST_DAYS = 365;
const DEFAULT_FORECAST_DAYS = 30;

function isRecurrenceFrequency(
  value: string | null,
): value is Exclude<RecurrenceFrequency, 'NONE'> {
  return (
    value === 'DAILY' ||
    value === 'WEEKLY' ||
    value === 'MONTHLY' ||
    value === 'YEARLY'
  );
}

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  /** Projects a starting cash position forward through every recurring
   * income/expense, scheduled payment, and active loan installment expected
   * to land within the window. Per docs/BLUEPRINT.md §2: an estimate, never
   * treated as a guarantee — every response carries `isEstimate: true` and
   * the frontend labels it the same way. */
  async getCashFlowForecast(userId: string, requestedDays: number) {
    const days = Math.min(Math.max(requestedDays, 1), MAX_FORECAST_DAYS);
    const now = new Date();
    // Window boundaries use the *start* of today, not this exact instant --
    // otherwise a bill due "today" (stored as today at midnight) reads as
    // already in the past the moment any time has elapsed since midnight,
    // and silently vanishes from its own forecast. `now` itself is still
    // used for the `asOf` timestamp in the response.
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const horizon = new Date(
      windowStart.getTime() + days * 24 * 60 * 60 * 1000,
    );

    const [
      incomeAgg,
      expenseAgg,
      recurringIncomes,
      recurringExpenses,
      scheduledPayments,
      activeLoans,
    ] = await Promise.all([
      this.prisma.income.aggregate({
        where: { userId, deletedAt: null },
        _sum: { amountMinor: true },
      }),
      this.prisma.expense.aggregate({
        where: { ownerId: userId, deletedAt: null },
        _sum: { amountMinor: true },
      }),
      this.prisma.income.findMany({
        where: {
          userId,
          deletedAt: null,
          isRecurring: true,
          recurrenceRule: { not: null },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          ownerId: userId,
          deletedAt: null,
          isRecurring: true,
          recurrenceRule: { not: null },
        },
      }),
      this.prisma.scheduledPayment.findMany({
        where: {
          userId,
          deletedAt: null,
          status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] },
        },
      }),
      this.prisma.loan.findMany({
        where: {
          userId,
          deletedAt: null,
          direction: 'I_OWE',
          status: 'ACTIVE',
        },
        include: {
          schedule: true,
          payments: { select: { amountMinor: true } },
        },
      }),
    ]);

    const startingBalanceMinor =
      (incomeAgg._sum.amountMinor ?? 0n) - (expenseAgg._sum.amountMinor ?? 0n);
    const events: ForecastEvent[] = [];

    // Income/Expense rows are actual recorded transactions, not "next
    // unpaid obligation" pointers the way ScheduledPayment/LoanSchedule are
    // -- `record.date` itself is already folded into startingBalanceMinor
    // via the lifetime aggregate above. Only occurrences *after* that
    // recorded date are un-recorded, and therefore fair game to project.
    for (const income of recurringIncomes) {
      if (!isRecurrenceFrequency(income.recurrenceRule)) continue;
      const firstProjectable = nextOccurrence(
        income.date,
        income.recurrenceRule,
      );
      for (const date of occurrencesInWindow(
        firstProjectable,
        income.recurrenceRule,
        windowStart,
        horizon,
      )) {
        events.push({
          date,
          amountMinor: income.amountMinor,
          label: income.source,
          kind: 'INCOME',
        });
      }
    }

    for (const expense of recurringExpenses) {
      if (!isRecurrenceFrequency(expense.recurrenceRule)) continue;
      const firstProjectable = nextOccurrence(
        expense.date,
        expense.recurrenceRule,
      );
      for (const date of occurrencesInWindow(
        firstProjectable,
        expense.recurrenceRule,
        windowStart,
        horizon,
      )) {
        events.push({
          date,
          amountMinor: -expense.amountMinor,
          label: expense.merchant ?? expense.description ?? 'Expense',
          kind: 'EXPENSE',
        });
      }
    }

    for (const payment of scheduledPayments) {
      const occurrences =
        payment.recurrence === 'NONE'
          ? payment.dueDate >= windowStart && payment.dueDate <= horizon
            ? [payment.dueDate]
            : []
          : occurrencesInWindow(
              payment.dueDate,
              payment.recurrence,
              windowStart,
              horizon,
            );
      for (const date of occurrences) {
        events.push({
          date,
          amountMinor: -payment.amountMinor,
          label: payment.name,
          kind: 'SCHEDULED_PAYMENT',
        });
      }
    }

    const MAX_INSTALLMENTS = 1000; // safety valve, not a realistic loan length
    for (const loan of activeLoans) {
      // A LoanSchedule row only exists when the loan actually has an
      // installment cadence -- 'NONE' would mean no schedule row at all --
      // but the column shares the same enum type as ScheduledPayment's,
      // which does allow NONE, so this is a defensive skip, not a real case.
      if (!loan.schedule || loan.schedule.frequency === 'NONE') continue;
      const frequency = loan.schedule.frequency;
      const paid = loan.payments.reduce((sum, p) => sum + p.amountMinor, 0n);
      let remaining = loan.principalMinor - paid;
      if (remaining <= 0n) continue;

      let dueDate = loan.schedule.nextDueDate;
      for (
        let i = 0;
        i < MAX_INSTALLMENTS && dueDate <= horizon && remaining > 0n;
        i++
      ) {
        const installment =
          loan.schedule.installmentMinor < remaining
            ? loan.schedule.installmentMinor
            : remaining;
        if (dueDate >= windowStart) {
          events.push({
            date: dueDate,
            amountMinor: -installment,
            label: `Loan: ${loan.counterpartyName}`,
            kind: 'LOAN_INSTALLMENT',
          });
        }
        remaining -= installment;
        dueDate = nextOccurrence(dueDate, frequency);
      }
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = startingBalanceMinor;
    const points = events.map((e) => {
      runningBalance += e.amountMinor;
      return {
        date: e.date.toISOString().slice(0, 10),
        label: e.label,
        kind: e.kind,
        amountMinor: e.amountMinor.toString(),
        projectedBalanceMinor: runningBalance.toString(),
      };
    });

    return {
      asOf: now.toISOString(),
      horizonDays: days,
      startingBalanceMinor: startingBalanceMinor.toString(),
      projectedEndingBalanceMinor: runningBalance.toString(),
      points,
      isEstimate: true,
    };
  }

  /** Payoff trajectory for one loan: remaining balance after each future
   * installment until it hits zero. Also an estimate — it assumes every
   * installment is paid on schedule and doesn't account for interest
   * accrual (docs/BLUEPRINT.md's Loan model tracks a flat `interestRateBps`
   * but no amortization schedule yet), so it's a payoff-date projection, not
   * a payment-amount one. */
  async getLoanPayoffForecast(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, deletedAt: null },
      include: { schedule: true, payments: { select: { amountMinor: true } } },
    });
    if (!loan || loan.userId !== userId) {
      throw new BadRequestException({
        code: 'LOAN_NOT_FOUND',
        message: 'Loan not found.',
      });
    }
    if (!loan.schedule || loan.schedule.frequency === 'NONE') {
      return { loanId, currency: loan.currency, points: [], isEstimate: true };
    }
    const frequency = loan.schedule.frequency;

    const paid = loan.payments.reduce((sum, p) => sum + p.amountMinor, 0n);
    let remaining = loan.principalMinor - paid;
    const points: { date: string; remainingMinor: string }[] = [];
    let dueDate = loan.schedule.nextDueDate;
    const MAX_INSTALLMENTS = 1000;

    for (let i = 0; i < MAX_INSTALLMENTS && remaining > 0n; i++) {
      const installment =
        loan.schedule.installmentMinor < remaining
          ? loan.schedule.installmentMinor
          : remaining;
      remaining -= installment;
      points.push({
        date: dueDate.toISOString().slice(0, 10),
        remainingMinor: remaining.toString(),
      });
      dueDate = nextOccurrence(dueDate, frequency);
    }

    return { loanId, currency: loan.currency, points, isEstimate: true };
  }

  static readonly DEFAULT_DAYS = DEFAULT_FORECAST_DAYS;
}
