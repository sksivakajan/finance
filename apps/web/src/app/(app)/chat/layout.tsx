"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useConversationList } from "@/lib/hooks/use-chat";
import { cn } from "@/lib/cn";
import { paletteForKey } from "@/lib/category-palette";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SearchIcon, PencilIcon } from "@/components/dashboard/icons";
import type { ConversationSummary } from "@/lib/types";

function Avatar({ name, colorKey, src }: { name: string; colorKey: string; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied same-origin /uploads URL, not an <Image>-optimizable remote host
    return <img src={src} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />;
  }
  const palette = paletteForKey(colorKey);
  return (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold", palette.chip)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function previewText(lastMessage: ConversationSummary["lastMessage"]): string {
  if (!lastMessage) return "Say hello.";
  if (lastMessage.deleted) return "Message deleted";
  if (lastMessage.type === "IMAGE") return "📷 Photo";
  if (lastMessage.type === "FILE") return "📎 Attachment";
  return lastMessage.body ?? "";
}

function formatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeConversationId = pathname.startsWith("/chat/") ? pathname.slice("/chat/".length) : null;
  const isConversationOpen = activeConversationId !== null;

  const { data, isLoading } = useConversationList();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = useMemo(() => (data?.items ?? []).filter((c) => c.unreadCount > 0).length, [data]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.items.filter((c) => {
      if (filter === "unread" && c.unreadCount === 0) return false;
      if (!q) return true;
      const name = c.otherUser?.displayName ?? c.otherUser?.usernameDisplay ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [data, search, filter]);

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm md:h-[calc(100vh-3rem)]">
      <div
        className={cn(
          "w-full shrink-0 flex-col border-slate-200 dark:border-slate-700 md:flex md:w-80 md:border-r",
          isConversationOpen ? "hidden" : "flex",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 p-5 pb-4">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Chat</h1>
          <Link
            href="/friends"
            aria-label="Start a new chat"
            title="Start a new chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 py-2.5 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="mt-3 flex gap-2">
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  filter === key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
                )}
              >
                {key === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={data && data.items.length > 0 ? "No matches" : "No conversations yet"}
                description={
                  data && data.items.length > 0
                    ? "Try a different search."
                    : "Add a friend, then message them to start a conversation."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((c) => {
                const name = c.otherUser?.displayName ?? c.otherUser?.usernameDisplay ?? "Unknown user";
                const active = c.conversationId === activeConversationId;
                const unread = c.unreadCount > 0;
                return (
                  <li key={c.conversationId}>
                    <Link
                      href={`/chat/${c.conversationId}`}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        active && "bg-indigo-50 hover:bg-indigo-50 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/10",
                      )}
                    >
                      <Avatar name={name} colorKey={c.otherUser?.id ?? c.conversationId} src={c.otherUser?.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("truncate text-sm text-slate-900 dark:text-slate-50", unread ? "font-semibold" : "font-medium")}>
                            {name}
                          </p>
                          {c.lastMessage && (
                            <span
                              className={cn(
                                "shrink-0 text-xs",
                                unread ? "font-medium text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500",
                              )}
                            >
                              {formatListTime(c.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("truncate text-xs", unread ? "text-slate-600 dark:text-slate-300" : "text-slate-500 dark:text-slate-400")}>
                            {previewText(c.lastMessage)}
                          </p>
                          {unread && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-white">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className={cn("min-w-0 flex-1 flex-col", isConversationOpen ? "flex" : "hidden md:flex")}>{children}</div>
    </div>
  );
}
