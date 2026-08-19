import { useQuery } from "@tanstack/react-query";
import type { CreateExpenseRequest, UpdateExpenseRequest } from "@finance/shared";
import { createResourceHooks } from "./create-resource-hooks";
import { api } from "../api-client";
import type { ExpenseRecord, PaginatedResult, SharedExpenseRecord } from "../types";

export const {
  useList: useExpenseList,
  useCreate: useCreateExpense,
  useUpdate: useUpdateExpense,
  useRemove: useRemoveExpense,
} = createResourceHooks<ExpenseRecord, CreateExpenseRequest, UpdateExpenseRequest>("/expenses", "expenses");

export function useSharedWithMeExpenses() {
  return useQuery({
    queryKey: ["expenses", "shared-with-me"],
    queryFn: () => api.get<PaginatedResult<SharedExpenseRecord>>("/expenses/shared-with-me"),
  });
}
