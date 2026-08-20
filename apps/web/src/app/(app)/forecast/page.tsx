"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCashFlowForecast, type ForecastPoint } from "@/lib/hooks/use-forecast";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/mobile-header";
import {
  WalletIcon,
  TrendUpIcon,
  TrendDownIcon,
  PiggyBankIcon,
  CalendarIcon,
  SparkleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  InfoIcon,
  ChevronRightIcon,
} from "@/components/dashboard/icons";

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

const TONE_STYLES = {
  violet: { bg: "bg-violet-100", text: "text-violet-700" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
  rose: { bg: "bg-rose-100", text: "text-rose-700" },
  sky: { bg: "bg-sky-100", text: "text-sky-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
} as const;

type Tone = keyof typeof TONE_STYLES;

const KIND_TONE: Record<string, Tone> = {
  INCOME: "emerald",
  EXPENSE: "rose",
  SCHEDULED_PAYMENT: "violet",
  LOAN_INSTALLMENT: "sky",
};

const KIND_ICON: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  INCOME: TrendUpIcon,
  EXPENSE: TrendDownIcon,
  SCHEDULED_PAYMENT: WalletIcon,
  LOAN_INSTALLMENT: PiggyBankIcon,
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const width = 72;
  const height = 28;
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - 4 - ((v - min) / range) * (height - 8);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data]);

  if (!path) return <div className="h-7 w-[72px]" aria-hidden="true" />;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-[72px]" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  sparkline,
  sparklineColor,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: Tone;
  sparkline: number[];
  sparklineColor: string;
  valueClassName?: string;
}) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneStyle.bg, toneStyle.text)}>
            {icon}
          </span>
          <span className="text-sm font-medium text-slate-500">{label}</span>
        </div>
        <MiniSparkline data={sparkline} color={sparklineColor} />
      </div>
      <p className={cn("mt-3 text-lg font-semibold tabular-nums", valueClassName ?? "text-slate-900")}>{value}</p>
    </Card>
  );
}

function ForecastIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-50", className)}>
      <div className="flex h-full w-full items-center justify-center gap-2 p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
          <TrendUpIcon className="h-6 w-6" />
        </span>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
          <CalendarIcon className="h-7 w-7" />
        </span>
      </div>
    </div>
  );
}

function pointsSum(points: ForecastPoint[], kinds: string[]): bigint {
  return points.filter((p) => kinds.includes(p.kind)).reduce((sum, p) => sum + BigInt(p.amountMinor), 0n);
}

