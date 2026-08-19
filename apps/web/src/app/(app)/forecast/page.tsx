"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCashFlowForecast } from "@/lib/hooks/use-forecast";
import { formatMoney } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

const HORIZON_OPTIONS = [
  { days: 30, label: "Next 30 days" },
  { days: 60, label: "Next 60 days" },
  { days: 90, label: "Next 90 days" },
  { days: 180, label: "Next 6 months" },
  { days: 365, label: "Next year" },
];

const KIND_LABELS: Record<string, string> = {
  INCOME: "Income",
  EXPENSE: "Recurring expense",
  SCHEDULED_PAYMENT: "Scheduled payment",
  LOAN_INSTALLMENT: "Loan installment",
};

export default function ForecastPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const [days, setDays] = useState(30);
  const { data, isLoading } = useCashFlowForecast(days);

  const startingBalance = data ? BigInt(data.startingBalanceMinor) : 0n;
  const endingBalance = data ? BigInt(data.projectedEndingBalanceMinor) : 0n;
  const change = endingBalance - startingBalance;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Forecast</h1>
          <p className="text-sm text-slate-500">
            A projected cash position from your recurring income, expenses, scheduled payments, and loans.
          </p>
        </div>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-40">
          {HORIZON_OPTIONS.map((opt) => (
            <option key={opt.days} value={opt.days}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
        This is an estimate based on what&apos;s scheduled today — it isn&apos;t a guarantee, and doesn&apos;t
        account for anything you haven&apos;t recorded yet.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data ? (
        <EmptyState title="Couldn't load a forecast" description="Try again in a moment." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardTitle>Today</CardTitle>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatMoney(data.startingBalanceMinor, currency)}
              </p>
            </Card>
            <Card>
              <CardTitle>Projected in {data.horizonDays} days</CardTitle>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatMoney(data.projectedEndingBalanceMinor, currency)}
              </p>
            </Card>
            <Card>
              <CardTitle>Net change</CardTitle>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${change >= 0n ? "text-emerald-700" : "text-red-600"}`}>
                {change >= 0n ? "+" : ""}
                {formatMoney(change.toString(), currency)}
              </p>
            </Card>
          </div>

          {data.points.length === 0 ? (
            <EmptyState
              title="Nothing scheduled ahead"
              description="Add recurring income/expenses, scheduled payments, or a loan with a payment schedule to see a projection."
            />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-slate-100">
                {data.points.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.label}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(p.date).toLocaleDateString()} · {KIND_LABELS[p.kind] ?? p.kind}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium tabular-nums ${BigInt(p.amountMinor) >= 0n ? "text-emerald-700" : "text-slate-900"}`}
                      >
                        {BigInt(p.amountMinor) >= 0n ? "+" : ""}
                        {formatMoney(p.amountMinor, currency)}
                      </p>
                      <p className="text-xs text-slate-400">
                        balance {formatMoney(p.projectedBalanceMinor, currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
