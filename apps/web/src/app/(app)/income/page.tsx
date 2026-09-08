"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useIncomeList, useCreateIncome, useUpdateIncome, useRemoveIncome } from "@/lib/hooks/use-income";
import { useCategories } from "@/lib/hooks/use-categories";
import { useIncomeSummary, useMonthlySeries, useCategoryBreakdown } from "@/lib/hooks/use-reports";
import { useCashFlowForecast } from "@/lib/hooks/use-forecast";
import { formatMoney, toMinorUnits, fromMinorUnits } from "@/lib/money";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { paletteForKey } from "@/lib/category-palette";
import type { IncomeRecord } from "@/lib/types";
import type { RecurrenceFrequency } from "@finance/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/ui/summary-card";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { IncomeChart } from "@/components/income/income-chart";
import { CategoryDonut } from "@/components/income/category-donut";
import { WalletIcon, TrendUpIcon, CalendarIcon, PencilIcon, TrashIcon, PlusIcon } from "@/components/dashboard/icons";

const CHART_MONTH_OPTIONS = [
  { months: 6, label: "Last 6 Months" },
  { months: 12, label: "This Year" },
  { months: 24, label: "Last 2 Years" },
];

const TIME_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "year", label: "This Year" },
] as const;

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return { amount: "", source: "", categoryId: "", date: todayIsoDate(), isRecurring: false, recurrenceRule: "MONTHLY" as RecurrenceFrequency };
}

function recurrenceBadge(income: IncomeRecord): { label: string; className: string } {
  if (!income.isRecurring || !income.recurrenceRule) {
    return { label: "One-time", className: "bg-sky-50 text-sky-700" };
  }
  const styles: Record<string, string> = {
    DAILY: "bg-amber-50 text-amber-700",
    WEEKLY: "bg-amber-50 text-amber-700",
    MONTHLY: "bg-emerald-50 text-emerald-700",
    YEARLY: "bg-violet-50 text-violet-700",
  };
  const labels: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", YEARLY: "Yearly" };
  return { label: labels[income.recurrenceRule] ?? income.recurrenceRule, className: styles[income.recurrenceRule] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" };
}

function yearRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  const to = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)).toISOString();
  return { from, to };
}

function withinFilter(dateStr: string, filter: (typeof TIME_FILTERS)[number]["value"]): boolean {
  if (filter === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  if (filter === "month") {
    return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
  }
  if (filter === "year") {
    return date.getUTCFullYear() === now.getUTCFullYear();
  }
  // 3months
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 3);
  return date >= cutoff;
}

