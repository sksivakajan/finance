"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUnreadNotificationCount, useNotifications, useMarkAllNotificationsRead } from "@/lib/hooks/use-notifications";
import type { NotificationRecord } from "@/lib/types";
import { cn } from "@/lib/cn";

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.85 23.85 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.26 24.26 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}

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

const PANEL_WIDTH = 320;
const VIEWPORT_MARGIN = 8;

export function NotificationBell({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { data: unread } = useUnreadNotificationCount();
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  function toggle() {
    if (open) {
      setOpen(false);
      setEntered(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(PANEL_WIDTH, window.innerWidth * 0.85);
      let left = rect.left;
      if (left + width > window.innerWidth - VIEWPORT_MARGIN) left = rect.right - width;
      left = Math.max(VIEWPORT_MARGIN, left);
      setCoords({ top: rect.bottom + 8, left });
    }
    setMounted(true);
    setOpen(true);
    // Paint the closed (scaled/faded-out) state first, then flip to the open
    // state on the next frame so the transition actually animates in.
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    if (unread && unread.count > 0) void markAllRead.mutateAsync();
  }

  // Keep the panel mounted for the exit transition, then remove it from the DOM.
  useEffect(() => {
    if (open) return;
    const timeout = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(timeout);
  }, [open]);

  // Close on outside click/tap or Escape.
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

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          tone === "light"
            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            : "text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        <BellIcon className="h-5 w-5" />
        {unread && unread.count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread.count > 9 ? "9+" : unread.count}
          </span>
        )}
      </button>
      {mounted &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: coords.top, left: coords.left, width: `min(${PANEL_WIDTH}px, 85vw)` }}
            className={cn(
              "fixed z-50 origin-top rounded-xl border border-slate-200 bg-white p-2 shadow-lg transition-[opacity,transform] duration-150 ease-out dark:border-slate-700 dark:bg-slate-900",
              entered ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-95 opacity-0",
            )}
          >
            <p className="px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Notifications</p>
            {!notifications || notifications.items.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Nothing yet.</p>
            ) : (
              <ul className="max-h-80 space-y-0.5 overflow-y-auto">
                {notifications.items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-lg px-2 py-2 text-sm",
                      n.readAt
                        ? "text-slate-500 dark:text-slate-400"
                        : "bg-indigo-50 text-slate-900 dark:bg-indigo-500/10 dark:text-slate-100",
                    )}
                  >
                    {describe(n)}
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
