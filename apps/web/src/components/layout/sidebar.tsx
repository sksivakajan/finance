"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./notification-bell";
import { ThemeToggleButton } from "@/components/ui/theme-toggle-button";
import { Avatar } from "@/components/ui/avatar";
import { HomeIcon, ChatBubbleIcon, LogoutIcon, SidebarIllustration } from "./icons";
import {
  TrendUpIcon,
  WalletIcon,
  CalendarIcon,
  BanknoteIcon,
  BuildingIcon,
  UsersIcon,
  UserIcon,
  GearIcon,
  HelpCircleIcon,
  ChevronDownIcon,
} from "@/components/dashboard/icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/income", label: "Income", icon: TrendUpIcon },
  { href: "/expenses", label: "Expenses", icon: WalletIcon },
  { href: "/scheduled-payments", label: "Scheduled payments", icon: CalendarIcon },
  { href: "/loans", label: "Loans", icon: BanknoteIcon },
  { href: "/forecast", label: "Forecast", icon: TrendUpIcon },
  { href: "/balances", label: "Balances", icon: BuildingIcon },
  { href: "/groups", label: "Groups", icon: UsersIcon },
  { href: "/friends", label: "Friends", icon: UserIcon },
  { href: "/chat", label: "Chat", icon: ChatBubbleIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

const MENU_WIDTH = 220;

function ProfileMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [coords, setCoords] = useState<{ bottom: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.profile?.displayName || user?.usernameDisplay || "";

  function toggle() {
    if (open) {
      setOpen(false);
      setEntered(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
    }
    setMounted(true);
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
  }

  useEffect(() => {
    if (open) return;
    const timeout = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const MENU_ITEMS = [
    { label: "Profile", icon: UserIcon, onClick: () => go("/settings") },
    { label: "Settings", icon: GearIcon, onClick: () => go("/settings") },
    { label: "Help & Support", icon: HelpCircleIcon, onClick: () => go("/settings?section=help-support") },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 text-left backdrop-blur-sm transition-colors hover:bg-white/15"
      >
        <Avatar name={displayName} src={user?.profile?.avatarUrl} size="sm" className="h-9 w-9 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{displayName}</p>
          <p className="truncate text-xs text-white/50">@{user?.usernameDisplay}</p>
        </div>
        <ChevronDownIcon className={cn("h-4 w-4 shrink-0 text-white/40 transition-transform", open && "rotate-180")} />
      </button>

      {mounted &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ bottom: coords.bottom, left: coords.left, width: MENU_WIDTH }}
            className={cn(
              "fixed z-50 origin-bottom rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg transition-[opacity,transform] duration-150 ease-out dark:border-slate-700 dark:bg-slate-900",
              entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-95 opacity-0",
            )}
          >
            {MENU_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <item.icon className="h-4 w-4 text-slate-400" />
                {item.label}
              </button>
            ))}
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <LogoutIcon className="h-4 w-4" />
              Log out
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-900 text-white">
      <SidebarIllustration className="pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full" />

      <div className="relative z-10 flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-sm font-bold">
            F
          </span>
          <span className="text-base font-semibold">Finance</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggleButton tone="dark" />
          <NotificationBell />
        </div>
      </div>

      <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-950/40"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 px-3 pb-5 pt-3">
        <ProfileMenu />
      </div>
    </aside>
  );
}
