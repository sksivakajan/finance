import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import type { Friend, FriendRequestView, FriendUser } from "../types";

export function useFriendList() {
  return useQuery({
    queryKey: ["friends", "list"],
    queryFn: () => api.get<{ items: Friend[] }>("/friends"),
  });
}

export function useFriendRequests(direction: "incoming" | "outgoing") {
  return useQuery({
    queryKey: ["friends", "requests", direction],
    queryFn: () => api.get<{ items: FriendRequestView[] }>(`/friends/requests?direction=${direction}`),
  });
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ["friends", "blocked"],
    queryFn: () => api.get<{ items: FriendUser[] }>("/friends/blocked"),
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["friends", "search", query],
    queryFn: () => api.get<{ items: FriendUser[] }>(`/friends/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });
}

function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["friends"] });
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (username: string) => api.post("/friends/requests", { username }),
    onSuccess: invalidate,
  });
}

export function useRespondToFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "reject" | "cancel" }) =>
      api.post(`/friends/requests/${id}/${action}`),
    onSuccess: invalidate,
  });
}

export function useRemoveFriend() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (friendshipId: string) => api.delete(`/friends/${friendshipId}`),
    onSuccess: invalidate,
  });
}

export function useBlockUser() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/friends/${userId}/block`),
    onSuccess: invalidate,
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/friends/${userId}/unblock`),
    onSuccess: invalidate,
  });
}
