"use client";

import Link from "next/link";
import { useConversationList } from "@/lib/hooks/use-chat";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

function previewText(lastMessage: { body: string | null; type: string; deleted: boolean } | null): string {
  if (!lastMessage) return "Say hello.";
  if (lastMessage.deleted) return "Message deleted";
  if (lastMessage.type === "IMAGE") return "📷 Photo";
  if (lastMessage.type === "FILE") return "📎 Attachment";
  return lastMessage.body ?? "";
}

export default function ChatPage() {
  const { data, isLoading } = useConversationList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Chat</h1>
        <p className="text-sm text-slate-500">Conversations with your friends.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Add a friend, then message them from your friends list to start a conversation."
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {data.items.map((c) => {
              const name = c.otherUser?.displayName ?? c.otherUser?.usernameDisplay ?? "Unknown user";
              return (
                <li key={c.conversationId}>
                  <Link
                    href={`/chat/${c.conversationId}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar label={name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                        <p className="truncate text-xs text-slate-500">{previewText(c.lastMessage)}</p>
                      </div>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
