"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useGroups, useCreateGroup } from "@/lib/hooks/use-groups";
import { useFriendList } from "@/lib/hooks/use-friends";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const { data: friends } = useFriendList();
  const createGroup = useCreateGroup();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleMember(id: string) {
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createGroup.mutateAsync({ name, memberUserIds: memberIds });
      setName("");
      setMemberIds([]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create that group.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Groups</h1>
          <p className="text-sm text-slate-500">Shared expenses with a set of friends, like a trip or a household.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "New group"}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group name</Label>
              <Input id="group-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beach trip" />
            </div>
            {friends && friends.items.length > 0 && (
              <div>
                <Label>Members</Label>
                <div className="space-y-1.5">
                  {friends.items.map((f) => (
                    <label key={f.user.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(f.user.id)}
                        onChange={() => toggleMember(f.user.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {f.user.displayName ?? f.user.usernameDisplay}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <ErrorText>{error}</ErrorText>
              <Button type="submit" isLoading={createGroup.isPending}>
                Create group
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !groups || groups.items.length === 0 ? (
        <EmptyState title="No groups yet" description="Create a group to split expenses with more than one friend at a time." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {groups.items.map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{g.name}</p>
                    <p className="text-xs text-slate-500">
                      {g.members.length} member{g.members.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
