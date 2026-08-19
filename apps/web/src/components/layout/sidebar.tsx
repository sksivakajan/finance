"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./notification-bell";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/scheduled-payments", label: "Scheduled payments" },
  { href: "/loans", label: "Loans" },
  { href: "/friends", label: "Friends" },
  { href: "/chat", label: "Chat" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 py-5">
        <span className="text-lg font-semibold text-slate-900">Finance</span>
        <NotificationBell />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-4 py-4">
        <p className="truncate text-sm font-medium text-slate-900">{user?.profile?.displayName}</p>
        <p className="truncate text-xs text-slate-500">@{user?.usernameDisplay}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
