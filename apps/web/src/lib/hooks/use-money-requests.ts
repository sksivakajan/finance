import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMoneyRequestRequest } from "@finance/shared";
import { api } from "../api-client";
import type { MoneyRequestRecord } from "../types";

export function useMoneyRequests(direction: "incoming" | "outgoing") {
  return useQuery({
    queryKey: ["money-requests", direction],
    queryFn: () => api.get<{ items: MoneyRequestRecord[] }>(`/money-requests?direction=${direction}`),
  });
}

function useInvalidateMoneyRequests() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["money-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["balances"] });
    void queryClient.invalidateQueries({ queryKey: ["settlements"] });
  };
}

export function useCreateMoneyRequest() {
  const invalidate = useInvalidateMoneyRequests();
  return useMutation({
    mutationFn: (input: CreateMoneyRequestRequest) => api.post<MoneyRequestRecord>("/money-requests", input),
    onSuccess: invalidate,
  });
}

export function usePayMoneyRequest() {
  const invalidate = useInvalidateMoneyRequests();
  return useMutation({
    mutationFn: (id: string) => api.post(`/money-requests/${id}/pay`),
    onSuccess: invalidate,
  });
}

export function useDeclineMoneyRequest() {
  const invalidate = useInvalidateMoneyRequests();
  return useMutation({
    mutationFn: (id: string) => api.post(`/money-requests/${id}/decline`),
    onSuccess: invalidate,
  });
}

export function useCancelMoneyRequest() {
  const invalidate = useInvalidateMoneyRequests();
  return useMutation({
    mutationFn: (id: string) => api.post(`/money-requests/${id}/cancel`),
    onSuccess: invalidate,
  });
}
