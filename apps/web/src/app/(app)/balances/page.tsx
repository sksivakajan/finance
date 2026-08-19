"use client";

import { useState, type FormEvent } from "react";
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
import type { FriendBalance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {label.charAt(0).toUpperCase()}
    </span>
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

  const [settlingWith, setSettlingWith] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFriendId, setRequestFriendId] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Balances</h1>
          <p className="text-sm text-slate-500">Who owes whom, from shared expenses and settlements.</p>
        </div>
        <Button onClick={() => setShowRequestForm((v) => !v)}>{showRequestForm ? "Cancel" : "Request money"}</Button>
      </div>

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

      {incoming && incoming.items.length > 0 && (
        <Card>
          <CardTitle>Requests waiting on you</CardTitle>
          <ul className="mt-3 space-y-2">
            {incoming.items.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatMoney(req.amountMinor, req.currency)}</p>
                  <p className="text-xs text-slate-500">{req.reason}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => void payRequest.mutateAsync(req.id)}>
                    Pay
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void declineRequest.mutateAsync(req.id)}>
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {outgoing && outgoing.items.length > 0 && (
        <Card>
          <CardTitle>Requests you sent</CardTitle>
          <ul className="mt-3 space-y-2">
            {outgoing.items.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatMoney(req.amountMinor, req.currency)}</p>
                  <p className="text-xs text-slate-500">{req.reason}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void cancelRequest.mutateAsync(req.id)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0">
        <div className="p-5 pb-0">
          <CardTitle>With your friends</CardTitle>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !balances || balances.items.length === 0 ? (
          <div className="p-5 pt-3">
            <EmptyState
              title="All settled up"
              description="Split an expense with a friend and the balance will show up here."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {balances.items.map((row) => {
              const name = row.user?.displayName ?? row.user?.usernameDisplay ?? "Unknown";
              const primary = row.balances[0];
              const owesYou = primary ? BigInt(primary.netMinor) > 0n : false;
              return (
                <li key={row.user?.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar label={name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                        {row.balances.map((b) => (
                          <p
                            key={b.currency}
                            className={`text-xs font-medium ${BigInt(b.netMinor) > 0n ? "text-emerald-700" : "text-red-600"}`}
                          >
                            {BigInt(b.netMinor) > 0n
                              ? `Owes you ${formatMoney(b.netMinor, b.currency)}`
                              : `You owe ${formatMoney(b.netMinor.replace("-", ""), b.currency)}`}
                          </p>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSettlingWith(settlingWith === row.user?.id ? null : (row.user?.id ?? null))}
                    >
                      {owesYou ? "Mark paid" : "Settle up"}
                    </Button>
                  </div>
                  {settlingWith === row.user?.id && (
                    <SettleForm row={row} currency={currency} onDone={() => setSettlingWith(null)} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