export default function IncomePage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data, isLoading } = useIncomeList();
  const { data: categories } = useCategories("INCOME");
  const { data: summary } = useIncomeSummary();
  const [chartMonths, setChartMonths] = useState(12);
  const { data: chartSeries, isLoading: chartLoading } = useMonthlySeries("INCOME", chartMonths);
  const { data: categoryBreakdown, isLoading: categoriesLoading } = useCategoryBreakdown("INCOME", yearRange());
  const { data: forecast } = useCashFlowForecast(30);
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const removeIncome = useRemoveIncome();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<(typeof TIME_FILTERS)[number]["value"]>("all");
  const [categoryFilter, setCategoryFilter] = useState("");

  const isEditing = editingId !== null;
  const isSaving = createIncome.isPending || updateIncome.isPending;

  const categoryMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((income) => {
      if (categoryFilter && income.categoryId !== categoryFilter) return false;
      return withinFilter(income.date, timeFilter);
    });
  }, [data, categoryFilter, timeFilter]);

  const upcomingIncomeMinor = (forecast?.points ?? [])
    .filter((p) => p.kind === "INCOME")
    .reduce((sum, p) => sum + BigInt(p.amountMinor), 0n);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  }

  function openEditForm(income: IncomeRecord) {
    setEditingId(income.id);
    setForm({
      amount: fromMinorUnits(income.amountMinor),
      source: income.source,
      categoryId: income.categoryId ?? "",
      date: income.date.slice(0, 10),
      isRecurring: income.isRecurring,
      recurrenceRule: (income.recurrenceRule as RecurrenceFrequency) ?? "MONTHLY",
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      amountMinor: toMinorUnits(form.amount),
      currency,
      source: form.source,
      categoryId: form.categoryId || undefined,
      date: new Date(form.date),
      isRecurring: form.isRecurring,
      recurrenceRule: form.isRecurring ? form.recurrenceRule : undefined,
    };
    try {
      if (editingId) {
        await updateIncome.mutateAsync({ id: editingId, input });
      } else {
        await createIncome.mutateAsync(input);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const thisMonthMinor = summary ? Number(summary.thisMonthMinor) : 0;
  const lastMonthMinor = summary ? Number(summary.lastMonthMinor) : 0;
  const avgMonthlyMinor = summary ? Number(summary.avgMonthlyMinor) : 0;

  let monthChangePct: number | null = null;
  if (summary && lastMonthMinor > 0) {
    monthChangePct = Math.round(((thisMonthMinor - lastMonthMinor) / lastMonthMinor) * 100);
  }
  let vsAveragePct: number | null = null;
  if (summary && avgMonthlyMinor > 0) {
    vsAveragePct = Math.round(((thisMonthMinor - avgMonthlyMinor) / avgMonthlyMinor) * 100);
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Income"
        right={
          <button
            type="button"
            onClick={() => (showForm ? closeForm() : openCreateForm())}
            aria-label={showForm ? "Cancel" : "Add income"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-50 dark:hover:text-slate-100"
          >
            <PlusIcon className={cn("h-5 w-5 transition-transform", showForm && "rotate-45")} />
          </button>
        }
      />
      <div className="hidden flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Income</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track all your income sources in one place</p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>{showForm ? "Cancel" : "+ Add Income"}</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Income"
          value={summary ? formatMoney(summary.totalMinor, currency) : "—"}
          icon={<WalletIcon className="h-5 w-5" />}
          tone="violet"
          trend={
            monthChangePct !== null
              ? { direction: monthChangePct >= 0 ? "up" : "down", sentiment: monthChangePct >= 0 ? "positive" : "negative", label: `${Math.abs(monthChangePct)}% vs last month` }
              : null
          }
        />
        <SummaryCard
          label="Avg. Monthly Income"
          value={summary ? formatMoney(summary.avgMonthlyMinor, currency) : "—"}
          icon={<TrendUpIcon className="h-5 w-5" />}
          tone="emerald"
          trend={
            vsAveragePct !== null
              ? { direction: vsAveragePct >= 0 ? "up" : "down", sentiment: vsAveragePct >= 0 ? "positive" : "negative", label: `${Math.abs(vsAveragePct)}% this month vs avg` }
              : null
          }
        />
        <SummaryCard
          label="This Month"
          value={summary ? formatMoney(summary.thisMonthMinor, currency) : "—"}
          icon={<CalendarIcon className="h-5 w-5" />}
          tone="amber"
          trend={
            monthChangePct !== null
              ? { direction: monthChangePct >= 0 ? "up" : "down", sentiment: monthChangePct >= 0 ? "positive" : "negative", label: `${Math.abs(monthChangePct)}% vs last month` }
              : null
          }
        />
        <SummaryCard
          label="Upcoming Income"
          value={formatMoney(upcomingIncomeMinor.toString(), currency)}
          icon={<WalletIcon className="h-5 w-5" />}
          tone="sky"
          subtext="Next 30 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">Income Overview</CardTitle>
            <Select value={chartMonths} onChange={(e) => setChartMonths(Number(e.target.value))} className="w-40">
              {CHART_MONTH_OPTIONS.map((r) => (
                <option key={r.months} value={r.months}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {formatMoney((chartSeries ?? []).reduce((sum, p) => sum + Number(p.amountMinor), 0).toString(), currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total income this period</p>
          {chartLoading || !chartSeries ? (
            <div className="flex h-52 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <IncomeChart points={chartSeries} currency={currency} />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-50">Income by Category</CardTitle>
          {categoriesLoading || !categoryBreakdown ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              <CategoryDonut entries={categoryBreakdown} currency={currency} />
              <a href="#all-income" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
                View Full Report
              </a>
            </>
          )}
        </Card>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="source">Source</Label>
              <Input id="source" required value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="amount">Amount ({currency})</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">None</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                This income repeats
              </label>
              {form.isRecurring && (
                <Select
                  className="mt-2 w-40"
                  value={form.recurrenceRule}
                  onChange={(e) => setForm((f) => ({ ...f, recurrenceRule: e.target.value as RecurrenceFrequency }))}
                >
                  {RECURRENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit" isLoading={isSaving}>
                {isEditing ? "Update income" : "Save income"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card id="all-income" className="scroll-mt-6 p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">All Income</CardTitle>
          <div className="flex gap-2">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-40">
              <option value="">All Categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as (typeof TIME_FILTERS)[number]["value"])} className="w-36">
              {TIME_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No income yet" description="Record your first income to start tracking what comes in." />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No matching income" description="Try a different category or time range." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Recurring</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((income) => {
                  const category = income.categoryId ? categoryMap.get(income.categoryId) : undefined;
                  const badge = recurrenceBadge(income);
                  return (
                    <tr key={income.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-50">{income.source}</p>
                        {income.description && <p className="text-xs text-slate-500 dark:text-slate-400">{income.description}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {category ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paletteForKey(category.id).chip}`}>
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 tabular-nums font-medium text-emerald-700">+{formatMoney(income.amountMinor, income.currency)}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(income.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(income)}
                            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600"
                            aria-label={`Edit income from ${income.source}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeIncome.mutateAsync(income.id)}
                            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete income from ${income.source}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
