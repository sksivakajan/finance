"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useExpenseList, useCreateExpense, useUpdateExpense, useRemoveExpense } from "@/lib/hooks/use-expenses";
import { useCategories } from "@/lib/hooks/use-categories";
import { useFriendList } from "@/lib/hooks/use-friends";
import { formatMoney, toMinorUnits, fromMinorUnits } from "@/lib/money";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { emptySplitState, splitStateToRequestFields } from "@/lib/split";
import type { ExpenseRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SplitEditor } from "@/components/finance/split-editor";

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf";
const RECENT_MERCHANT_LIMIT = 6;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return { amount: "", merchant: "", categoryId: "", date: todayIsoDate(), attachmentUrl: "" };
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data, isLoading } = useExpenseList();
  const { data: categories } = useCategories("EXPENSE");
  const { data: friends } = useFriendList();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const removeExpense = useRemoveExpense();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitState, setSplitState] = useState(emptySplitState);

  const isEditing = editingId !== null;
  const isSaving = createExpense.isPending || updateExpense.isPending;

  // Quick-pick shortcuts for faster daily entry: the merchants a user
  // actually uses, most-recent-first, deduplicated.
  const recentMerchants = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const merchants: string[] = [];
    for (const expense of data.items) {
      if (!expense.merchant || seen.has(expense.merchant)) continue;
      seen.add(expense.merchant);
      merchants.push(expense.merchant);
      if (merchants.length >= RECENT_MERCHANT_LIMIT) break;
    }
    return merchants;
  }, [data]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setUploadError(null);
    setIsSplitting(false);
    setSplitState(emptySplitState());
    setShowForm(true);
  }

  function openEditForm(expense: ExpenseRecord) {
    setEditingId(expense.id);
    setForm({
      amount: fromMinorUnits(expense.amountMinor),
      merchant: expense.merchant ?? "",
      categoryId: expense.categoryId ?? "",
      date: expense.date.slice(0, 10),
      attachmentUrl: expense.attachmentUrl ?? "",
    });
    setError(null);
    setUploadError(null);
    // Editing an already-shared expense's split isn't supported from this
    // simple form yet -- only new personal-or-shared expenses can pick a
    // split here. Existing splits stay as they are on edit.
    setIsSplitting(false);
    setSplitState(emptySplitState());
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setIsSplitting(false);
    setSplitState(emptySplitState());
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const { url } = await api.uploadFile(file);
      setForm((f) => ({ ...f, attachmentUrl: url }));
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Couldn't upload that file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (isSplitting && splitState.participantIds.length === 0) {
      setError("Pick at least one person to split this expense with.");
      return;
    }
    const input = {
      amountMinor: toMinorUnits(form.amount),
      currency,
      merchant: form.merchant,
      categoryId: form.categoryId || undefined,
      date: new Date(form.date),
      attachmentUrl: form.attachmentUrl || undefined,
      ...(isSplitting ? splitStateToRequestFields(splitState) : {}),
    };
    try {
      if (editingId) {
        await updateExpense.mutateAsync({ id: editingId, input });
      } else {
        await createExpense.mutateAsync(input);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Everything you&apos;ve spent.</p>
        </div>
        <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
          {showForm ? "Cancel" : "Add expense"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="merchant">Merchant</Label>
              <Input
                id="merchant"
                required
                value={form.merchant}
                onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
              />
              {recentMerchants.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {recentMerchants.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, merchant: m }))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        form.merchant === m
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
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
              <Select
                id="category"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">None</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {categories && categories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {categories.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, categoryId: c.id }))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        form.categoryId === c.id
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, date: todayIsoDate() }))}
                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                Use today
              </button>
            </div>
            {!isEditing && friends && friends.items.length > 0 && (
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isSplitting}
                    onChange={(e) => setIsSplitting(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Split this expense with friends
                </label>
                {isSplitting && (
                  <div className="mt-2">
                    <SplitEditor
                      people={friends.items.map((f) => f.user)}
                      currency={currency}
                      value={splitState}
                      onChange={setSplitState}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="receipt">Receipt (optional)</Label>
              <input
                ref={fileInputRef}
                id="receipt"
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => void handleFileChange(e)}
                disabled={isUploading}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WEBP, HEIC, or PDF. Up to 5MB.</p>
              {isUploading && (
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <Spinner className="h-3.5 w-3.5" /> Uploading…
                </p>
              )}
              {form.attachmentUrl && !isUploading && (
                <p className="mt-1 flex items-center gap-2 text-xs text-emerald-700">
                  Receipt attached.
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, attachmentUrl: "" }))}
                    className="font-medium text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </p>
              )}
              <ErrorText>{uploadError}</ErrorText>
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit" isLoading={isSaving} disabled={isUploading}>
                {isEditing ? "Update expense" : "Save expense"}
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
        <EmptyState title="No expenses yet" description="Start tracking your spending to understand where your money goes." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {data.items.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{expense.merchant ?? "Expense"}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(expense.date).toLocaleDateString()}
                    {expense.attachmentUrl ? " · Receipt attached" : ""}
                    {expense.splitMethod !== "NONE" ? " · Split" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums text-slate-900">
                    -{formatMoney(expense.amountMinor, expense.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditForm(expense)}
                    className="text-xs font-medium text-slate-400 hover:text-indigo-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeExpense.mutateAsync(expense.id)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                    aria-label={`Delete expense at ${expense.merchant ?? "merchant"}`}
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
