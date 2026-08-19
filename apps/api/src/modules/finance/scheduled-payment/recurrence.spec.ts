import { nextOccurrence } from './recurrence.js';

describe('nextOccurrence', () => {
  it('advances DAILY by one day', () => {
    expect(
      nextOccurrence(new Date('2026-08-01T00:00:00Z'), 'DAILY').toISOString(),
    ).toBe('2026-08-02T00:00:00.000Z');
  });

  it('advances WEEKLY by seven days', () => {
    expect(
      nextOccurrence(new Date('2026-08-01T00:00:00Z'), 'WEEKLY').toISOString(),
    ).toBe('2026-08-08T00:00:00.000Z');
  });

  it('advances MONTHLY to the same day next month in the ordinary case', () => {
    expect(
      nextOccurrence(new Date('2026-08-25T00:00:00Z'), 'MONTHLY').toISOString(),
    ).toBe('2026-09-25T00:00:00.000Z');
  });

  it('clamps MONTHLY to the last day of a shorter target month instead of overflowing', () => {
    // Jan 31 -> Feb has no 31st. Native Date math (setUTCMonth) would roll
    // this into March; it must land on Feb 28 instead.
    expect(
      nextOccurrence(new Date('2026-01-31T00:00:00Z'), 'MONTHLY').toISOString(),
    ).toBe('2026-02-28T00:00:00.000Z');
  });

  it('clamps MONTHLY correctly into a leap-year February', () => {
    expect(
      nextOccurrence(new Date('2028-01-31T00:00:00Z'), 'MONTHLY').toISOString(),
    ).toBe('2028-02-29T00:00:00.000Z');
  });

  it('advances YEARLY to the same date next year in the ordinary case', () => {
    expect(
      nextOccurrence(new Date('2026-08-25T00:00:00Z'), 'YEARLY').toISOString(),
    ).toBe('2027-08-25T00:00:00.000Z');
  });

  it('clamps YEARLY off a leap day into a non-leap year', () => {
    expect(
      nextOccurrence(new Date('2028-02-29T00:00:00Z'), 'YEARLY').toISOString(),
    ).toBe('2029-02-28T00:00:00.000Z');
  });

  it('preserves the time-of-day component', () => {
    expect(
      nextOccurrence(new Date('2026-08-25T14:30:15Z'), 'MONTHLY').toISOString(),
    ).toBe('2026-09-25T14:30:15.000Z');
  });
});