export default function ForecastPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const [days, setDays] = useState(30);
  const { data, isLoading } = useCashFlowForecast(days);

  const startingBalance = data ? BigInt(data.startingBalanceMinor) : 0n;
  const endingBalance = data ? BigInt(data.projectedEndingBalanceMinor) : 0n;
  const change = endingBalance - startingBalance;

  const balanceSeries = data
    ? [Number(data.startingBalanceMinor), ...data.points.map((p) => Number(p.projectedBalanceMinor))]
    : [];
  const todaySparkline = balanceSeries.slice(0, Math.max(2, Math.ceil(balanceSeries.length / 4)));
  const netChangeSparkline = balanceSeries.slice(-Math.max(2, Math.ceil(balanceSeries.length / 3)));

  const totalIncome = data ? pointsSum(data.points, ["INCOME"]) : 0n;
  const totalExpenses = data ? pointsSum(data.points, ["EXPENSE"]) : 0n;
  const scheduledPayments = data ? pointsSum(data.points, ["SCHEDULED_PAYMENT", "LOAN_INSTALLMENT"]) : 0n;

  return (
    <div className="space-y-6">
      <MobileHeader title="Forecast" />
      <div className="hidden items-center justify-between md:flex">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Forecast</h1>
          <p className="text-sm text-slate-500">
            A projected cash position from your recurring income, expenses, scheduled payments, and loans.
          </p>
        </div>
        <div className="relative">
          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-48 appearance-none border-slate-200 py-2 pl-9 pr-9 font-medium shadow-sm"
          >
            {HORIZON_OPTIONS.map((opt) => (
              <option key={opt.days} value={opt.days}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="relative md:hidden">
        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full appearance-none border-slate-200 py-2 pl-9 pr-9 font-medium shadow-sm"
        >
          {HORIZON_OPTIONS.map((opt) => (
            <option key={opt.days} value={opt.days}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <SparkleIcon className="h-3.5 w-3.5" />
        </span>
        <p>
          This is an estimate based on what&apos;s scheduled today — it can&apos;t be guaranteed, and doesn&apos;t account
          for anything you haven&apos;t included yet.
        </p>
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
            <StatCard
              label="Today"
              value={formatMoney(data.startingBalanceMinor, currency)}
              icon={<CalendarIcon className="h-5 w-5" />}
              tone="violet"
              sparkline={todaySparkline}
              sparklineColor="#7c3aed"
            />
            <StatCard
              label={`Projected in ${data.horizonDays} days`}
              value={formatMoney(data.projectedEndingBalanceMinor, currency)}
              icon={<TrendUpIcon className="h-5 w-5" />}
              tone="emerald"
              sparkline={balanceSeries}
              sparklineColor="#059669"
            />
            <StatCard
              label="Net change"
              value={`${change >= 0n ? "+" : ""}${formatMoney(change.toString(), currency)}`}
              icon={change >= 0n ? <ArrowUpIcon className="h-5 w-5" /> : <ArrowDownIcon className="h-5 w-5" />}
              tone={change >= 0n ? "emerald" : "rose"}
              sparkline={netChangeSparkline}
              sparklineColor={change >= 0n ? "#059669" : "#e11d48"}
              valueClassName={change >= 0n ? "text-emerald-700" : "text-red-600"}
            />
          </div>

          {data.points.length === 0 ? (
            <EmptyState
              title="Nothing scheduled ahead"
              description="Add recurring income/expenses, scheduled payments, or a loan with a payment schedule to see a projection."
            />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-slate-100">
                {data.points.map((p, i) => {
                  const Icon = KIND_ICON[p.kind] ?? WalletIcon;
                  const tone = TONE_STYLES[KIND_TONE[p.kind] ?? "violet"];
                  return (
                    <li key={i} className="flex items-center gap-3 px-5 py-3">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tone.bg, tone.text)}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
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
                          Balance {formatMoney(p.projectedBalanceMinor, currency)}
                        </p>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card className="relative overflow-hidden">
            <div className="lg:pr-40">
              <h3 className="text-base font-semibold text-slate-900">Forecast breakdown</h3>
              <div className="mt-4 grid grid-cols-3 gap-6">
                <div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <ArrowDownIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm text-slate-500">Total income</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    {formatMoney(totalIncome.toString(), currency)}
                  </p>
                </div>
                <div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <ArrowUpIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm text-slate-500">Total expenses</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    {formatMoney(totalExpenses.toString(), currency)}
                  </p>
                </div>
                <div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <CalendarIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm text-slate-500">Scheduled payments</p>
                  <p className="text-base font-semibold tabular-nums text-slate-900">
                    {formatMoney(scheduledPayments.toString(), currency)}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-500">Projected cash position in {data.horizonDays} days</p>
                <p className="mt-1 text-3xl font-bold text-violet-600">
                  {formatMoney(data.projectedEndingBalanceMinor, currency)}
                </p>
              </div>
            </div>

            <ForecastIllustration className="pointer-events-none absolute -right-4 bottom-4 hidden h-36 w-36 lg:block" />
          </Card>

          <Card className="flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-violet-50 to-indigo-50 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <InfoIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">How this works</p>
                <p className="mt-1 text-sm text-slate-600">
                  We project your cash position using your recurring income, expenses, scheduled payments, and loan
                  repayments.
                </p>
                <p className="text-sm text-slate-500">
                  Actual results may vary based on changes you make or transactions not yet recorded.
                </p>
              </div>
            </div>
            <Button variant="secondary" className="shrink-0">
              Learn more
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
