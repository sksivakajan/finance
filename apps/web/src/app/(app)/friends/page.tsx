"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { useStartConversation } from "@/lib/hooks/use-chat";
import { ApiError } from "@/lib/api-client";
import type { FriendUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

function Avatar({ user }: { user: FriendUser }) {
  const initial = (user.displayName ?? user.usernameDisplay).charAt(0).toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {initial}
    </span>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);

  const { data: friends, isLoading: friendsLoading } = useFriendList();
  const { data: incoming } = useFriendRequests("incoming");
  const { data: outgoing } = useFriendRequests("outgoing");
  const { data: blocked } = useBlockedUsers();
  const { data: results, isFetching: searching } = useSearchUsers(query);

  const sendRequest = useSendFriendRequest();
  const respond = useRespondToFriendRequest();
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const startConversation = useStartConversation();

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
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Friends</h1>
        <p className="text-sm text-slate-500">Find people, manage requests, and start conversations.</p>
      </div>

      <Card>
        <CardTitle>Find people</CardTitle>
        <form onSubmit={handleSearchSubmit} className="mt-3">
          <Input
            placeholder="Search by username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search by username"
          />
        </form>
        <ErrorText>{error}</ErrorText>
        {query.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {searching ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : !results || results.items.length === 0 ? (
              <p className="py-2 text-sm text-slate-500">No matching users.</p>
            ) : (
              results.items.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={u} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{u.displayName ?? u.usernameDisplay}</p>
                      <p className="truncate text-xs text-slate-500">@{u.usernameDisplay}</p>
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
          <CardTitle>Requests for you</CardTitle>
          <ul className="mt-3 space-y-2">
            {incoming.items.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar user={req.user} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{req.user.displayName ?? req.user.usernameDisplay}</p>
                    <p className="truncate text-xs text-slate-500">@{req.user.usernameDisplay}</p>
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
          <CardTitle>Sent requests</CardTitle>
          <ul className="mt-3 space-y-2">
            {outgoing.items.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar user={req.user} />
                  <p className="truncate text-sm font-medium text-slate-900">{req.user.displayName ?? req.user.usernameDisplay}</p>
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
        <div className="p-5 pb-0">
          <CardTitle>Your friends</CardTitle>
        </div>
        {friendsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !friends || friends.items.length === 0 ? (
          <div className="p-5 pt-3">
            <EmptyState title="No friends yet" description="Search for a username above to send your first friend request." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {friends.items.map((f) => (
              <li key={f.friendshipId} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar user={f.user} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{f.user.displayName ?? f.user.usernameDisplay}</p>
                    <p className="truncate text-xs text-slate-500">@{f.user.usernameDisplay}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Button size="sm" variant="secondary" onClick={() => void handleMessage(f.user.id)}>
                    Message
                  </Button>
                  <button
                    type="button"
                    onClick={() => void removeFriend.mutateAsync(f.friendshipId)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => void blockUser.mutateAsync(f.user.id)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Block
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div>
        <button
          type="button"
          onClick={() => setShowBlocked((v) => !v)}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          {showBlocked ? "Hide" : "Show"} blocked users {blocked && blocked.items.length > 0 ? `(${blocked.items.length})` : ""}
        </button>
        {showBlocked && (
          <Card className="mt-3">
            {!blocked || blocked.items.length === 0 ? (
              <p className="text-sm text-slate-500">You haven&apos;t blocked anyone.</p>
            ) : (
              <ul className="space-y-2">
                {blocked.items.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar user={u} />
                      <p className="truncate text-sm text-slate-900">@{u.usernameDisplay}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => void unblockUser.mutateAsync(u.id)}>
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
