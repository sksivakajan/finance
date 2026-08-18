"use client";

import { useState, type FormEvent } from "react";
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
import type { ScheduledPaymentRecord } from "@/lib/types";

const STATUS_STYLES: Record<ScheduledPaymentRecord["status"], string> = {
  UPCOMING: "bg-slate-100 text-slate-700",
  DUE: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-slate-100 text-slate-400",
};

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Scheduled payments</h1>
          <p className="text-sm text-slate-500">Bills and payments you know are coming.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Add payment"}</Button>
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
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {data.items.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{payment.name}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[payment.status])}>
                      {payment.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Due {new Date(payment.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums text-slate-900">
                    {formatMoney(payment.amountMinor, payment.currency)}
                  </span>
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
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                    aria-label={`Cancel ${payment.name}`}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
