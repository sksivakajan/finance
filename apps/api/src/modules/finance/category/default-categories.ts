// Cloned onto every new user at registration (see AuthService.register) so
// each user's category list is their own editable copy from day one, not a
// shared global row. This is the single canonical list — prisma/seed.ts
// imports it too rather than redefining it.
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'utensils' },
  { name: 'Transport', icon: 'car' },
  { name: 'Housing', icon: 'home' },
  { name: 'Utilities', icon: 'bolt' },
  { name: 'Shopping', icon: 'bag' },
  { name: 'Entertainment', icon: 'film' },
  { name: 'Health', icon: 'heart-pulse' },
  { name: 'Education', icon: 'graduation-cap' },
  { name: 'Insurance', icon: 'shield' },
  { name: 'Other', icon: 'ellipsis' },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'wallet' },
  { name: 'Freelance', icon: 'laptop' },
  { name: 'Business', icon: 'briefcase' },
  { name: 'Commission', icon: 'percent' },
  { name: 'Interest', icon: 'landmark' },
  { name: 'Other', icon: 'ellipsis' },
] as const;
