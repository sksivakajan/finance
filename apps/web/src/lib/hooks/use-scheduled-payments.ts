import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateScheduledPaymentRequest } from "@finance/shared";
import { api } from "../api-client";
import type { PaginatedResult, ScheduledPaymentRecord } from "../types";

export function useScheduledPaymentList() {
  return useQuery({
    queryKey: ["scheduled-payments", "list"],
    queryFn: () => api.get<PaginatedResult<ScheduledPaymentRecord>>("/scheduled-payments"),
  });
}

export function useCreateScheduledPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduledPaymentRequest) => api.post<ScheduledPaymentRecord>("/scheduled-payments", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-payments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarkScheduledPaymentPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ScheduledPaymentRecord>(`/scheduled-payments/${id}/mark-paid`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-payments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRemoveScheduledPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/scheduled-payments/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scheduled-payments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
