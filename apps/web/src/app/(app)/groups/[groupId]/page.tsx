"use client";

import { use, useState, type FormEvent } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SplitEditor } from "@/components/finance/split-editor";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data: group, isLoading } = useGroup(groupId);
  const { data: expenses } = useGroupExpenses(groupId);
  const { data: groupBalances } = useGroupBalances(groupId);
  const { data: friends } = useFriendList();
  const addMember = useAddGroupMember(groupId);
  const removeMember = useRemoveGroupMember(groupId);
  const createExpense = useCreateGroupExpense(groupId);

  const [addMemberId, setAddMemberId] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [showOptimize, setShowOptimize] = useState(false);
  const { data: optimize, isLoading: optimizeLoading } = useGroupOptimize(showOptimize ? groupId : null);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [splitState, setSplitState] = useState(emptySplitState);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  if (isLoading || !group) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
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

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    setAddMemberError(null);
    try {
      await addMember.mutateAsync(addMemberId);
      setAddMemberId("");
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
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{group.name}</h1>
      </div>

      <Card>
        <CardTitle>Members</CardTitle>
        <ul className="mt-3 space-y-2">
          {group.members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-900">{m.displayName ?? m.usernameDisplay}</span>
                {m.role === "OWNER" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Owner</span>}
              </div>
              {m.role !== "OWNER" && (
                <button
                  type="button"
                  onClick={() => void removeMember.mutateAsync(m.userId)}
                  className="text-xs font-medium text-slate-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {nonMembers.length > 0 && (
          <form onSubmit={handleAddMember} className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-4">
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
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-500">Group expenses</h2>
        <Button size="sm" onClick={() => setShowExpenseForm((v) => !v)}>
          {showExpenseForm ? "Cancel" : "Add expense"}
        </Button>
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
                <Input id="group-expense-amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
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

      {!expenses || expenses.items.length === 0 ? (
        <EmptyState title="No expenses yet" description="Add the group's first shared expense above." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {expenses.items.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{e.merchant ?? "Expense"}</p>
                  <p className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-medium tabular-nums text-slate-900">{formatMoney(e.amountMinor, e.currency)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-500">Group balances</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowOptimize((v) => !v)}>
          {showOptimize ? "Hide" : "Suggest settlements"}
        </Button>
      </div>
      {groupBalances && groupBalances.items.some((row) => row.balances.length > 0) && (
        <Card>
          <ul className="space-y-1.5">
            {groupBalances.items
              .filter((row) => row.balances.length > 0)
              .map((row) => (
                <li key={row.user?.id} className="text-sm">
                  <span className="font-medium text-slate-900">{row.user?.displayName ?? row.user?.usernameDisplay}</span>{" "}
                  {row.balances.map((b) => (
                    <span key={b.currency} className={BigInt(b.netMinor) > 0n ? "text-emerald-700" : "text-red-600"}>
                      {BigInt(b.netMinor) > 0n
                        ? `is owed ${formatMoney(b.netMinor, b.currency)}`
                        : `owes ${formatMoney(b.netMinor.replace("-", ""), b.currency)}`}
                    </span>
                  ))}
                </li>
              ))}
          </ul>
        </Card>
      )}
      {showOptimize && (
        <Card>
          {optimizeLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : !optimize || optimize.transfers.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody owes anybody in this group right now.</p>
          ) : (
            <ul className="space-y-2">
              {optimize.transfers.map((t, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <span className="font-medium">{t.from?.displayName ?? t.from?.usernameDisplay}</span> should pay{" "}
                  <span className="font-medium">{t.to?.displayName ?? t.to?.usernameDisplay}</span>{" "}
                  {formatMoney(t.amountMinor, optimize.currency)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
