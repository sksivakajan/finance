import type { RecurrenceFrequency } from '../../../generated/prisma/enums.js';

function daysInMonth(year: number, month: number): number {
  // Day 0 of the *next* month is the last day of `month`.
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Advances `date` by one occurrence of `frequency`. Never call with NONE.
 *
 * MONTHLY/YEARLY clamp the day-of-month to the target month's last day
 * instead of letting it overflow (native `setUTCMonth` on Jan 31 rolls into
 * March, since February has no 31st) — a payment due "on the 31st" or "on
 * Feb 29" should land on the last real day of a shorter month, not skip
 * forward silently.
 */
export function nextOccurrence(
  date: Date,
  frequency: Exclude<RecurrenceFrequency, 'NONE'>,
): Date {
  const day = date.getUTCDate();

  switch (frequency) {
    case 'DAILY': {
      const next = new Date(date);
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    }
    case 'WEEKLY': {
      const next = new Date(date);
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    }
    case 'MONTHLY': {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const clampedDay = Math.min(day, daysInMonth(year, month));
      return new Date(
        Date.UTC(
          year,
          month,
          clampedDay,
          date.getUTCHours(),
          date.getUTCMinutes(),
          date.getUTCSeconds(),
        ),
      );
    }
    case 'YEARLY': {
      const year = date.getUTCFullYear() + 1;
      const month = date.getUTCMonth();
      const clampedDay = Math.min(day, daysInMonth(year, month));
      return new Date(
        Date.UTC(
          year,
          month,
          clampedDay,
          date.getUTCHours(),
          date.getUTCMinutes(),
          date.getUTCSeconds(),
        ),
      );
    }
  }
}

/** Every occurrence of a recurring series that falls within
 * `[windowStart, windowEnd]` (inclusive), regardless of how far in the past
 * `startDate` is — used by forecasting to project recurring income/expenses/
 * scheduled payments forward from *now*, not from whenever the series began.
 * The iteration cap guards against a pathological series (e.g. a decades-old
 * DAILY item) burning unbounded time. */
export function occurrencesInWindow(
  startDate: Date,
  frequency: Exclude<RecurrenceFrequency, 'NONE'>,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  const MAX_ITERATIONS = 10_000;
  const occurrences: Date[] = [];
  let occurrence = startDate;
  let iterations = 0;

  while (occurrence < windowStart && iterations < MAX_ITERATIONS) {
    occurrence = nextOccurrence(occurrence, frequency);
    iterations++;
  }
  while (occurrence <= windowEnd && iterations < MAX_ITERATIONS) {
    occurrences.push(occurrence);
    occurrence = nextOccurrence(occurrence, frequency);
    iterations++;
  }
  return occurrences;
}
