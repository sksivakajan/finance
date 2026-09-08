"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  useFriendList,
  useFriendRequests,
  useSearchUsers,
  useSendFriendRequest,
  useRespondToFriendRequest,
  useRemoveFriend,
  useBlockUser,
  useBlockedUsers,
  useUnblockUser,
} from "@/lib/hooks/use-friends";
import { useBalances } from "@/lib/hooks/use-balances";
import { useStartConversation } from "@/lib/hooks/use-chat";
import { ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { paletteForKey } from "@/lib/category-palette";
import { cn } from "@/lib/cn";
import type { Friend, FriendUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SearchIcon, FilterIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, LockIcon, EyeIcon } from "@/components/dashboard/icons";
import { MobileHeader } from "@/components/layout/mobile-header";

type SortKey = "name" | "youOwe" | "owedToYou";

function Avatar({ user }: { user: FriendUser }) {
  const name = user.displayName ?? user.usernameDisplay;
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied same-origin /uploads URL, not an <Image>-optimizable remote host
    return <img src={user.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />;
  }
  const initial = name.charAt(0).toUpperCase();
  const palette = paletteForKey(user.id);
  return (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold", palette.chip)}>
      {initial}
    </span>
  );
}

function StayConnectedIllustration() {
  return (
    <svg width="72" height="60" viewBox="0 0 96 80" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="26" cy="30" r="14" fill="#c4b5fd" />
      <rect x="14" y="46" width="24" height="30" rx="12" fill="#a78bfa" />
      <circle cx="70" cy="34" r="12" fill="#fdba74" />
      <rect x="58" y="48" width="24" height="28" rx="12" fill="#fb923c" />
      <rect x="44" y="14" width="26" height="18" rx="9" fill="#818cf8" />
      <path d="M50 32 46 40 56 32Z" fill="#818cf8" />
    </svg>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fallbackCurrency = user?.profile?.defaultCurrency ?? "LKR";
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const { data: friends, isLoading: friendsLoading } = useFriendList();
  const { data: incoming } = useFriendRequests("incoming");
  const { data: outgoing } = useFriendRequests("outgoing");
  const { data: blocked } = useBlockedUsers();
  const { data: results, isFetching: searching } = useSearchUsers(query);
  const { data: balances } = useBalances();

  const sendRequest = useSendFriendRequest();
  const respond = useRespondToFriendRequest();
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const startConversation = useStartConversation();

  const balanceByUserId = useMemo(() => {
    const map = new Map<string, { netMinor: number; currency: string }>();
    for (const b of balances?.items ?? []) {
      if (!b.user) continue;
      const netMinor = b.balances.reduce((sum, c) => sum + Number(c.netMinor), 0);
      const currency = b.balances[0]?.currency ?? fallbackCurrency;
      map.set(b.user.id, { netMinor, currency });
    }
    return map;
  }, [balances, fallbackCurrency]);

  function balanceFor(f: Friend) {
    const entry = balanceByUserId.get(f.user.id);
    const netMinor = entry?.netMinor ?? 0;
    const currency = entry?.currency ?? fallbackCurrency;
    return {
      youOweMinor: netMinor < 0 ? Math.abs(netMinor) : 0,
      owedToYouMinor: netMinor > 0 ? netMinor : 0,
      currency,
    };
  }

  const sortedFriends = useMemo(() => {
    if (!friends) return [];
    const items = [...friends.items];
    items.sort((a, b) => {
      if (sortKey === "name") {
        const nameA = a.user.displayName ?? a.user.usernameDisplay;
        const nameB = b.user.displayName ?? b.user.usernameDisplay;
        return nameA.localeCompare(nameB);
      }
      const balA = balanceFor(a);
      const balB = balanceFor(b);
      const key = sortKey === "youOwe" ? "youOweMinor" : "owedToYouMinor";
      return balB[key] - balA[key];
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, sortKey, balanceByUserId]);

  async function handleSend(username: string) {
    setError(null);
    try {
      await sendRequest.mutateAsync(username);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
  }

  async function handleMessage(friendUserId: string) {
    const conversation = await startConversation.mutateAsync(friendUserId);
    router.push(`/chat/${conversation.id}`);
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Friends"
        right={
          <button
            type="button"
            onClick={() => searchRef.current?.focus()}
            aria-label="Add friend"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-50 dark:hover:text-slate-100"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        }
      />
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Friends</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Find people, manage requests, and start conversations.</p>
        </div>
        <Button onClick={() => searchRef.current?.focus()} className="shrink-0 rounded-xl">
          <PlusIcon className="h-4 w-4" />
          Add friend
        </Button>
      </div>

      <Card>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Find people</p>
        <form onSubmit={handleSearchSubmit} className="mt-3 flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by username"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search by username"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <button
            type="button"
            aria-label="Filter"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <FilterIcon className="h-4 w-4" />
          </button>
        </form>
        <ErrorText>{error}</ErrorText>
        {query.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {searching ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : !results || results.items.length === 0 ? (
              <p className="py-2 text-sm text-slate-500 dark:text-slate-400">No matching users.</p>
            ) : (
              results.items.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={u} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{u.displayName ?? u.usernameDisplay}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{u.usernameDisplay}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => void handleSend(u.username)} isLoading={sendRequest.isPending}>
                    Add friend
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {incoming && incoming.items.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Requests for you</p>
          <ul className="mt-3 space-y-2">
            {incoming.items.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar user={req.user} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{req.user.displayName ?? req.user.usernameDisplay}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{req.user.usernameDisplay}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => void respond.mutateAsync({ id: req.id, action: "accept" })}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void respond.mutateAsync({ id: req.id, action: "reject" })}
                  >
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
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Sent requests</p>
          <ul className="mt-3 space-y-2">
            {outgoing.items.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar user={req.user} />
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{req.user.displayName ?? req.user.usernameDisplay}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void respond.mutateAsync({ id: req.id, action: "cancel" })}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Your friends</p>
            {friends && friends.items.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-xs font-semibold text-indigo-700">
                {friends.items.length}
              </span>
            )}
          </div>
          {friends && friends.items.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Sort by</span>
              <Select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-auto"
                aria-label="Sort friends"
              >
                <option value="name">Name (A-Z)</option>
                <option value="youOwe">You owe</option>
                <option value="owedToYou">Owed to you</option>
              </Select>
            </div>
          )}
        </div>
        {friendsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !friends || friends.items.length === 0 ? (
          <div className="p-5 pt-0">
            <EmptyState title="No friends yet" description="Search for a username above to send your first friend request." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedFriends.map((f) => {
              const bal = balanceFor(f);
              return (
                <li key={f.friendshipId} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={f.user} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{f.user.displayName ?? f.user.usernameDisplay}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{f.user.usernameDisplay}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <ArrowUpIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">You owe</p>
                        <p className="text-sm font-semibold tabular-nums text-emerald-700">
                          {formatMoney(String(bal.youOweMinor), bal.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <ArrowDownIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Owed to you</p>
                        <p className="text-sm font-semibold tabular-nums text-rose-700">
                          {formatMoney(String(bal.owedToYouMinor), bal.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        onClick={() => void handleMessage(f.user.id)}
                      >
                        Message
                      </Button>
                      <button
                        type="button"
                        onClick={() => void removeFriend.mutateAsync(f.friendshipId)}
                        className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => void blockUser.mutateAsync(f.user.id)}
                        className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-600"
                      >
                        Block
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <LockIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Blocked users</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">View and manage the people you&apos;ve blocked.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowBlocked((v) => !v)}>
            <EyeIcon className="h-4 w-4" />
            {showBlocked ? "Hide" : "Show"} blocked users
            {blocked && blocked.items.length > 0 ? ` (${blocked.items.length})` : ""}
          </Button>
        </div>
        {showBlocked && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            {!blocked || blocked.items.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">You haven&apos;t blocked anyone.</p>
            ) : (
              <ul className="space-y-2">
                {blocked.items.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar user={u} />
                      <p className="truncate text-sm text-slate-900 dark:text-slate-50">@{u.usernameDisplay}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => void unblockUser.mutateAsync(u.id)}>
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card className="flex flex-col items-center gap-4 bg-indigo-50/60 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <StayConnectedIllustration />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Stay connected</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add friends, split expenses, and settle up with ease.</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0">
          Learn more
        </Button>
      </Card>
    </div>
  );
}
