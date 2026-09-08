"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  useScheduledPaymentList,
  useCreateScheduledPayment,
  useMarkScheduledPaymentPaid,
  useRemoveScheduledPayment,
} from "@/lib/hooks/use-scheduled-payments";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon } from "@/components/dashboard/icons";
import {
  PlusIcon,
  SearchIcon,
  ChevronDownIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CalendarCheckIcon,
  ShieldCheckIcon,
} from "@/components/scheduled-payments/icons";
import type { ScheduledPaymentRecord } from "@/lib/types";
import { MobileHeader } from "@/components/layout/mobile-header";

type Status = ScheduledPaymentRecord["status"];
type Tab = "ALL" | "UPCOMING" | "PAID" | "OVERDUE";
type RecurrenceFilter = "ALL" | ScheduledPaymentRecord["recurrence"];

const STATUS_META: Record<Status, { label: string; badge: string; dot: string }> = {
  UPCOMING: { label: "Upcoming", badge: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  DUE: { label: "Due", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  PAID: { label: "Paid", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  OVERDUE: { label: "Overdue", badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
  CANCELLED: { label: "Cancelled", badge: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500", dot: "bg-slate-300" },
};

const TABS: { key: Tab; label: string; icon?: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement }[] = [
  { key: "ALL", label: "All" },
  { key: "UPCOMING", label: "Upcoming", icon: ClockIcon },
  { key: "PAID", label: "Paid", icon: CheckCircleIcon },
  { key: "OVERDUE", label: "Overdue", icon: AlertCircleIcon },
];

const ROW_TONES = [
  { bg: "bg-violet-100", text: "text-violet-600" },
  { bg: "bg-amber-100", text: "text-amber-600" },
  { bg: "bg-emerald-100", text: "text-emerald-600" },
  { bg: "bg-sky-100", text: "text-sky-600" },
];

function Sparkline({ tone }: { tone: string }) {
  return (
    <svg viewBox="0 0 60 24" className="h-8 w-16 shrink-0" fill="none">
      <path
        d="M1 18 L11 12 L21 15 L31 6 L41 10 L50 3 L59 8"
        stroke={tone}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sumMinor(items: ScheduledPaymentRecord[]): bigint {
  return items.reduce((acc, item) => acc + BigInt(item.amountMinor), 0n);
}

export default function ScheduledPaymentsPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data, isLoading } = useScheduledPaymentList();
  const createPayment = useCreateScheduledPayment();
  const markPaid = useMarkScheduledPaymentPaid();
  const removePayment = useRemoveScheduledPayment();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recurrence, setRecurrence] = useState<"NONE" | "MONTHLY" | "WEEKLY" | "YEARLY">("NONE");
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [recurrenceFilter, setRecurrenceFilter] = useState<RecurrenceFilter>("ALL");
  const filterDetailsRef = useRef<HTMLDetailsElement | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createPayment.mutateAsync({
        name,
        amountMinor: toMinorUnits(amount),
        currency,
        dueDate: new Date(dueDate),
        recurrence,
        reminderOffsetDays: [7, 3, 1, 0],
      });
      setName("");
      setAmount("");
      setRecurrence("NONE");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  const items = useMemo(() => data?.items ?? [], [data]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status !== "CANCELLED");
    const paid = items.filter((i) => i.status === "PAID");
    const upcoming = items.filter((i) => i.status === "UPCOMING" || i.status === "DUE");
    const next = [...upcoming, ...items.filter((i) => i.status === "OVERDUE")].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0];
    return {
      totalMinor: sumMinor(active),
      totalCount: active.length,
      paidMinor: sumMinor(paid),
      paidCount: paid.length,
      upcomingMinor: sumMinor(upcoming),
      upcomingCount: upcoming.length,
      next,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (tab === "UPCOMING" && item.status !== "UPCOMING" && item.status !== "DUE") return false;
      if (tab === "PAID" && item.status !== "PAID") return false;
      if (tab === "OVERDUE" && item.status !== "OVERDUE") return false;
      if (recurrenceFilter !== "ALL" && item.recurrence !== recurrenceFilter) return false;
      if (search.trim() && !item.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [items, tab, recurrenceFilter, search]);

  function selectRecurrenceFilter(value: RecurrenceFilter) {
    setRecurrenceFilter(value);
    if (filterDetailsRef.current) filterDetailsRef.current.open = false;
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Scheduled Payments"
        right={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            aria-label={showForm ? "Cancel" : "Add payment"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-50 dark:hover:text-slate-100"
          >
            <PlusIcon className={cn("h-5 w-5 transition-transform", showForm && "rotate-45")} />
          </button>
        }
      />
      <div className="hidden items-center justify-between md:flex">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Scheduled payments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bills and payments you know are coming.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <PlusIcon className="h-4 w-4" /> Add payment
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="amount">Amount ({currency})</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select
                id="recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
              >
                <option value="NONE">One-time</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit" isLoading={createPayment.isPending}>
                Save payment
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="You're all clear" description="No upcoming payments. Add one to get reminders before it's due." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <CalendarCheckIcon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total scheduled</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                    {formatMoney(stats.totalMinor, currency)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stats.totalCount} payments</p>
                </div>
                <Sparkline tone="#7c3aed" />
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <CheckCircleIcon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Paid</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">{stats.paidCount} payments</p>
                  <p className="mt-1 text-xs font-medium tabular-nums text-emerald-600">
                    {formatMoney(stats.paidMinor, currency)}
                  </p>
                </div>
                <Sparkline tone="#059669" />
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <ClockIcon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Upcoming</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">{stats.upcomingCount} payments</p>
                  <p className="mt-1 text-xs font-medium tabular-nums text-amber-600">
                    {formatMoney(stats.upcomingMinor, currency)}
                  </p>
                </div>
                <Sparkline tone="#d97706" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Next payment due</span>
              </div>
              {stats.next ? (
                <>
                  <p className="mt-3 text-xl font-semibold text-sky-600">{formatDate(stats.next.dueDate)}</p>
                  <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {formatMoney(stats.next.amountMinor, stats.next.currency)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Nothing due</p>
              )}
            </Card>
          </div>

          <Card className="p-0">
            <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {TABS.map((t) => {
                  const active = tab === t.key;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        t.key === "ALL"
                          ? active
                            ? "bg-indigo-600 text-white"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          : active
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search payments..."
                    className="w-56 pl-9"
                  />
                </div>
                <details ref={filterDetailsRef} className="relative">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    Filter
                    {recurrenceFilter !== "ALL" && (
                      <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">1</span>
                    )}
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-lg">
                    <p className="px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500">Recurrence</p>
                    {(["ALL", "NONE", "WEEKLY", "MONTHLY", "YEARLY", "DAILY"] as RecurrenceFilter[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => selectRecurrenceFilter(value)}
                        className={cn(
                          "block w-full rounded-md px-2 py-1.5 text-left text-sm",
                          recurrenceFilter === value ? "bg-indigo-50 text-indigo-700" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        )}
                      >
                        {value === "ALL" ? "All" : value === "NONE" ? "One-time" : value.charAt(0) + value.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No payments match" description="Try a different tab, search term, or filter." />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                  {filteredItems.map((payment, index) => {
                    const meta = STATUS_META[payment.status];
                    const tone = ROW_TONES[index % ROW_TONES.length];
                    return (
                      <li key={payment.id} className="flex items-start gap-3 px-4 py-3.5">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            tone.bg,
                            tone.text,
                          )}
                        >
                          <CalendarIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{payment.name}</p>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                              {formatMoney(payment.amountMinor, payment.currency)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(payment.dueDate)}</p>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", meta.badge)}>
                              {meta.label.toUpperCase()}
                            </span>
                          </div>
                          {payment.status !== "PAID" && payment.status !== "CANCELLED" && (
                            <div className="mt-2 flex items-center gap-3">
                              <Button
                                size="sm"
                                variant="secondary"
                                isLoading={markPaid.isPending}
                                onClick={() => void markPaid.mutateAsync(payment.id)}
                              >
                                Mark paid
                              </Button>
                              <button
                                type="button"
                                onClick={() => void removePayment.mutateAsync(payment.id)}
                                className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-600"
                                aria-label={`Cancel ${payment.name}`}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Payment
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Due date
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((payment, index) => {
                      const meta = STATUS_META[payment.status];
                      const tone = ROW_TONES[index % ROW_TONES.length];
                      return (
                        <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                  tone.bg,
                                  tone.text,
                                )}
                              >
                                <CalendarIcon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{payment.name}</p>
                                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", meta.badge)}>
                                    {meta.label.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Due {formatDate(payment.dueDate)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-slate-600 dark:text-slate-300">{formatDate(payment.dueDate)}</td>
                          <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-slate-900 dark:text-slate-50">
                            {formatMoney(payment.amountMinor, payment.currency)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-3">
                              {payment.status !== "PAID" && payment.status !== "CANCELLED" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  isLoading={markPaid.isPending}
                                  onClick={() => void markPaid.mutateAsync(payment.id)}
                                >
                                  Mark paid
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={() => void removePayment.mutateAsync(payment.id)}
                                className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-600"
                                aria-label={`Cancel ${payment.name}`}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3 text-xs text-slate-400 dark:text-slate-500">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Payments are secure and encrypted
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
