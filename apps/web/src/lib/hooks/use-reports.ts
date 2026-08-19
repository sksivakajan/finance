import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";
import type { BalanceHistoryPoint, CashFlowMonth, CategoryBreakdownEntry } from "../types";

export function useBalanceHistory(days: number) {
  return useQuery({
    queryKey: ["reports", "balance-history", days],
    queryFn: () => api.get<BalanceHistoryPoint[]>(`/reports/balance-history?days=${days}`),
  });
}

export function useCashFlow(months: number) {
  return useQuery({
    queryKey: ["reports", "cash-flow", months],
    queryFn: () => api.get<CashFlowMonth[]>(`/reports/cash-flow?months=${months}`),
  });
}

export function useCategoryBreakdown(kind: "INCOME" | "EXPENSE") {
  return useQuery({
    queryKey: ["reports", "category-breakdown", kind],
    queryFn: () => api.get<CategoryBreakdownEntry[]>(`/reports/category-breakdown?kind=${kind}`),
  });
}
