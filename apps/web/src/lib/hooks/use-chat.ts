import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMessageRequest } from "@finance/shared";
import { api } from "../api-client";
import type { ChatMessage, ConversationSummary, PaginatedResult } from "../types";

// No WebSocket gateway yet (socket.io isn't installable from this environment's
// registry — see apps/api/src/types/multer.d.ts for the same class of issue).
// Short-interval polling stands in for real-time until that's unblocked.
const CONVERSATION_LIST_POLL_MS = 8_000;
const MESSAGE_POLL_MS = 3_000;

export function useConversationList() {
  return useQuery({
    queryKey: ["conversations", "list"],
    queryFn: () => api.get<{ items: ConversationSummary[] }>("/conversations"),
    refetchInterval: CONVERSATION_LIST_POLL_MS,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversations", conversationId, "messages"],
    queryFn: () => api.get<PaginatedResult<ChatMessage>>(`/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
    refetchInterval: MESSAGE_POLL_MS,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendUserId: string) => api.post<{ id: string }>("/conversations", { friendUserId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMessageRequest) => api.post<ChatMessage>(`/conversations/${conversationId}/messages`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations", "list"] });
    },
  });
}

export function useEditMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.patch<ChatMessage>(`/messages/${id}`, { body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] }),
  });
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<ChatMessage>(`/messages/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations", "list"] });
    },
  });
}

export function useMarkConversationRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/conversations/${conversationId}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
