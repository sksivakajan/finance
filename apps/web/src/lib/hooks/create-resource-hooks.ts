import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api-client";
import type { PaginatedResult } from "../types";

/** Shared list+create+delete hook factory for the simple CRUD resources
 * (Income, Expense). Scheduled payments and loans have extra actions
 * (mark-paid, record-payment) and get their own bespoke hooks instead. */
export function createResourceHooks<T, CreateInput, UpdateInput = Partial<CreateInput>>(
  basePath: string,
  queryKey: string,
) {
  function useList() {
    return useQuery({
      queryKey: [queryKey, "list"],
      queryFn: () => api.get<PaginatedResult<T>>(basePath),
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input: CreateInput) => api.post<T>(basePath, input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [queryKey] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      },
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateInput }) => api.patch<T>(`${basePath}/${id}`, input),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [queryKey] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      },
    });
  }

  function useRemove() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api.delete(`${basePath}/${id}`),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [queryKey] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      },
    });
  }

  return { useList, useCreate, useUpdate, useRemove };
}
