"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useUnreadNotificationCount } from "@/lib/hooks/use-notifications";

// Icon-only tabs on mobile: 7 items with text labels don't fit a small
// viewport without clipping the last one off-screen (found via a real
// browser check at 390px wide). Icons + aria-label keep it compact and
// accessible instead of shrinking text to the point of being unreadable.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/income", label: "Income", icon: "💰" },
  { href: "/expenses", label: "Expenses", icon: "🧾" },
  { href: "/scheduled-payments", label: "Upcoming", icon: "⏰" },
  { href: "/loans", label: "Loans", icon: "🏦" },
  { href: "/balances", label: "Balances", icon: "⚖️" },
  { href: "/groups", label: "Groups", icon: "🧑‍🤝‍🧑" },
  { href: "/friends", label: "Friends", icon: "👥" },
  { href: "/chat", label: "Chat", icon: "💬" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: unread } = useUnreadNotificationCount();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-lg",
              active ? "text-indigo-600" : "text-slate-500",
            )}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.href === "/chat" && unread && unread.count > 0 && (
              <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unread.count > 9 ? "9+" : unread.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
