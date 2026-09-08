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

function NightSkyBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden dark:block">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #0a0e27 0%, #1e1b4b 42%, #3b2266 72%, #5b3a72 100%)" }}
      />
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 10% 12%, #fff, transparent), radial-gradient(1px 1px at 25% 38%, #fff, transparent), radial-gradient(1.5px 1.5px at 42% 8%, #fff, transparent), radial-gradient(1px 1px at 58% 52%, #fff, transparent), radial-gradient(1px 1px at 72% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 85% 42%, #fff, transparent), radial-gradient(1px 1px at 15% 60%, #fff, transparent), radial-gradient(1px 1px at 93% 12%, #fff, transparent), radial-gradient(1.5px 1.5px at 63% 30%, #fff, transparent), radial-gradient(1px 1px at 35% 68%, #fff, transparent), radial-gradient(1px 1px at 6% 45%, #fff, transparent), radial-gradient(1px 1px at 48% 58%, #fff, transparent)",
          backgroundSize: "100% 55%",
          backgroundRepeat: "repeat-y",
        }}
      />
      <svg
        className="absolute right-8 top-7 h-9 w-9 text-amber-100/90"
        style={{ filter: "drop-shadow(0 0 18px rgba(253, 230, 138, 0.45))" }}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      <svg className="absolute bottom-0 left-0 h-28 w-full" viewBox="0 0 400 110" preserveAspectRatio="none" fill="none">
        <path
          d="M0 110 L0 65 L40 38 L80 60 L120 28 L160 55 L200 18 L240 50 L280 32 L320 62 L360 42 L400 68 L400 110 Z"
          fill="#2c2158"
          opacity="0.6"
        />
        <path
          d="M0 110 L0 88 L50 55 L90 78 L140 46 L180 74 L230 42 L270 72 L320 50 L360 82 L400 65 L400 110 Z"
          fill="#181031"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

function DaySkyBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 block overflow-hidden dark:hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #bfdbfe 0%, #dbeafe 42%, #ede9fe 72%, #f5f3ff 100%)" }}
      />
      <svg
        className="absolute right-8 top-7 h-10 w-10 text-amber-300"
        style={{ filter: "drop-shadow(0 0 20px rgba(252, 211, 77, 0.55))" }}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="12" cy="12" r="6" />
      </svg>
      <div className="opacity-70">
        <svg className="absolute left-10 top-12 h-6 w-16 text-white" viewBox="0 0 64 24" fill="currentColor">
          <path d="M14 20a8 8 0 0 1-2-15.75A9 9 0 0 1 29 3a7 7 0 0 1 9.5 7.68A7.5 7.5 0 0 1 37 20Z" />
        </svg>
        <svg className="absolute left-44 top-24 h-5 w-14 text-white" viewBox="0 0 64 24" fill="currentColor">
          <path d="M14 20a8 8 0 0 1-2-15.75A9 9 0 0 1 29 3a7 7 0 0 1 9.5 7.68A7.5 7.5 0 0 1 37 20Z" />
        </svg>
      </div>
      <svg className="absolute bottom-0 left-0 h-28 w-full" viewBox="0 0 400 110" preserveAspectRatio="none" fill="none">
        <path
          d="M0 110 L0 65 L40 38 L80 60 L120 28 L160 55 L200 18 L240 50 L280 32 L320 62 L360 42 L400 68 L400 110 Z"
          fill="#c7d2fe"
          opacity="0.7"
        />
        <path
          d="M0 110 L0 88 L50 55 L90 78 L140 46 L180 74 L230 42 L270 72 L320 50 L360 82 L400 65 L400 110 Z"
          fill="#a5b4fc"
          opacity="0.8"
        />
      </svg>
    </div>
  );
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
              isOwn ? "bg-indigo-600 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50",
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
                      isOwn ? "border-white/25 bg-white/10" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isOwn ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
                      )}
                    >
                      <PaperclipIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">Attachment</span>
                      <span className={cn("block text-[11px]", isOwn ? "text-indigo-100" : "text-slate-500 dark:text-slate-400")}>
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
          <span className="shrink-0 pb-0.5 text-[11px] text-slate-400 dark:text-slate-500">{formatMessageTime(message.createdAt)}</span>
        </div>
        {isOwn && !message.deleted && (
          <div className="mt-0.5 flex justify-end gap-2 text-[10px] text-slate-400 dark:text-slate-500">
            <button type="button" onClick={() => onEdit(message)} className="hover:text-slate-600 dark:hover:text-slate-300">
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
        <Link href="/chat" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 md:hidden">
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
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 p-5 py-4">
        <Link
          href="/chat"
          aria-label="Back to chats"
          className="shrink-0 text-lg font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 md:hidden"
        >
          ←
        </Link>
        {otherUser?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- proxied same-origin /uploads URL, not an <Image>-optimizable remote host
          <img src={otherUser.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              paletteForKey(otherUser?.id ?? conversationId).chip,
            )}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{name}</p>
          {otherUser && <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{otherUser.usernameDisplay}</p>}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <DaySkyBackdrop />
        <NightSkyBackdrop />
        <div className="relative z-10 h-full space-y-3 overflow-y-auto bg-transparent px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-300">No messages yet. Say hello.</p>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                <div className="flex justify-center">
                  <span className="rounded-full bg-slate-200 dark:bg-white/15 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-100">
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
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-100 dark:border-slate-800 p-4">
        <ErrorText>{error}</ErrorText>
        {editingId && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
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
          <div className="mb-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
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
                "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60",
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
