"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
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
import type { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorText } from "@/components/ui/error-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

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
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className="max-w-[75%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-sm",
            isOwn ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900",
            message.deleted && "italic opacity-60",
          )}
        >
          {message.deleted ? (
            "Message deleted"
          ) : (
            <>
              {message.attachmentUrl && message.type === "IMAGE" && (
                // eslint-disable-next-line @next/next/no-img-element -- remote-served local upload, not a Next-optimizable static asset
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${message.attachmentUrl}`}
                  alt="Attachment"
                  className="mb-1.5 max-h-64 rounded-lg"
                />
              )}
              {message.attachmentUrl && message.type !== "IMAGE" && (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${message.attachmentUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("mb-1.5 block underline", isOwn ? "text-indigo-100" : "text-indigo-700")}
                >
                  📎 Attachment
                </a>
              )}
              {message.body}
              {message.editedAt && <span className="ml-1.5 text-[10px] opacity-70">(edited)</span>}
            </>
          )}
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
  const messages = messagesData ? [...messagesData.items].reverse() : [];

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
      <div className="space-y-4">
        <Link href="/chat" className="text-sm font-medium text-slate-500 hover:text-slate-700">
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
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <Link href="/chat" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Back
        </Link>
        <h1 className="text-base font-semibold text-slate-900">{name}</h1>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => (
            <Bubble
              key={m.id}
              message={m}
              isOwn={m.senderId === user?.id}
              onEdit={startEdit}
              onDelete={(id) => void deleteMessage.mutateAsync(id)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-200 pt-3">
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
        <div className="flex items-end gap-2">
          {!editingId && (
            <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              📎
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
            placeholder={isUploading ? "Uploading…" : "Type a message"}
            disabled={isUploading}
            className="flex-1"
          />
          <Button type="submit" isLoading={sendMessage.isPending || editMessage.isPending} disabled={isUploading}>
            {editingId ? "Save" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
