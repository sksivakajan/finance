import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSettlementRequest } from "@finance/shared";
import { api } from "../api-client";
import type { CurrencyBalance, FriendBalance, OptimizeResult, SettlementRecord } from "../types";

export function useBalances() {
  return useQuery({
    queryKey: ["balances", "list"],
    queryFn: () => api.get<{ items: FriendBalance[] }>("/balances"),
  });
}

export function useBalanceWith(friendId: string | null) {
  return useQuery({
    queryKey: ["balances", "with", friendId],
    queryFn: () => api.get<CurrencyBalance[]>(`/balances/${friendId}`),
    enabled: Boolean(friendId),
  });
}

export function useGroupOptimize(groupId: string | null) {
  return useQuery({
    queryKey: ["balances", "optimize", groupId],
    queryFn: () => api.get<OptimizeResult>(`/balances/optimize?groupId=${groupId}`),
    enabled: Boolean(groupId),
  });
}

export function useSettlementsWith(friendId: string | null) {
  return useQuery({
    queryKey: ["settlements", friendId],
    queryFn: () => api.get<{ items: SettlementRecord[] }>(`/settlements/${friendId}`),
    enabled: Boolean(friendId),
  });
}

function useInvalidateBalances() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["balances"] });
    void queryClient.invalidateQueries({ queryKey: ["settlements"] });
    void queryClient.invalidateQueries({ queryKey: ["money-requests"] });
  };
}

export function useCreateSettlement() {
  const invalidate = useInvalidateBalances();
  return useMutation({
    mutationFn: (input: CreateSettlementRequest) => api.post<SettlementRecord>("/settlements", input),
    onSuccess: invalidate,
  });
}
