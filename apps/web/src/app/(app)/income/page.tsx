"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useIncomeList, useCreateIncome, useRemoveIncome } from "@/lib/hooks/use-income";
import { useCategories } from "@/lib/hooks/use-categories";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

export default function IncomePage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data, isLoading } = useIncomeList();
  const { data: categories } = useCategories("INCOME");
  const createIncome = useCreateIncome();
  const removeIncome = useRemoveIncome();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createIncome.mutateAsync({
        amountMinor: toMinorUnits(amount),
        currency,
        source,
        categoryId: categoryId || undefined,
        date: new Date(date),
      });
      setAmount("");
      setSource("");
      setCategoryId("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Income</h1>
          <p className="text-sm text-slate-500">Everything you&apos;ve recorded coming in.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Add income"}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="source">Source</Label>
              <Input id="source" required value={source} onChange={(e) => setSource(e.target.value)} />
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
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit" isLoading={createIncome.isPending}>
                Save income
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
        <EmptyState title="No income yet" description="Record your first income to start tracking what comes in." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {data.items.map((income) => (
              <li key={income.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{income.source}</p>
                  <p className="text-xs text-slate-500">{new Date(income.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums text-emerald-700">
                    +{formatMoney(income.amountMinor, income.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeIncome.mutateAsync(income.id)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                    aria-label={`Delete income from ${income.source}`}
                  >
                    Delete
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
