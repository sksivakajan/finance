"use client";

import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./notification-bell";

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
  const initial = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:hidden">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-slate-900">{title}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {right}
        <NotificationBell tone="light" />
      </div>
    </div>
  );
}
