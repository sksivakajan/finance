"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLoanList, useCreateLoan, useAddLoanPayment } from "@/lib/hooks/use-loans";
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
import type { LoanRecord } from "@/lib/types";

const STATUS_STYLES: Record<LoanRecord["status"], string> = {
  ACTIVE: "bg-slate-100 text-slate-700",
  PAID_OFF: "bg-emerald-100 text-emerald-800",
  DEFAULTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-slate-100 text-slate-400",
};

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
    return <p className="mt-3 text-xs text-slate-500">No payment schedule set for this loan.</p>;
  }
  return (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
      <p className="text-xs text-amber-700">Estimate — assumes every installment lands on schedule.</p>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
        {data.points.map((p, i) => (
          <li key={i} className="flex justify-between text-slate-600">
            <span>{new Date(p.date).toLocaleDateString()}</span>
            <span className="tabular-nums">{formatMoney(p.remainingMinor, currency)} remaining</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoanCard({ loan, currency }: { loan: LoanRecord; currency: string }) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPayoff, setShowPayoff] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const addPayment = useAddLoanPayment();

  const progressPct =
    BigInt(loan.principalMinor) > 0n
      ? Number((BigInt(loan.paidMinor) * 100n) / BigInt(loan.principalMinor))
      : 0;

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
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900">{loan.counterpartyName}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[loan.status])}>
              {loan.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-slate-500">{loan.direction === "I_OWE" ? "You owe" : "Owed to you"}</p>
        </div>
        {loan.status === "ACTIVE" && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowPayoff((v) => !v)}>
              {showPayoff ? "Hide payoff" : "Payoff schedule"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowPaymentForm((v) => !v)}>
              {showPaymentForm ? "Cancel" : "Record payment"}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Principal</p>
          <p className="font-medium tabular-nums text-slate-900">{formatMoney(loan.principalMinor, loan.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Paid</p>
          <p className="font-medium tabular-nums text-emerald-700">{formatMoney(loan.paidMinor, loan.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Remaining</p>
          <p className="font-medium tabular-nums text-slate-900">{formatMoney(loan.remainingMinor, loan.currency)}</p>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(progressPct, 100)}%` }} />
      </div>

      {showPayoff && <PayoffSchedule loanId={loan.id} currency={loan.currency} />}

      {showPaymentForm && (
        <form onSubmit={handleAddPayment} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
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
    </Card>
  );
}

export default function LoansPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data, isLoading } = useLoanList();
  const createLoan = useCreateLoan();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Loans</h1>
          <p className="text-sm text-slate-500">Money you owe, and money owed to you.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Add loan"}</Button>
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
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasSchedule}
                  onChange={(e) => setHasSchedule(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
        <div className="space-y-4">
          {data.map((loan) => (
            <LoanCard key={loan.id} loan={loan} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
