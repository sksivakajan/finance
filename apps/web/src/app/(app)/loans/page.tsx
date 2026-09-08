"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLoanList, useCreateLoan, useAddLoanPayment, useUpdateLoan } from "@/lib/hooks/use-loans";
import { useLoanPayoffForecast } from "@/lib/hooks/use-forecast";
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
import { SummaryCard } from "@/components/ui/summary-card";
import type { LoanRecord } from "@/lib/types";
import { MobileHeader } from "@/components/layout/mobile-header";
import {
  WalletIcon,
  CheckCircleIcon,
  ClockIcon,
  PieChartIcon,
  BuildingIcon,
  UserIcon,
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  PlusIcon,
  CalendarIcon,
  MoreVerticalIcon,
} from "@/components/dashboard/icons";

const STATUS_STYLES: Record<LoanRecord["status"], string> = {
  ACTIVE: "bg-indigo-50 text-indigo-700",
  PAID_OFF: "bg-emerald-50 text-emerald-700",
  DEFAULTED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500",
};

const ROW_TONES = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
];

type FilterValue = "ALL" | "I_OWE" | "OWED_TO_ME" | "ACTIVE" | "PAID_OFF";
type SortValue = "RECENT" | "PRINCIPAL" | "REMAINING" | "PROGRESS";

function loanProgressPct(loan: LoanRecord): number {
  const principal = BigInt(loan.principalMinor);
  if (principal <= 0n) return 0;
  return Number((BigInt(loan.paidMinor) * 10000n) / principal) / 100;
}

function LoanIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="10" cy="14" r="2" fill="#c4b5fd" />
      <circle cx="54" cy="10" r="1.5" fill="#fcd34d" />
      <circle cx="8" cy="48" r="1.5" fill="#93c5fd" />
      <circle cx="56" cy="46" r="2" fill="#f9a8d4" />
      <rect x="12" y="24" width="34" height="26" rx="6" fill="#ede9fe" />
      <rect x="12" y="24" width="34" height="11" rx="6" fill="#a78bfa" />
      <circle cx="42" cy="40" r="4" fill="#fbbf24" />
      <rect x="22" y="16" width="18" height="12" rx="3" fill="#c7d2fe" />
    </svg>
  );
}

