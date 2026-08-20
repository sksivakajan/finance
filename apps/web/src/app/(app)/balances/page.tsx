"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useBalances, useCreateSettlement } from "@/lib/hooks/use-balances";
import {
  useMoneyRequests,
  useCreateMoneyRequest,
  usePayMoneyRequest,
  useDeclineMoneyRequest,
  useCancelMoneyRequest,
} from "@/lib/hooks/use-money-requests";
import { useFriendList } from "@/lib/hooks/use-friends";
import { useAuth } from "@/lib/auth-context";
import { formatMoney, toMinorUnits, fromMinorUnits } from "@/lib/money";
import { ApiError } from "@/lib/api-client";
import type { FriendBalance, MoneyRequestRecord } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { MobileHeader } from "@/components/layout/mobile-header";
import {
  SendIcon,
  BanknoteIcon,
  UsersIcon,
  CheckCircleIcon,
  MoreVerticalIcon,
  TrendUpIcon,
  TrendDownIcon,
} from "@/components/dashboard/icons";

function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

// Purely decorative -- matches the small illustrations used elsewhere in the
// app (e.g. the expenses empty state) rather than pulling in an icon library.
function AllSettledIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="10" y="20" width="38" height="28" rx="7" fill="#ede9fe" />
      <rect x="10" y="20" width="38" height="12" rx="7" fill="#c4b5fd" />
      <circle cx="29" cy="33" r="2" fill="#7c3aed" />
      <circle cx="24" cy="33" r="2" fill="#7c3aed" />
      <path d="M23 39q5 4 10 0" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="42" r="10" fill="#d1fae5" />
      <path d="m45.5 42 3 3 6-6.5" stroke="#059669" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettleForm({
  row,
  currency,
  onDone,
}: {
  row: FriendBalance;
  currency: string;
  onDone: () => void;
}) {
  const createSettlement = useCreateSettlement();
  const primary = row.balances[0];
  const owesYou = primary ? BigInt(primary.netMinor) > 0n : false;
  const [amount, setAmount] = useState(primary ? fromMinorUnits(primary.netMinor.replace("-", "")) : "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!row.user) return;
    setError(null);
    try {
      await createSettlement.mutateAsync({
        counterpartyId: row.user.id,
        direction: owesYou ? "THEY_PAID" : "I_PAID",
        amountMinor: toMinorUnits(amount),
        currency: primary?.currency ?? currency,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't record that settlement.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
      <div>
        <Label htmlFor={`settle-amount-${row.user?.id}`}>
          {owesYou ? "Mark as paid to you" : "Amount you paid"} ({primary?.currency ?? currency})
        </Label>
        <Input
          id={`settle-amount-${row.user?.id}`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
      </div>
      <Button type="submit" size="sm" isLoading={createSettlement.isPending}>
        Record settlement
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}

function requestPersonName(
  request: MoneyRequestRecord,
  side: "sender" | "receiver",
  nameById: Map<string, string>,
): string {
  const id = side === "sender" ? request.senderId : request.receiverId;
  return nameById.get(id) ?? request.reason;
}

export default function BalancesPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { data: balances, isLoading } = useBalances();
  const { data: incoming } = useMoneyRequests("incoming");
  const { data: outgoing } = useMoneyRequests("outgoing");
  const { data: friends } = useFriendList();
  const payRequest = usePayMoneyRequest();
  const declineRequest = useDeclineMoneyRequest();
  const cancelRequest = useCancelMoneyRequest();
  const createRequest = useCreateMoneyRequest();
  const quickSettle = useCreateSettlement();

  const [settlingWith, setSettlingWith] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFriendId, setRequestFriendId] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);

  const friendNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of friends?.items ?? []) {
      map.set(f.user.id, f.user.displayName ?? f.user.usernameDisplay);
    }
    return map;
  }, [friends]);

  const outgoingTotalMinor = useMemo(
    () => (outgoing?.items ?? []).reduce((sum, r) => sum + Number(r.amountMinor), 0),
    [outgoing],
  );
  const incomingTotalMinor = useMemo(
    () => (incoming?.items ?? []).reduce((sum, r) => sum + Number(r.amountMinor), 0),
    [incoming],
  );

  const friendsTotals = useMemo(() => {
    const items = balances?.items ?? [];
    let owedToYou = 0;
    let youOwe = 0;
    let owedByCount = 0;
    let owingCount = 0;
    let settledCount = 0;
    for (const row of items) {
      const net = row.balances.reduce((sum, b) => sum + Number(b.netMinor), 0);
      if (net > 0) {
        owedToYou += net;
        owedByCount += 1;
      } else if (net < 0) {
        youOwe += -net;
        owingCount += 1;
      } else {
        settledCount += 1;
      }
    }
    return { owedToYou, youOwe, owedByCount, owingCount, settledCount, net: owedToYou - youOwe };
  }, [balances]);

  async function handleMarkPaid(row: FriendBalance) {
    const primary = row.balances[0];
    if (!row.user || !primary) return;
    setMarkingPaidId(row.user.id);
    try {
      await quickSettle.mutateAsync({
        counterpartyId: row.user.id,
        direction: BigInt(primary.netMinor) > 0n ? "THEY_PAID" : "I_PAID",
        amountMinor: primary.netMinor.replace("-", ""),
        currency: primary.currency,
      });
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function handleRequestSubmit(e: FormEvent) {
    e.preventDefault();
    setRequestError(null);
    try {
      await createRequest.mutateAsync({
        receiverId: requestFriendId,
        amountMinor: toMinorUnits(requestAmount),
        currency,
        reason: requestReason,
      });
      setRequestFriendId("");
      setRequestAmount("");
      setRequestReason("");
      setShowRequestForm(false);
    } catch (err) {
      setRequestError(err instanceof ApiError ? err.message : "Couldn't send that request.");
    }
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Balances"
        right={
          <button
            type="button"
            onClick={() => setShowRequestForm((v) => !v)}
            aria-label={showRequestForm ? "Cancel" : "Request money"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        }
      />
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Balances</h1>
          <p className="text-sm text-slate-500">Who owes whom, from shared expenses and settlements.</p>
        </div>
        <Button onClick={() => setShowRequestForm((v) => !v)} className="shrink-0 rounded-xl">
          {showRequestForm ? (
            "Cancel"
          ) : (
            <>
              <SendIcon className="h-4 w-4" />
              Request money
            </>
          )}
        </Button>
      </div>
      <Button onClick={() => setShowRequestForm((v) => !v)} className="w-full rounded-xl md:hidden">
        {showRequestForm ? "Cancel" : (
          <>
            <SendIcon className="h-4 w-4" />
            Request money
          </>
        )}
      </Button>

      {showRequestForm && (
        <Card>
          <form onSubmit={handleRequestSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="request-friend">From</Label>
              <Select
                id="request-friend"
                required
                value={requestFriendId}
                onChange={(e) => setRequestFriendId(e.target.value)}
              >
                <option value="">Select a friend</option>
                {friends?.items.map((f) => (
                  <option key={f.user.id} value={f.user.id}>
                    {f.user.displayName ?? f.user.usernameDisplay}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="request-amount">Amount ({currency})</Label>
              <Input
                id="request-amount"
                inputMode="decimal"
                placeholder="0.00"
                required
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="request-reason">Reason</Label>
              <Input
                id="request-reason"
                required
                placeholder="e.g. Dinner on Friday"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{requestError}</ErrorText>
              <Button type="submit" isLoading={createRequest.isPending}>
                Send request
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
          <Card className="overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">You are owed</CardTitle>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    {outgoing?.items.length ?? 0}
                  </span>
                </div>
                <p className="text-sm text-slate-500">People who owe you money.</p>
              </div>
            </div>

            {!outgoing || outgoing.items.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  title="Nothing pending"
                  description="Money you request from friends will show up here until they pay."
                />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {outgoing.items.map((req) => (
                    <li key={req.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                          <BanknoteIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatMoney(req.amountMinor, req.currency)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {requestPersonName(req, "receiver", friendNameById)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0 border-violet-200 text-violet-700 hover:bg-violet-50"
                        isLoading={cancelRequest.isPending}
                        onClick={() => void cancelRequest.mutateAsync(req.id)}
                      >
                        Cancel
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <BanknoteIcon className="h-4 w-4 text-violet-600" />
                    Total you are owed
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-700">
                    {formatMoney(String(outgoingTotalMinor), currency)}
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">You owe</CardTitle>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    {incoming?.items.length ?? 0}
                  </span>
                </div>
                <p className="text-sm text-slate-500">People you owe money to.</p>
              </div>
            </div>

            {!incoming || incoming.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 px-6 pb-8 text-center">
                <AllSettledIllustration />
                <p className="mt-1 text-sm font-semibold text-slate-900">Great! You don&apos;t owe anyone right now.</p>
                <p className="text-sm text-slate-500">
                  All settled up! <span aria-hidden="true">🎉</span>
                </p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {incoming.items.map((req) => (
                    <li key={req.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                          <BanknoteIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatMoney(req.amountMinor, req.currency)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {requestPersonName(req, "sender", friendNameById)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" isLoading={payRequest.isPending} onClick={() => void payRequest.mutateAsync(req.id)}>
                          Pay
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={declineRequest.isPending}
                          onClick={() => void declineRequest.mutateAsync(req.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <BanknoteIcon className="h-4 w-4 text-rose-600" />
                    Total you owe
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-rose-700">
                    {formatMoney(String(incomingTotalMinor), currency)}
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-start justify-between gap-3 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">With your friends</CardTitle>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {balances?.items.length ?? 0}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Split expenses and shared bills.</p>
              </div>
            </div>

            {!balances || balances.items.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  title="All settled up"
                  description="Split an expense with a friend and the balance will show up here."
                />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {balances.items.map((row) => {
                    const name = row.user?.displayName ?? row.user?.usernameDisplay ?? "Unknown";
                    const primary = row.balances[0];
                    const owesYou = primary ? BigInt(primary.netMinor) > 0n : false;
                    return (
                      <li key={row.user?.id} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar label={name} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                              {row.balances.map((b) => (
                                <p
                                  key={b.currency}
                                  className={cn(
                                    "text-xs font-medium",
                                    BigInt(b.netMinor) > 0n ? "text-emerald-700" : "text-red-600",
                                  )}
                                >
                                  {BigInt(b.netMinor) > 0n
                                    ? `Owes you ${formatMoney(b.netMinor, b.currency)}`
                                    : `You owe ${formatMoney(b.netMinor.replace("-", ""), b.currency)}`}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="border-violet-200 text-violet-700 hover:bg-violet-50"
                              isLoading={quickSettle.isPending && markingPaidId === row.user?.id}
                              onClick={() => void handleMarkPaid(row)}
                            >
                              {owesYou ? "Mark paid" : "Settle up"}
                            </Button>
                            <button
                              type="button"
                              aria-label="More settlement options"
                              onClick={() =>
                                setSettlingWith(settlingWith === row.user?.id ? null : (row.user?.id ?? null))
                              }
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {settlingWith === row.user?.id && (
                          <SettleForm row={row} currency={currency} onDone={() => setSettlingWith(null)} />
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <UsersIcon className="h-4 w-4 text-slate-500" />
                    Total from friends
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      friendsTotals.net >= 0 ? "text-emerald-700" : "text-rose-700",
                    )}
                  >
                    {formatMoney(String(Math.abs(friendsTotals.net)), currency)}
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card className="grid grid-cols-1 gap-0 divide-y divide-slate-100 p-0 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <TrendUpIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">You are owed</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {formatMoney(String(friendsTotals.owedToYou), currency)}
                </p>
                <p className="text-xs text-slate-400">
                  {friendsTotals.owedByCount} {friendsTotals.owedByCount === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <TrendDownIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">You owe</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">
                  {formatMoney(String(friendsTotals.youOwe), currency)}
                </p>
                <p className="text-xs text-slate-400">
                  {friendsTotals.owingCount} {friendsTotals.owingCount === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <UsersIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Net balance</p>
                <p
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    friendsTotals.net > 0 ? "text-emerald-700" : friendsTotals.net < 0 ? "text-rose-700" : "text-slate-900",
                  )}
                >
                  {friendsTotals.net > 0 ? "+" : friendsTotals.net < 0 ? "-" : ""}
                  {formatMoney(String(Math.abs(friendsTotals.net)), currency)}
                </p>
                <p className="text-xs text-slate-400">
                  {friendsTotals.net > 0 ? "You are ahead" : friendsTotals.net < 0 ? "You are behind" : "All settled"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Settled</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900">{friendsTotals.settledCount}</p>
                <p className="text-xs text-slate-400">
                  {friendsTotals.settledCount === 1 ? "friend" : "friends"} up to date
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
