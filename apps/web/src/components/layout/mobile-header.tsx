"use client";

import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./notification-bell";
import { ThemeToggleButton } from "@/components/ui/theme-toggle-button";
import { Avatar } from "@/components/ui/avatar";

export function MobileHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { user } = useAuth();
  const displayName = user?.profile?.displayName || user?.usernameDisplay || "";

  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
      <Avatar name={displayName} src={user?.profile?.avatarUrl} size="sm" className="h-9 w-9 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{title}</p>
        {subtitle && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {right}
        <ThemeToggleButton tone="light" />
        <NotificationBell tone="light" />
      </div>
    </div>
  );
}
