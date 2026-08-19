"use client";

import { useState } from "react";
import { useUnreadNotificationCount, useNotifications, useMarkAllNotificationsRead } from "@/lib/hooks/use-notifications";
import type { NotificationRecord } from "@/lib/types";
import { cn } from "@/lib/cn";

function describe(n: NotificationRecord): string {
  const p = n.payload;
  switch (n.type) {
    case "FRIEND_REQUEST":
      return `${String(p.fromUsername ?? "Someone")} sent you a friend request.`;
    case "FRIEND_REQUEST_ACCEPTED":
      return `${String(p.byUsername ?? "Someone")} accepted your friend request.`;
    case "NEW_MESSAGE":
      return `${String(p.fromUsername ?? "Someone")}: ${String(p.preview ?? "New message")}`;
    default:
      return n.type.replace(/_/g, " ").toLowerCase();
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unread } = useUnreadNotificationCount();
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread && unread.count > 0) void markAllRead.mutateAsync();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
      >
        🔔
        {unread && unread.count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread.count > 9 ? "9+" : unread.count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-20 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1.5 text-xs font-medium text-slate-500">Notifications</p>
          {!notifications || notifications.items.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-500">Nothing yet.</p>
          ) : (
            <ul className="max-h-80 space-y-0.5 overflow-y-auto">
              {notifications.items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-lg px-2 py-2 text-sm",
                    n.readAt ? "text-slate-500" : "bg-indigo-50 text-slate-900",
                  )}
                >
                  {describe(n)}
                  <p className="mt-0.5 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
