"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useDashboardSummary } from "@/lib/hooks/use-dashboard";
import { useBalanceHistory, useCashFlow, useCategoryBreakdown } from "@/lib/hooks/use-reports";
import { useBalances } from "@/lib/hooks/use-balances";
import { formatMoney } from "@/lib/money";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { CategoryList } from "@/components/dashboard/category-list";
import { FriendsBalanceList } from "@/components/dashboard/friends-balance-list";
import { WalletIcon, TrendUpIcon, TrendDownIcon, PiggyBankIcon, CalendarIcon, SparkleIcon } from "@/components/dashboard/icons";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

const CHART_RANGES = [
  { days: 30, label: "This Month" },
  { days: 90, label: "Last 3 Months" },
  { days: 180, label: "Last 6 Months" },
];

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DueBadge({ days }: { days: number }) {
  const label = days < 0 ? "Overdue" : days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} left`;
  const tone = days <= 3 ? "bg-rose-50 text-rose-700" : days <= 10 ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700";
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const [chartDays, setChartDays] = useState(30);

  const { data, isLoading } = useDashboardSummary();
  const { data: history, isLoading: historyLoading } = useBalanceHistory(chartDays);
  const { data: cashFlow } = useCashFlow(2);
  const { data: categories, isLoading: categoriesLoading } = useCategoryBreakdown("EXPENSE");
  const { data: balancesData } = useBalances();

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const income = Number(data.currentMonth.incomeMinor);
  const expenses = Number(data.currentMonth.expensesMinor);
  const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expenses) / income) * 100)) : 0;

  const prevMonth = cashFlow?.[0];
  const thisMonth = cashFlow?.[1];
  let spendingChangePct: number | null = null;
  if (prevMonth && thisMonth) {
    const prevExpenses = Number(prevMonth.expensesMinor);
    const currExpenses = Number(thisMonth.expensesMinor);
    if (prevExpenses > 0) {
      spendingChangePct = Math.round(((currExpenses - prevExpenses) / prevExpenses) * 100);
    }
  }

  const savedAmountMinor =
    prevMonth && thisMonth ? Number(prevMonth.expensesMinor) - Number(thisMonth.expensesMinor) : 0;

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {greeting}, {user?.profile?.displayName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening with your finances today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Balance"
          value={formatMoney(data.balance.amountMinor, currency)}
          icon={<WalletIcon className="h-5 w-5" />}
          tone="violet"
        />
        <SummaryCard
          label="Income"
          value={formatMoney(data.currentMonth.incomeMinor, currency)}
          icon={<TrendUpIcon className="h-5 w-5" />}
          tone="emerald"
        />
        <SummaryCard
          label="Expenses"
          value={formatMoney(data.currentMonth.expensesMinor, currency)}
          icon={<TrendDownIcon className="h-5 w-5" />}
          tone="rose"
          trend={
            spendingChangePct !== null
              ? {
                  direction: spendingChangePct <= 0 ? "down" : "up",
                  sentiment: spendingChangePct <= 0 ? "positive" : "negative",
                  label: `${Math.abs(spendingChangePct)}% vs last month`,
                }
              : null
          }
        />
        <SummaryCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          icon={<PiggyBankIcon className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Cash Flow Overview</CardTitle>
            <Select value={chartDays} onChange={(e) => setChartDays(Number(e.target.value))} className="w-40">
              {CHART_RANGES.map((r) => (
                <option key={r.days} value={r.days}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatMoney(data.balance.amountMinor, currency)}</p>
          <p className="text-xs text-slate-500">Net balance</p>
          {historyLoading || !history ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="mt-2">
              <CashFlowChart points={history} currency={currency} />
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Upcoming Payments</CardTitle>
            <Link href="/scheduled-payments" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>
          {data.upcoming.items.length === 0 ? (
            <EmptyState title="You're all clear" description="No upcoming payments in the next 30 days." />
          ) : (
            <ul className="space-y-3">
              {data.upcoming.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <CalendarIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs tabular-nums text-slate-500">{formatMoney(item.amountMinor, item.currency)}</p>
                  </div>
                  <DueBadge days={daysUntil(item.dueDate)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Top Expense Categories</CardTitle>
          </div>
          {categoriesLoading || !categories ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <CategoryList entries={categories} currency={currency} />
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Friends Balance</CardTitle>
            <Link href="/balances" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>
          <FriendsBalanceList balances={balancesData?.items ?? []} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Recent Transactions</CardTitle>
            <Link href="/expenses" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>
          {data.recentTransactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Start tracking your spending to understand where your money goes."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentTransactions.slice(0, 5).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{tx.label}</p>
                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${tx.type === "INCOME" ? "text-emerald-700" : "text-slate-900"}`}
                  >
                    {tx.type === "INCOME" ? "+" : "-"}
                    {formatMoney(tx.amountMinor, tx.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {BigInt(data.loanObligations.remainingMinor) > 0n && (
        <Card>
          <CardTitle>Loans you owe</CardTitle>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {formatMoney(data.loanObligations.remainingMinor, currency)}
          </p>
          <Link href="/loans" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
            View loans
          </Link>
        </Card>
      )}

      {spendingChangePct !== null && spendingChangePct < 0 && (
        <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-violet-50 to-indigo-50 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <SparkleIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-slate-700">
                Your spending is <span className="font-semibold text-emerald-700">{Math.abs(spendingChangePct)}% lower</span> than
                last month <span aria-hidden="true">🎉</span>
              </p>
              <p className="text-sm text-slate-500">
                Great job! You&apos;ve saved {formatMoney(Math.abs(savedAmountMinor).toString(), currency)} compared to last month.
              </p>
            </div>
          </div>
          <Link href="/expenses">
            <Button variant="primary" className="shrink-0">
              View Expenses
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