function LoanMenu({
  loan,
  onUpdateStatus,
  isPending,
}: {
  loan: LoanRecord;
  onUpdateStatus: (status: LoanRecord["status"]) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-label={`Actions for ${loan.counterpartyName}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
          {loan.status === "ACTIVE" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus("PAID_OFF");
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                Mark as paid off
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus("DEFAULTED");
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                Mark as defaulted
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus("CANCELLED");
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                Cancel loan
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onUpdateStatus("ACTIVE");
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              Reopen loan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PayoffSchedule({ loanId, currency }: { loanId: string; currency: string }) {
  const { data, isLoading } = useLoanPayoffForecast(loanId);
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }
  if (!data || data.points.length === 0) {
    return <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No payment schedule set for this loan.</p>;
  }
  return (
    <div className="mt-3 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
      <p className="text-xs text-amber-700">Estimate — assumes every installment lands on schedule.</p>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
        {data.points.map((p, i) => (
          <li key={i} className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>{new Date(p.date).toLocaleDateString()}</span>
            <span className="tabular-nums">{formatMoney(p.remainingMinor, currency)} remaining</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoanRow({ loan, currency, tone }: { loan: LoanRecord; currency: string; tone: (typeof ROW_TONES)[number] }) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPayoff, setShowPayoff] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const addPayment = useAddLoanPayment();
  const updateLoan = useUpdateLoan();

  const progressPct = loanProgressPct(loan);
  const isActive = loan.status === "ACTIVE";
  const Icon = loan.direction === "I_OWE" ? BuildingIcon : UserIcon;

  async function handleAddPayment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addPayment.mutateAsync({ loanId: loan.id, input: { amountMinor: toMinorUnits(amount), date: new Date(date) } });
      setAmount("");
      setShowPaymentForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 shrink-0 items-center gap-3 lg:w-56">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone.bg, tone.text)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{loan.counterpartyName}</p>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[loan.status])}>
                {loan.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{loan.direction === "I_OWE" ? "You owe" : "Owed to you"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm lg:flex lg:gap-8">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Principal</p>
            <p className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatMoney(loan.principalMinor, loan.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Paid</p>
            <p className="font-semibold tabular-nums text-emerald-700">{formatMoney(loan.paidMinor, loan.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Remaining</p>
            <p className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatMoney(loan.remainingMinor, loan.currency)}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isActive && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setShowPayoff((v) => !v)}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {showPayoff ? "Hide schedule" : "Payoff schedule"}
              </Button>
              <Button size="sm" onClick={() => setShowPaymentForm((v) => !v)}>
                {showPaymentForm ? "Cancel" : "Record payment"}
              </Button>
            </>
          )}
          <LoanMenu
            loan={loan}
            isPending={updateLoan.isPending}
            onUpdateStatus={(status) => void updateLoan.mutateAsync({ id: loan.id, input: { status } })}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-2 w-full flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={cn("h-full rounded-full", loan.status === "PAID_OFF" ? "bg-emerald-500" : "bg-indigo-500")}
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        {loan.status === "PAID_OFF" && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-10" />
            </svg>
          </span>
        )}
      </div>

      {showPayoff && <PayoffSchedule loanId={loan.id} currency={loan.currency} />}

      {showPaymentForm && (
        <form onSubmit={handleAddPayment} className="mt-4 grid gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`amount-${loan.id}`}>Amount ({currency})</Label>
            <Input
              id={`amount-${loan.id}`}
              inputMode="decimal"
              placeholder="0.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`date-${loan.id}`}>Date</Label>
            <Input id={`date-${loan.id}`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <ErrorText>{error}</ErrorText>
            <Button type="submit" size="sm" isLoading={addPayment.isPending}>
              Save payment
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}

export default function LoansPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data, isLoading } = useLoanList();
  const createLoan = useCreateLoan();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [sort, setSort] = useState<SortValue>("RECENT");

  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<"I_OWE" | "OWED_TO_ME">("I_OWE");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hasSchedule, setHasSchedule] = useState(false);
  const [installment, setInstallment] = useState("");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;
    let principalMinor = 0n;
    let paidMinor = 0n;
    let remainingMinor = 0n;
    let progressSum = 0;
    for (const loan of data) {
      principalMinor += BigInt(loan.principalMinor);
      paidMinor += BigInt(loan.paidMinor);
      remainingMinor += BigInt(loan.remainingMinor);
      progressSum += loanProgressPct(loan);
    }
    const paidPct = principalMinor > 0n ? Number((paidMinor * 10000n) / principalMinor) / 100 : 0;
    const remainingPct = principalMinor > 0n ? Number((remainingMinor * 10000n) / principalMinor) / 100 : 0;
    return {
      principalMinor,
      paidMinor,
      remainingMinor,
      paidPct,
      remainingPct,
      avgProgress: Math.round(progressSum / data.length),
      count: data.length,
    };
  }, [data]);

  const visibleLoans = useMemo(() => {
    if (!data) return [];
    let items = data;
    if (filter === "I_OWE" || filter === "OWED_TO_ME") {
      items = items.filter((l) => l.direction === filter);
    } else if (filter === "ACTIVE" || filter === "PAID_OFF") {
      items = items.filter((l) => l.status === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((l) => l.counterpartyName.toLowerCase().includes(q));

    const sorted = [...items];
    if (sort === "PRINCIPAL") {
      sorted.sort((a, b) => (BigInt(b.principalMinor) > BigInt(a.principalMinor) ? 1 : -1));
    } else if (sort === "REMAINING") {
      sorted.sort((a, b) => (BigInt(b.remainingMinor) > BigInt(a.remainingMinor) ? 1 : -1));
    } else if (sort === "PROGRESS") {
      sorted.sort((a, b) => loanProgressPct(b) - loanProgressPct(a));
    }
    return sorted;
  }, [data, filter, search, sort]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createLoan.mutateAsync({
        direction,
        counterpartyName,
        principalMinor: toMinorUnits(principal),
        currency,
        startDate: new Date(startDate),
        ...(hasSchedule
          ? {
              schedule: {
                installmentMinor: toMinorUnits(installment),
                frequency,
                nextDueDate: new Date(nextDueDate),
              },
            }
          : {}),
      });
      setCounterpartyName("");
      setPrincipal("");
      setHasSchedule(false);
      setInstallment("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Loans"
        right={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            aria-label={showForm ? "Cancel" : "Add loan"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-50 dark:hover:text-slate-100"
          >
            <PlusIcon className={cn("h-5 w-5 transition-transform", showForm && "rotate-45")} />
          </button>
        }
      />
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Loans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Money you owe, and money owed to you.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search loans..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-64"
            />
          </div>
          <Button onClick={() => setShowForm((v) => !v)} className="shrink-0 rounded-xl">
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                Add loan
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="relative md:hidden">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search loans..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="direction">Direction</Label>
              <Select id="direction" value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
                <option value="I_OWE">I owe this</option>
                <option value="OWED_TO_ME">Owed to me</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="counterpartyName">{direction === "I_OWE" ? "Lender" : "Borrower"}</Label>
              <Input
                id="counterpartyName"
                required
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="principal">Principal ({currency})</Label>
              <Input
                id="principal"
                inputMode="decimal"
                placeholder="0.00"
                required
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={hasSchedule}
                  onChange={(e) => setHasSchedule(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                Set a repeating installment schedule
              </label>
              {hasSchedule && (
                <div className="mt-2 grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="installment">Installment ({currency})</Label>
                    <Input
                      id="installment"
                      inputMode="decimal"
                      placeholder="0.00"
                      required={hasSchedule}
                      value={installment}
                      onChange={(e) => setInstallment(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nextDueDate">Next due date</Label>
                    <Input
                      id="nextDueDate"
                      type="date"
                      required={hasSchedule}
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit" isLoading={createLoan.isPending}>
                Save loan
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No loans yet" description="Track a loan to see your remaining balance and payment history." />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Total principal"
                value={formatMoney(summary.principalMinor.toString(), currency)}
                icon={<WalletIcon className="h-5 w-5" />}
                tone="violet"
                subtext={`${summary.count} loan${summary.count === 1 ? "" : "s"}`}
              />
              <SummaryCard
                label="Total paid"
                value={formatMoney(summary.paidMinor.toString(), currency)}
                icon={<CheckCircleIcon className="h-5 w-5" />}
                tone="emerald"
                subtext={`${summary.paidPct.toFixed(1)}% of principal`}
              />
              <SummaryCard
                label="Total remaining"
                value={formatMoney(summary.remainingMinor.toString(), currency)}
                icon={<ClockIcon className="h-5 w-5" />}
                tone="amber"
                subtext={`${summary.remainingPct.toFixed(1)}% remaining`}
              />
              <SummaryCard
                label="Avg. progress"
                value={`${summary.avgProgress}%`}
                icon={<PieChartIcon className="h-5 w-5" />}
                tone="sky"
                subtext="Across all loans"
              />
            </div>
          )}

          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative">
                <FilterIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterValue)}
                  className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-8 text-sm font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="ALL">All loans</option>
                  <option value="I_OWE">You owe</option>
                  <option value="OWED_TO_ME">Owed to you</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAID_OFF">Paid off</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Sort by</span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortValue)}
                    className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="RECENT">Recently added</option>
                    <option value="PRINCIPAL">Highest principal</option>
                    <option value="REMAINING">Highest remaining</option>
                    <option value="PROGRESS">Most progress</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            </div>

            {visibleLoans.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No loans match your filters.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleLoans.map((loan, i) => (
                  <LoanRow key={loan.id} loan={loan} currency={currency} tone={ROW_TONES[i % ROW_TONES.length]} />
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-violet-50 to-indigo-50 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <LoanIllustration />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Stay on top of your loans</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Record payments, track progress, and stay debt-free.</p>
              </div>
            </div>
            <Link href="/forecast">
              <Button variant="primary" className="shrink-0">
                Learn more
              </Button>
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
