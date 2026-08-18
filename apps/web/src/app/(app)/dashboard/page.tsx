"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useDashboardSummary } from "@/lib/hooks/use-dashboard";
import { formatMoney } from "@/lib/money";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboardSummary();
  const currency = user?.profile?.defaultCurrency ?? "LKR";

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const balance = BigInt(data.balance.amountMinor);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome back, {user?.profile?.displayName}</h1>
        <p className="text-sm text-slate-500">Here&apos;s where things stand.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Balance"
          value={formatMoney(data.balance.amountMinor, currency)}
          tone={balance >= 0n ? "positive" : "negative"}
        />
        <SummaryCard label="Income this month" value={formatMoney(data.currentMonth.incomeMinor, currency)} />
        <SummaryCard label="Expenses this month" value={formatMoney(data.currentMonth.expensesMinor, currency)} />
        <SummaryCard label="Upcoming (30 days)" value={formatMoney(data.upcoming.amountMinor, currency)} />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Recent transactions</CardTitle>
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
              {data.recentTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tx.label}</p>
                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <span
                    className={`text-sm font-medium tabular-nums ${tx.type === "INCOME" ? "text-emerald-700" : "text-slate-900"}`}
                  >
                    {tx.type === "INCOME" ? "+" : "-"}
                    {formatMoney(tx.amountMinor, tx.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Upcoming payments</CardTitle>
            <Link href="/scheduled-payments" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>
          {data.upcoming.items.length === 0 ? (
            <EmptyState title="You're all clear" description="No upcoming payments in the next 30 days." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcoming.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">Due {new Date(item.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-slate-900">
                    {formatMoney(item.amountMinor, item.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
