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

export type SplitMethod = "NONE" | "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
export type ExpenseVisibility = "PRIVATE" | "SHARED_WITH_USERS" | "SHARED_WITH_GROUP" | "PARTICIPANTS_ONLY";

export interface ExpenseRecord {
  id: string;
  ownerId: string;
  payerId: string;
  amountMinor: string;
  currency: string;
  categoryId: string | null;
  merchant: string | null;
  description: string | null;
  date: string;
  paymentMethod: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  splitMethod: SplitMethod;
  visibility: ExpenseVisibility;
  groupId: string | null;
}

export interface SharedExpenseRecord extends ExpenseRecord {
  myShareMinor: string | null;
}

export interface CurrencyBalance {
  currency: string;
  netMinor: string;
}

export interface FriendBalance {
  user: FriendUser | null;
  balances: CurrencyBalance[];
}

export interface GroupMemberView {
  userId: string;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
  username: string;
  usernameDisplay: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface GroupRecord {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdById: string;
  createdAt: string;
  members: GroupMemberView[];
}

export interface DebtTransfer {
  from: FriendUser | null;
  to: FriendUser | null;
  amountMinor: string;
}

export interface OptimizeResult {
  currency: string;
  transfers: DebtTransfer[];
}

export interface MoneyRequestRecord {
  id: string;
  senderId: string;
  receiverId: string;
  amountMinor: string;
  currency: string;
  reason: string;
  dueDate: string | null;
  relatedExpenseId: string | null;
  status: "PENDING" | "PAID" | "DECLINED" | "CANCELLED";
  createdAt: string;
  respondedAt: string | null;
}

export interface SettlementRecord {
  id: string;
  payerId: string;
  receiverId: string;
  amountMinor: string;
  currency: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
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

export interface FriendUser {
  id: string;
  username: string;
  usernameDisplay: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Friend {
  friendshipId: string;
  since: string;
  user: FriendUser;
}

export interface FriendRequestView {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  user: FriendUser;
}

export interface ConversationSummary {
  conversationId: string;
  otherUser: FriendUser | null;
  lastMessage: {
    id: string;
    body: string | null;
    type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
    senderId: string;
    createdAt: string;
    deleted: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  body: string | null;
  attachmentUrl: string | null;
  editedAt: string | null;
  deleted: boolean;
  createdAt: string;
}

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_REQUEST_ACCEPTED"
  | "NEW_MESSAGE"
  | "MENTION"
  | "EXPENSE_CREATED"
  | "EXPENSE_UPDATED"
  | "MONEY_REQUEST"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_DUE"
  | "PAYMENT_OVERDUE"
  | "LOAN_REMINDER"
  | "GROUP_INVITATION"
  | "SETTLEMENT_REQUEST"
  | "SETTLEMENT_COMPLETED";

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
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

export interface BalanceHistoryPoint {
  date: string;
  balanceMinor: string;
  incomeMinor: string;
  expensesMinor: string;
}

export interface MonthlySeriesPoint {
  month: string;
  amountMinor: string;
}

export interface CashFlowMonth {
  month: string;
  incomeMinor: string;
  expensesMinor: string;
  netMinor: string;
}

export interface CategoryBreakdownEntry {
  categoryId: string;
  name: string;
  icon: string | null;
  amountMinor: string;
}
