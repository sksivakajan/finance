import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateLoanRequest, CreateLoanPaymentRequest, UpdateLoanInput } from "@finance/shared";
import { api } from "../api-client";
import type { LoanRecord } from "../types";

export function useLoanList() {
  return useQuery({
    queryKey: ["loans", "list"],
    queryFn: () => api.get<LoanRecord[]>("/loans"),
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLoanRequest) => api.post<LoanRecord>("/loans", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLoanInput }) => api.patch<LoanRecord>(`/loans/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAddLoanPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, input }: { loanId: string; input: CreateLoanPaymentRequest }) =>
      api.post(`/loans/${loanId}/payments`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
