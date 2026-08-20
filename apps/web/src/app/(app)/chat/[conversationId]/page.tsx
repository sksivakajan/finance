"use client";

import { use, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  useMessages,
  useConversationList,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useMarkConversationRead,
} from "@/lib/hooks/use-chat";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { paletteForKey } from "@/lib/category-palette";
import type { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { PaperclipIcon, SendIcon } from "@/components/dashboard/icons";

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateDivider(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function fileExt(url: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(url);
  return match ? match[1].toUpperCase() : "File";
}

function Bubble({
  message,
  isOwn,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onEdit: (m: ChatMessage) => void;
  onDelete: (id: string) => void;
}) {
  const attachmentSrc = message.attachmentUrl ? `${API_ORIGIN}${message.attachmentUrl}` : null;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className="max-w-[75%]">
        <div className="flex items-end gap-2">
          <div
            className={cn(
              "rounded-2xl px-4 py-2 text-sm",
              isOwn ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-900",
              message.deleted && "italic opacity-60",
            )}
          >
            {message.deleted ? (
              "Message deleted"
            ) : (
              <>
                {message.type === "IMAGE" && attachmentSrc && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote-served local upload, not a Next-optimizable static asset
                  <img src={attachmentSrc} alt="Attachment" className="mb-1.5 max-h-64 rounded-lg" />
                )}
                {message.type === "FILE" && attachmentSrc && (
                  <a
                    href={attachmentSrc}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "mb-1.5 flex items-center gap-2.5 rounded-xl border px-3 py-2",
                      isOwn ? "border-white/25 bg-white/10" : "border-slate-200 bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isOwn ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700",
                      )}
                    >
                      <PaperclipIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">Attachment</span>
                      <span className={cn("block text-[11px]", isOwn ? "text-indigo-100" : "text-slate-500")}>
                        {fileExt(attachmentSrc)}
                      </span>
                    </span>
                  </a>
                )}
                {message.body}
                {message.editedAt && <span className="ml-1.5 text-[10px] opacity-70">(edited)</span>}
              </>
            )}
          </div>
          <span className="shrink-0 pb-0.5 text-[11px] text-slate-400">{formatMessageTime(message.createdAt)}</span>
        </div>
        {isOwn && !message.deleted && (
          <div className="mt-0.5 flex justify-end gap-2 text-[10px] text-slate-400">
            <button type="button" onClick={() => onEdit(message)} className="hover:text-slate-600">
              Edit
            </button>
            <button type="button" onClick={() => onDelete(message.id)} className="hover:text-red-600">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  const { user } = useAuth();
  const { data: messagesData, isLoading, isError } = useMessages(conversationId);
  const { data: conversations } = useConversationList();
  const sendMessage = useSendMessage(conversationId);
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);
  const markRead = useMarkConversationRead(conversationId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const otherUser = conversations?.items.find((c) => c.conversationId === conversationId)?.otherUser;
  const messages = useMemo(() => (messagesData ? [...messagesData.items].reverse() : []), [messagesData]);

  const groupedMessages = useMemo(() => {
    const groups: { dateKey: string; label: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const dateKey = new Date(m.createdAt).toDateString();
      let group = groups[groups.length - 1];
      if (!group || group.dateKey !== dateKey) {
        group = { dateKey, label: formatDateDivider(m.createdAt), items: [] };
        groups.push(group);
      }
      group.items.push(m);
    }
    return groups;
  }, [messages]);

  useEffect(() => {
    void markRead.mutateAsync();
    // Only re-run when new messages actually arrive, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesData?.items.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const { url } = await api.uploadFile(file);
      setAttachmentUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload that file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() && !attachmentUrl) return;
    setError(null);
    try {
      if (editingId) {
        await editMessage.mutateAsync({ id: editingId, body: body.trim() });
        setEditingId(null);
      } else {
        const isImage = /\.(jpg|jpeg|png|webp|heic)$/i.test(attachmentUrl);
        await sendMessage.mutateAsync({
          body: body.trim() || undefined,
          attachmentUrl: attachmentUrl || undefined,
          type: attachmentUrl ? (isImage ? "IMAGE" : "FILE") : "TEXT",
        });
      }
      setBody("");
      setAttachmentUrl("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that message.");
    }
  }

  function startEdit(message: ChatMessage) {
    setEditingId(message.id);
    setBody(message.body ?? "");
  }

  const name = otherUser?.displayName ?? otherUser?.usernameDisplay ?? "Conversation";

  if (isError) {
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <Link href="/chat" className="text-sm font-medium text-slate-500 hover:text-slate-700 md:hidden">
          ← Back
        </Link>
        <EmptyState
          title="Conversation not found"
          description="This conversation doesn't exist, or you're not a part of it."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5 py-4">
        <Link
          href="/chat"
          aria-label="Back to chats"
          className="shrink-0 text-lg font-medium text-slate-500 hover:text-slate-700 md:hidden"
        >
          ←
        </Link>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            paletteForKey(otherUser?.id ?? conversationId).chip,
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          {otherUser && <p className="truncate text-xs text-slate-500">@{otherUser.usernameDisplay}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No messages yet. Say hello.</p>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.dateKey} className="space-y-3">
              <div className="flex justify-center">
                <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-500">
                  {group.label}
                </span>
              </div>
              {group.items.map((m) => (
                <Bubble
                  key={m.id}
                  message={m}
                  isOwn={m.senderId === user?.id}
                  onEdit={startEdit}
                  onDelete={(id) => void deleteMessage.mutateAsync(id)}
                />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-100 p-4">
        <ErrorText>{error}</ErrorText>
        {editingId && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
            Editing message
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setBody("");
              }}
              className="font-medium hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
        {attachmentUrl && !editingId && (
          <div className="mb-2 flex items-center gap-2 text-xs text-emerald-700">
            Attachment ready.
            <button type="button" onClick={() => setAttachmentUrl("")} className="font-medium hover:underline">
              Remove
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {!editingId && (
            <label
              className={cn(
                "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50",
                isUploading && "cursor-not-allowed opacity-60",
              )}
            >
              <PaperclipIcon className="h-4 w-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => void handleFileChange(e)}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          )}
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isUploading ? "Uploading…" : "Type a message..."}
            disabled={isUploading}
            className="flex-1 rounded-full"
          />
          <Button
            type="submit"
            isLoading={sendMessage.isPending || editMessage.isPending}
            disabled={isUploading}
            className="h-10 w-10 shrink-0 rounded-full p-0"
          >
            <SendIcon className="h-4 w-4" />
            <span className="sr-only">{editingId ? "Save" : "Send"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
