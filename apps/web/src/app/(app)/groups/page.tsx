"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useGroupsSummary, useCreateGroup, useRemoveGroupMember, type GroupSummary } from "@/lib/hooks/use-groups";
import { useFriendList } from "@/lib/hooks/use-friends";
import { ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { paletteForKey } from "@/lib/category-palette";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SummaryCard } from "@/components/ui/summary-card";
import { MobileHeader } from "@/components/layout/mobile-header";
import { UsersIcon } from "@/components/groups/icons";
import { WalletIcon, ArrowDownIcon, CalendarIcon, SearchIcon, PlusIcon, MoreVerticalIcon, PieChartIcon } from "@/components/dashboard/icons";

type SortKey = "recent" | "name" | "members";

function GroupsIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="10" cy="10" r="2" fill="#f9a8d4" />
      <circle cx="55" cy="8" r="1.5" fill="#fcd34d" />
      <circle cx="8" cy="48" r="1.5" fill="#93c5fd" />
      <circle cx="56" cy="50" r="2" fill="#86efac" />
      <circle cx="20" cy="18" r="6" fill="#c4b5fd" />
      <circle cx="42" cy="18" r="6" fill="#a5b4fc" />
      <rect x="14" y="30" width="16" height="16" rx="4" fill="#ede9fe" />
      <rect x="34" y="30" width="16" height="16" rx="4" fill="#e0e7ff" />
    </svg>
  );
}

function FeatureBlurb({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-indigo-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function GroupRow({ summary, currentUserId }: { summary: GroupSummary; currentUserId: string | undefined }) {
  const { group, currency, owedMinor, oweMinor, totalExpensesMinor } = summary;
  const [menuOpen, setMenuOpen] = useState(false);
  const removeMember = useRemoveGroupMember(group.id);
  const palette = paletteForKey(group.id);

  const memberNames = group.members.map((m) => (m.userId === currentUserId ? "You" : m.displayName ?? m.usernameDisplay));
  const isOwner = group.members.find((m) => m.userId === currentUserId)?.role === "OWNER";

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", palette.chip)}>
            <UsersIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{group.name}</p>
              <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {group.members.length} member{group.members.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{memberNames.join(", ")}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <CalendarIcon className="h-3.5 w-3.5" />
              Created {new Date(group.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-5 sm:gap-8">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">You are owed</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-600">{formatMoney(String(owedMinor), currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">You owe</p>
            <p className="text-sm font-semibold tabular-nums text-rose-600">{formatMoney(String(oweMinor), currency)}</p>
          </div>
          <div className="hidden text-right lg:block">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total expenses</p>
            <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatMoney(String(totalExpensesMinor), currency)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/groups/${group.id}`}>
              <Button size="sm" variant="secondary">
                View group
              </Button>
            </Link>
            <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false); }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={`More options for ${group.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
                  {isOwner ? (
                    <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">You own this group</p>
                  ) : (
                    <button
                      type="button"
                      disabled={removeMember.isPending}
                      onClick={() => {
                        if (currentUserId) void removeMember.mutateAsync(currentUserId);
                        setMenuOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
                    >
                      Leave group
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function GroupsPage() {
  const { user } = useAuth();
  const currency = user?.profile?.defaultCurrency ?? "LKR";
  const { summaries, totals, isLoading, totalGroups } = useGroupsSummary(currency);
  const { data: friends } = useFriendList();
  const createGroup = useCreateGroup();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

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

  const visibleSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = summaries;
    if (q) {
      list = list.filter((s) => {
        const nameMatch = s.group.name.toLowerCase().includes(q);
        const memberMatch = s.group.members.some((m) => (m.displayName ?? m.usernameDisplay).toLowerCase().includes(q));
        return nameMatch || memberMatch;
      });
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.group.name.localeCompare(b.group.name));
    else if (sort === "members") sorted.sort((a, b) => b.group.members.length - a.group.members.length);
    else sorted.sort((a, b) => new Date(b.group.createdAt).getTime() - new Date(a.group.createdAt).getTime());
    return sorted;
  }, [summaries, search, sort]);

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Groups"
        right={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            aria-label={showForm ? "Cancel" : "New group"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-50 dark:hover:text-slate-100"
          >
            <PlusIcon className={cn("h-5 w-5 transition-transform", showForm && "rotate-45")} />
          </button>
        }
      />
      <div className="hidden flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:flex">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Groups</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shared expenses with a set of friends, like a trip or a household.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="shrink-0 rounded-xl">
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <PlusIcon className="h-4 w-4" />
              New group
            </>
          )}
        </Button>
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
                    <label key={f.user.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(f.user.id)}
                        onChange={() => toggleMember(f.user.id)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
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
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total groups"
              value={String(totalGroups)}
              icon={<UsersIcon className="h-5 w-5" />}
              tone="violet"
              subtext="All your groups"
            />
            <SummaryCard
              label="Total members"
              value={String(totals.totalMembers)}
              icon={<UsersIcon className="h-5 w-5" />}
              tone="emerald"
              subtext="Across all groups"
            />
            <SummaryCard
              label="You are owed"
              value={formatMoney(String(totals.owedMinor), currency)}
              icon={<WalletIcon className="h-5 w-5" />}
              tone="amber"
              subtext="From all groups"
              valueClassName="text-emerald-600"
            />
            <SummaryCard
              label="You owe"
              value={formatMoney(String(totals.oweMinor), currency)}
              icon={<ArrowDownIcon className="h-5 w-5" />}
              tone="rose"
              subtext="To all groups"
              valueClassName="text-rose-600"
            />
          </div>

          <Card className="overflow-visible p-0">
            <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:max-w-xs sm:flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search groups..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>Sort by</span>
                <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-44">
                  <option value="recent">Recently created</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="members">Most members</option>
                </Select>
              </div>
            </div>

            {visibleSummaries.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title={totalGroups === 0 ? "No groups yet" : "No matching groups"}
                  description={
                    totalGroups === 0
                      ? "Create a group to split expenses with more than one friend at a time."
                      : "Try a different search term."
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleSummaries.map((summary) => (
                  <GroupRow key={summary.group.id} summary={summary} currentUserId={user?.id} />
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-6 border-indigo-100 bg-gradient-to-r from-violet-50 to-indigo-50 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <GroupsIllustration />
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-50">Simplify shared expenses</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Create a group, add members, and track who owes what.</p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FeatureBlurb
                    icon={<PlusIcon className="h-4 w-4" />}
                    title="Create a group"
                    description="Start a group for trips, roommates, or events."
                  />
                  <FeatureBlurb
                    icon={<UsersIcon className="h-4 w-4" />}
                    title="Add members"
                    description="Invite friends and start adding expenses."
                  />
                  <FeatureBlurb
                    icon={<PieChartIcon className="h-4 w-4" />}
                    title="Settle up easily"
                    description="See balances and mark payments when settled."
                  />
                </div>
              </div>
            </div>
            <Button variant="secondary" className="shrink-0 self-start bg-white dark:bg-slate-900 lg:self-center">
              Learn more
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
