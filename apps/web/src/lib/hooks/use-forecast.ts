import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";

export interface ForecastPoint {
  date: string;
  label: string;
  kind: "INCOME" | "EXPENSE" | "SCHEDULED_PAYMENT" | "LOAN_INSTALLMENT";
  amountMinor: string;
  projectedBalanceMinor: string;
}

export interface CashFlowForecast {
  asOf: string;
  horizonDays: number;
  startingBalanceMinor: string;
  projectedEndingBalanceMinor: string;
  points: ForecastPoint[];
  isEstimate: true;
}

export interface LoanPayoffForecast {
  loanId: string;
  currency: string;
  points: { date: string; remainingMinor: string }[];
  isEstimate: true;
}

export function useCashFlowForecast(days: number) {
  return useQuery({
    queryKey: ["forecast", "cash-flow", days],
    queryFn: () => api.get<CashFlowForecast>(`/forecast?days=${days}`),
  });
}

export function useLoanPayoffForecast(loanId: string | null) {
  return useQuery({
    queryKey: ["forecast", "loan", loanId],
    queryFn: () => api.get<LoanPayoffForecast>(`/forecast/loans/${loanId}`),
    enabled: Boolean(loanId),
  });
}
