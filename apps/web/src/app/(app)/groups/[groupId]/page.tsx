"use client";

import { use, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  useGroup,
  useGroupExpenses,
  useGroupBalances,
  useAddGroupMember,
  useRemoveGroupMember,
  useCreateGroupExpense,
} from "@/lib/hooks/use-groups";
import { useGroupOptimize } from "@/lib/hooks/use-balances";
import { useFriendList } from "@/lib/hooks/use-friends";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { ApiError } from "@/lib/api-client";
import { emptySplitState, splitStateToRequestFields } from "@/lib/split";
import { paletteForKey } from "@/lib/category-palette";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SummaryCard } from "@/components/ui/summary-card";
import { SplitEditor } from "@/components/finance/split-editor";
import { UsersIcon } from "@/components/groups/icons";
import { WalletIcon, ArrowDownIcon, ArrowUpIcon, PlusIcon, CalendarIcon, ChevronRightIcon } from "@/components/dashboard/icons";

const ROW_TONES = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function Avatar({ name, colorKey }: { name: string; colorKey: string }) {
  const palette = paletteForKey(colorKey);
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", palette.chip)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data: group, isLoading, isError } = useGroup(groupId);
  const { data: expenses } = useGroupExpenses(groupId);
  const { data: groupBalances } = useGroupBalances(groupId);
  const { data: friends } = useFriendList();
  const addMember = useAddGroupMember(groupId);
  const removeMember = useRemoveGroupMember(groupId);
  const createExpense = useCreateGroupExpense(groupId);

  const [addMemberId, setAddMemberId] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);
  const { data: optimize, isLoading: optimizeLoading } = useGroupOptimize(showOptimize ? groupId : null);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [splitState, setSplitState] = useState(emptySplitState);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const totals = useMemo(() => {
    let owedMinor = 0;
    let oweMinor = 0;
    for (const row of groupBalances?.items ?? []) {
      for (const b of row.balances) {
        const net = Number(b.netMinor);
        if (net > 0) owedMinor += net;
        else oweMinor += -net;
      }
    }
    const totalExpensesMinor = (expenses?.items ?? []).reduce((sum, e) => sum + Number(e.amountMinor), 0);
    return { owedMinor, oweMinor, totalExpensesMinor };
  }, [groupBalances, expenses]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="space-y-4">
        <Link href="/groups" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Back to groups
        </Link>
        <EmptyState title="Group not found" description="This group doesn't exist, or you're not a member of it." />
      </div>
    );
  }

  const nonMembers = friends?.items.filter((f) => !group.members.some((m) => m.userId === f.user.id)) ?? [];
  const memberPeople = group.members.map((m) => ({
    id: m.userId,
    username: m.username,
    usernameDisplay: m.usernameDisplay,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
  }));
  const palette = paletteForKey(group.id);

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    setAddMemberError(null);
    try {
      await addMember.mutateAsync(addMemberId);
      setAddMemberId("");
      setShowAddMember(false);
    } catch (err) {
      setAddMemberError(err instanceof ApiError ? err.message : "Couldn't add that member.");
    }
  }

  async function handleExpenseSubmit(e: FormEvent) {
    e.preventDefault();
    setExpenseError(null);
    if (splitState.participantIds.length === 0) {
      setExpenseError("Pick at least one member to split this with.");
      return;
    }
    try {
      await createExpense.mutateAsync({
        amountMinor: toMinorUnits(amount),
        currency,
        merchant,
        date: new Date(date),
        ...splitStateToRequestFields(splitState),
      });
      setMerchant("");
      setAmount("");
      setSplitState(emptySplitState());
      setShowExpenseForm(false);
    } catch (err) {
      setExpenseError(err instanceof ApiError ? err.message : "Couldn't add that expense.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/groups" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Back to groups
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", palette.chip)}>
              <UsersIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">{group.name}</h1>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {group.members.length} member{group.members.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarIcon className="h-3.5 w-3.5" />
                Created {new Date(group.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowExpenseForm((v) => !v)} className="shrink-0 rounded-xl">
            {showExpenseForm ? (
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total expenses"
          value={formatMoney(String(totals.totalExpensesMinor), currency)}
          icon={<WalletIcon className="h-5 w-5" />}
          tone="violet"
          subtext={`${expenses?.items.length ?? 0} expense${expenses?.items.length === 1 ? "" : "s"}`}
        />
        <SummaryCard
          label="You are owed"
          value={formatMoney(String(totals.owedMinor), currency)}
          icon={<ArrowUpIcon className="h-5 w-5" />}
          tone="emerald"
          valueClassName="text-emerald-600"
        />
        <SummaryCard
          label="You owe"
          value={formatMoney(String(totals.oweMinor), currency)}
          icon={<ArrowDownIcon className="h-5 w-5" />}
          tone="rose"
          valueClassName="text-rose-600"
        />
        <SummaryCard
          label="Members"
          value={String(group.members.length)}
          icon={<UsersIcon className="h-5 w-5" />}
          tone="sky"
          subtext="In this group"
        />
      </div>

      {showExpenseForm && (
        <Card>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="group-expense-merchant">What for</Label>
                <Input id="group-expense-merchant" required value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="group-expense-amount">Amount ({currency})</Label>
                <Input
                  id="group-expense-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="group-expense-date">Date</Label>
                <Input id="group-expense-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <SplitEditor people={memberPeople} currency={currency} value={splitState} onChange={setSplitState} />
            <div>
              <ErrorText>{expenseError}</ErrorText>
              <Button type="submit" isLoading={createExpense.isPending}>
                Save expense
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">Members</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setShowAddMember((v) => !v)}>
            {showAddMember ? "Cancel" : "Add member"}
          </Button>
        </div>
        <ul className="divide-y divide-slate-100">
          {group.members.map((m) => {
            const name = m.displayName ?? m.usernameDisplay;
            return (
              <li key={m.userId} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={name} colorKey={m.userId} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.userId === user?.id ? "You" : name}
                    </p>
                    <p className="truncate text-xs text-slate-500">@{m.usernameDisplay}</p>
                  </div>
                </div>
                {m.role === "OWNER" ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Owner</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void removeMember.mutateAsync(m.userId)}
                    className="shrink-0 text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {showAddMember && (
          <div className="border-t border-slate-100 p-5">
            {nonMembers.length === 0 ? (
              <p className="text-sm text-slate-500">All your friends are already in this group.</p>
            ) : (
              <form onSubmit={handleAddMember} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="add-member">Add a friend</Label>
                  <Select id="add-member" required value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)}>
                    <option value="">Select a friend</option>
                    {nonMembers.map((f) => (
                      <option key={f.user.id} value={f.user.id}>
                        {f.user.displayName ?? f.user.usernameDisplay}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" size="sm" isLoading={addMember.isPending}>
                  Add
                </Button>
              </form>
            )}
            <ErrorText>{addMemberError}</ErrorText>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">Group expenses</CardTitle>
        </div>
        {!expenses || expenses.items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No expenses yet" description="Add the group's first shared expense above." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expenses.items.map((e, i) => {
              const tone = ROW_TONES[i % ROW_TONES.length];
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tone.bg, tone.text)}>
                      <WalletIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{e.merchant ?? "Expense"}</p>
                      <p className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                    {formatMoney(e.amountMinor, e.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">Group balances</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setShowOptimize((v) => !v)}>
            {showOptimize ? "Hide" : "Suggest settlements"}
          </Button>
        </div>

        {!groupBalances || !groupBalances.items.some((row) => row.balances.length > 0) ? (
          <div className="p-5">
            <EmptyState title="All settled up" description="Nobody owes anybody in this group right now." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {groupBalances.items
              .filter((row) => row.balances.length > 0)
              .map((row) => {
                const name = row.user?.displayName ?? row.user?.usernameDisplay ?? "Unknown";
                return (
                  <li key={row.user?.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={name} colorKey={row.user?.id ?? name} />
                      <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {row.balances.map((b) => (
                        <p
                          key={b.currency}
                          className={cn("text-sm font-semibold tabular-nums", BigInt(b.netMinor) > 0n ? "text-emerald-700" : "text-rose-700")}
                        >
                          {BigInt(b.netMinor) > 0n
                            ? `Owed ${formatMoney(b.netMinor, b.currency)}`
                            : `Owes ${formatMoney(b.netMinor.replace("-", ""), b.currency)}`}
                        </p>
                      ))}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}

        {showOptimize && (
          <div className="border-t border-slate-100 p-5">
            {optimizeLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : !optimize || optimize.transfers.length === 0 ? (
              <p className="text-sm text-slate-500">Nobody owes anybody in this group right now.</p>
            ) : (
              <ul className="space-y-2">
                {optimize.transfers.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{t.from?.displayName ?? t.from?.usernameDisplay}</span>
                    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-900">{t.to?.displayName ?? t.to?.usernameDisplay}</span>
                    <span className="ml-auto shrink-0 font-semibold tabular-nums text-indigo-600">
                      {formatMoney(t.amountMinor, optimize.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
