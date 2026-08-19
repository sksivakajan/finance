import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";
import type { BalanceHistoryPoint, CashFlowMonth, CategoryBreakdownEntry, IncomeSummary, MonthlySeriesPoint } from "../types";

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

export function useMonthlySeries(kind: "INCOME" | "EXPENSE", months: number) {
  const path = kind === "INCOME" ? "income" : "expenses";
  return useQuery({
    queryKey: ["reports", path, months],
    queryFn: () => api.get<MonthlySeriesPoint[]>(`/reports/${path}?months=${months}`),
  });
}

export function useIncomeSummary() {
  return useQuery({
    queryKey: ["reports", "income-summary"],
    queryFn: () => api.get<IncomeSummary>("/reports/income-summary"),
  });
}

export function useCategoryBreakdown(kind: "INCOME" | "EXPENSE", range?: { from: string; to: string }) {
  const query = range ? `&from=${range.from}&to=${range.to}` : "";
  return useQuery({
    queryKey: ["reports", "category-breakdown", kind, range?.from, range?.to],
    queryFn: () => api.get<CategoryBreakdownEntry[]>(`/reports/category-breakdown?kind=${kind}${query}`),
  });
}
