import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";
import type { DashboardSummary } from "../types";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
  });
}
