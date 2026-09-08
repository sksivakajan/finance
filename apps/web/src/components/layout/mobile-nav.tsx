"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useUnreadNotificationCount } from "@/lib/hooks/use-notifications";
import { Avatar } from "@/components/ui/avatar";
import { HomeIcon, ChatBubbleIcon, LogoutIcon } from "./icons";
import {
  TrendUpIcon,
  WalletIcon,
  BanknoteIcon,
  CalendarIcon,
  UsersIcon,
  UserIcon,
  BuildingIcon,
  MoreVerticalIcon,
  GearIcon,
} from "@/components/dashboard/icons";

const TABS = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/income", label: "Income", icon: TrendUpIcon },
  { href: "/expenses", label: "Expenses", icon: WalletIcon },
  { href: "/loans", label: "Loans", icon: BanknoteIcon },
];

const MORE_ITEMS = [
  { href: "/scheduled-payments", label: "Scheduled Payments", icon: CalendarIcon },
  { href: "/forecast", label: "Forecast", icon: TrendUpIcon },
  { href: "/balances", label: "Balances", icon: BuildingIcon },
  { href: "/groups", label: "Groups", icon: UsersIcon },
  { href: "/friends", label: "Friends", icon: UserIcon },
  { href: "/chat", label: "Chat", icon: ChatBubbleIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: unread } = useUnreadNotificationCount();
  const [moreOpen, setMoreOpen] = useState(false);

  const displayName = user?.profile?.displayName || user?.usernameDisplay || "";

  const moreActive = MORE_ITEMS.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {TABS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
            moreActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400",
          )}
        >
          <MoreVerticalIcon className="h-5 w-5" />
          More
          {unread && unread.count > 0 && (
            <span className="absolute right-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread.count > 9 ? "9+" : unread.count}
            </span>
          )}
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl dark:bg-slate-900">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            <p className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-slate-50">More</p>
            <div className="grid grid-cols-3 gap-3">
              {MORE_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                const showBadge = item.href === "/chat" && unread && unread.count > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-medium",
                      active
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                    {showBadge && (
                      <span className="absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unread.count > 9 ? "9+" : unread.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link
                href="/settings"
                onClick={() => setMoreOpen(false)}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar name={displayName} src={user?.profile?.avatarUrl} size="sm" className="h-9 w-9 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{displayName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user?.usernameDisplay}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <LogoutIcon className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
