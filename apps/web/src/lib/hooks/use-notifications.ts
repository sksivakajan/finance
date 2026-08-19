import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import type { NotificationRecord, PaginatedResult } from "../types";

const NOTIFICATION_POLL_MS = 15_000;

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    refetchInterval: NOTIFICATION_POLL_MS,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => api.get<PaginatedResult<NotificationRecord>>("/notifications"),
    refetchInterval: NOTIFICATION_POLL_MS,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
