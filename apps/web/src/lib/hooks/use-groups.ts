import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateGroupInput, CreateExpenseRequest } from "@finance/shared";
import { api } from "../api-client";
import type { ExpenseRecord, FriendBalance, GroupRecord, PaginatedResult } from "../types";

export function useGroups() {
  return useQuery({
    queryKey: ["groups", "list"],
    queryFn: () => api.get<{ items: GroupRecord[] }>("/groups"),
  });
}

export function useGroup(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", groupId],
    queryFn: () => api.get<GroupRecord>(`/groups/${groupId}`),
    enabled: Boolean(groupId),
  });
}

export function useGroupBalances(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", groupId, "balances"],
    queryFn: () => api.get<{ items: FriendBalance[] }>(`/groups/${groupId}/balances`),
    enabled: Boolean(groupId),
  });
}

export function useGroupExpenses(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", groupId, "expenses"],
    queryFn: () => api.get<PaginatedResult<ExpenseRecord>>(`/groups/${groupId}/expenses`),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroupExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseRequest) => api.post<ExpenseRecord>("/expenses", { ...input, groupId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["balances"] });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => api.post<GroupRecord>("/groups", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<GroupRecord>(`/groups/${groupId}/members`, { userId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["groups", groupId] }),
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}
