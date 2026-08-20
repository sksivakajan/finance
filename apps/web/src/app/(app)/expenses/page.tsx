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
import { Spinner } from "@/components/ui/spinner";
import { SplitEditor } from "@/components/finance/split-editor";
import { ExpenseStatCard } from "@/components/expenses/stat-card";
import { MobileHeader } from "@/components/layout/mobile-header";
import { categoryEmoji } from "@/lib/category-icon";
import {
  WalletIcon,
  ArrowDownIcon,
  PieChartIcon,
  CalendarIcon,
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/dashboard/icons";

const ROW_TONES = ["bg-violet-100", "bg-emerald-100", "bg-amber-100", "bg-sky-100", "bg-rose-100"];

function TrackSpendingIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2" fill="#f9a8d4" />
      <circle cx="53" cy="9" r="1.5" fill="#fcd34d" />
      <circle cx="9" cy="46" r="1.5" fill="#93c5fd" />
      <circle cx="55" cy="49" r="2" fill="#f9a8d4" />
      <circle cx="49" cy="22" r="1.5" fill="#86efac" />
      <rect x="14" y="20" width="36" height="28" rx="7" fill="#ede9fe" />
      <rect x="14" y="20" width="36" height="12" rx="7" fill="#c4b5fd" />
      <rect x="24" y="31" width="16" height="4" rx="2" fill="#a78bfa" />
    </svg>
  );
}

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
  const [search, setSearch] = useState("");

  const isEditing = editingId !== null;
  const isSaving = createExpense.isPending || updateExpense.isPending;

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((expense) => {
      const categoryName = categories?.find((c) => c.id === expense.categoryId)?.name ?? "";
      return (expense.merchant ?? "").toLowerCase().includes(q) || categoryName.toLowerCase().includes(q);
    });
  }, [data, search, categories]);

  const stats = useMemo(() => {
    if (!data || data.items.length === 0) return null;
    const items = data.items;
    const totalMinor = items.reduce((sum, e) => sum + Number(e.amountMinor), 0);
    const now = new Date();
    const monthItems = items.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const monthMinor = monthItems.reduce((sum, e) => sum + Number(e.amountMinor), 0);
    const avgMinor = Math.round(totalMinor / items.length);
    const largest = items.reduce((max, e) => (Number(e.amountMinor) > Number(max.amountMinor) ? e : max), items[0]);
    return {
      totalMinor,
      count: items.length,
      monthMinor,
      monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      avgMinor,
      largest,
      largestLabel: largest.merchant ?? "Expense",
    };
  }, [data]);

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
      <MobileHeader
        title="Expenses"
        right={
          <button
            type="button"
            onClick={() => (showForm ? closeForm() : openCreateForm())}
            aria-label={showForm ? "Cancel" : "Add expense"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <PlusIcon className={cn("h-5 w-5 transition-transform", showForm && "rotate-45")} />
          </button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:hidden">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Everything you&apos;ve spent.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-64"
            />
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FilterIcon className="h-4 w-4" />
            Filter
            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <Button onClick={() => (showForm ? closeForm() : openCreateForm())} className="shrink-0 rounded-xl">
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                Add expense
              </>
            )}
          </Button>
        </div>
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
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ExpenseStatCard
                label="Total expenses"
                value={`-${formatMoney(String(stats.totalMinor), currency)}`}
                sublabel={`${stats.count} transaction${stats.count === 1 ? "" : "s"}`}
                icon={<WalletIcon className="h-5 w-5" />}
                tone="violet"
              />
              <ExpenseStatCard
                label="This month"
                value={`-${formatMoney(String(stats.monthMinor), currency)}`}
                sublabel={stats.monthLabel}
                icon={<ArrowDownIcon className="h-5 w-5" />}
                tone="emerald"
              />
              <ExpenseStatCard
                label="Average expense"
                value={`-${formatMoney(String(stats.avgMinor), currency)}`}
                sublabel="Per transaction"
                icon={<PieChartIcon className="h-5 w-5" />}
                tone="amber"
              />
              <ExpenseStatCard
                label="Largest expense"
                value={`-${formatMoney(stats.largest.amountMinor, stats.largest.currency)}`}
                sublabel={stats.largestLabel}
                icon={<CalendarIcon className="h-5 w-5" />}
                tone="sky"
              />
            </div>
          )}

          <Card className="overflow-hidden p-0">
            {filteredItems.length > 0 ? (
              <>
                <div className="hidden grid-cols-[1fr_140px_160px_110px] gap-4 border-b border-slate-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid">
                  <span>Expense</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Actions</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {filteredItems.map((expense, i) => {
                    const category = categories?.find((c) => c.id === expense.categoryId);
                    const subtitle =
                      expense.splitMethod !== "NONE" ? "Split" : expense.attachmentUrl ? "Receipt attached" : (category?.name ?? null);
                    return (
                      <li
                        key={expense.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[1fr_140px_160px_110px]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
                              ROW_TONES[i % ROW_TONES.length],
                            )}
                            aria-hidden="true"
                          >
                            {categoryEmoji(category?.icon ?? null)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{expense.merchant ?? "Expense"}</p>
                            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
                          </div>
                        </div>
                        <div className="hidden items-center gap-1.5 text-sm text-slate-500 sm:flex">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(expense.date).toLocaleDateString()}
                        </div>
                        <div className="text-right text-sm font-semibold tabular-nums text-rose-600">
                          -{formatMoney(expense.amountMinor, expense.currency)}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(expense)}
                            aria-label={`Edit expense at ${expense.merchant ?? "merchant"}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeExpense.mutateAsync(expense.id)}
                            aria-label={`Delete expense at ${expense.merchant ?? "merchant"}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <TrackSpendingIllustration />
                <p className="text-sm font-semibold text-slate-900">Track your spending</p>
                <p className="max-w-sm text-sm text-slate-500">Add expenses to see insights and manage your money better.</p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
