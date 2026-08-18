// Response shapes returned by the API. @finance/shared covers *input* DTOs;
// these mirror what the corresponding endpoints actually send back.

export interface PublicProfile {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  defaultCurrency: string;
  timezone: string;
  whoCanFriendRequest: "EVERYONE" | "FRIENDS" | "NOBODY";
  whoCanMessage: "EVERYONE" | "FRIENDS" | "NOBODY";
  whoCanSeeProfile: "EVERYONE" | "FRIENDS" | "NOBODY";
  whoCanAddToGroups: "EVERYONE" | "FRIENDS" | "NOBODY";
}

export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string;
  usernameDisplay: string;
  createdAt: string;
  twoFactorEnabled: boolean;
  profile: PublicProfile | null;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  icon: string | null;
  isSystemDefault: boolean;
  archivedAt: string | null;
}

export interface IncomeRecord {
  id: string;
  amountMinor: string;
  currency: string;
  categoryId: string | null;
  source: string;
  description: string | null;
  date: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  notes: string | null;
}

export interface ExpenseRecord {
  id: string;
  amountMinor: string;
  currency: string;
  categoryId: string | null;
  merchant: string | null;
  description: string | null;
  date: string;
  paymentMethod: string | null;
  notes: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
}

export interface Reminder {
  id: string;
  offsetDays: number;
  firedAt: string | null;
}

export interface ScheduledPaymentRecord {
  id: string;
  name: string;
  amountMinor: string;
  currency: string;
  categoryId: string | null;
  dueDate: string;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  status: "UPCOMING" | "DUE" | "PAID" | "OVERDUE" | "CANCELLED";
  notes: string | null;
  parentSeriesId: string | null;
  reminders: Reminder[];
}

export interface LoanPaymentRecord {
  id: string;
  amountMinor: string;
  date: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
}

export interface LoanRecord {
  id: string;
  direction: "I_OWE" | "OWED_TO_ME";
  counterpartyName: string;
  principalMinor: string;
  currency: string;
  interestRateBps: number | null;
  startDate: string;
  status: "ACTIVE" | "PAID_OFF" | "DEFAULTED" | "CANCELLED";
  notes: string | null;
  payments: LoanPaymentRecord[];
  paidMinor: string;
  remainingMinor: string;
  schedule: { installmentMinor: string; frequency: string; nextDueDate: string } | null;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface DashboardSummary {
  currentMonth: { incomeMinor: string; expensesMinor: string };
  balance: { amountMinor: string };
  upcoming: { amountMinor: string; count: number; items: ScheduledPaymentRecord[] };
  loanObligations: { remainingMinor: string };
  recentTransactions: {
    type: "INCOME" | "EXPENSE";
    id: string;
    amountMinor: string;
    currency: string;
    date: string;
    label: string;
  }[];
}
