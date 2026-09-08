import Link from "next/link";
import type { FriendBalance } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";

export function FriendsBalanceList({ balances }: { balances: FriendBalance[] }) {
  const withFriend = balances.filter((b) => b.user);

  if (withFriend.length === 0) {
    return (
      <EmptyState
        title="All settled up"
        description="Split an expense with a friend and the balance will show up here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {withFriend.slice(0, 5).map((b) => {
        const friend = b.user!;
        const netMinor = b.balances.reduce((sum, c) => sum + Number(c.netMinor), 0);
        const currency = b.balances[0]?.currency ?? "LKR";
        return (
          <li key={friend.id}>
            <Link href={`/balances`} className="flex items-center justify-between gap-3 rounded-lg -mx-1 px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar
                  name={friend.displayName ?? friend.usernameDisplay}
                  src={friend.avatarUrl}
                  size="sm"
                  className="h-9 w-9 text-sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                    {friend.displayName ?? friend.usernameDisplay}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {netMinor === 0 ? "Settled up" : netMinor > 0 ? "Owes you" : "You owe"}
                  </span>
                </span>
              </span>
              <span
                className={`shrink-0 text-sm font-medium tabular-nums ${
                  netMinor === 0 ? "text-slate-400 dark:text-slate-500" : netMinor > 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {netMinor === 0 ? formatMoney("0", currency) : formatMoney(Math.abs(netMinor).toString(), currency)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
