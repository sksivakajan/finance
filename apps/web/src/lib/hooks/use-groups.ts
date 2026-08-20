import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateGroupInput, CreateExpenseRequest } from "@finance/shared";
import { api } from "../api-client";
import type { ExpenseRecord, FriendBalance, GroupRecord, PaginatedResult } from "../types";

export function useGroups() {
  return useQuery({
    queryKey: ["groups", "list"],
    queryFn: () => api.get<{ items: GroupRecord[] }>("/groups"),
  });
}

export function useGroup(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", groupId],
    queryFn: () => api.get<GroupRecord>(`/groups/${groupId}`),
    enabled: Boolean(groupId),
  });
}

export function useGroupBalances(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", groupId, "balances"],
    queryFn: () => api.get<{ items: FriendBalance[] }>(`/groups/${groupId}/balances`),
    enabled: Boolean(groupId),
  });
}

export function useGroupExpenses(groupId: string | null) {
  return useQuery({
    queryKey: ["groups", groupId, "expenses"],
    queryFn: () => api.get<PaginatedResult<ExpenseRecord>>(`/groups/${groupId}/expenses`),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroupExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseRequest) => api.post<ExpenseRecord>("/expenses", { ...input, groupId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["groups", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["balances"] });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => api.post<GroupRecord>("/groups", input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<GroupRecord>(`/groups/${groupId}/members`, { userId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["groups", groupId] }),
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export interface GroupSummary {
  group: GroupRecord;
  currency: string;
  owedMinor: number;
  oweMinor: number;
  totalExpensesMinor: number;
}

/**
 * Per-group money totals for the groups list page ("you are owed" / "you
 * owe" / total expenses), derived client-side since the API has no
 * aggregate-stats endpoint: each group's balances and expenses are fetched
 * in parallel and reduced here.
 */
export function useGroupsSummary(defaultCurrency: string) {
  const { data: groupsData, isLoading: groupsLoading } = useGroups();
  const groups = groupsData?.items ?? [];

  const balanceQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: ["groups", g.id, "balances"],
      queryFn: () => api.get<{ items: FriendBalance[] }>(`/groups/${g.id}/balances`),
    })),
  });

  const expenseQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: ["groups", g.id, "expenses"],
      queryFn: () => api.get<PaginatedResult<ExpenseRecord>>(`/groups/${g.id}/expenses`),
    })),
  });

  const isLoading = groupsLoading || balanceQueries.some((q) => q.isLoading) || expenseQueries.some((q) => q.isLoading);

  const summaries: GroupSummary[] = groups.map((g, i) => {
    const balances = balanceQueries[i]?.data?.items ?? [];
    const expenses = expenseQueries[i]?.data?.items ?? [];
    let owedMinor = 0;
    let oweMinor = 0;
    let currency = defaultCurrency;
    for (const b of balances) {
      for (const c of b.balances) {
        const net = Number(c.netMinor);
        if (net > 0) owedMinor += net;
        else oweMinor += -net;
        currency = c.currency;
      }
    }
    if (expenses[0]) currency = expenses[0].currency;
    const totalExpensesMinor = expenses.reduce((sum, e) => sum + Number(e.amountMinor), 0);
    return { group: g, currency, owedMinor, oweMinor, totalExpensesMinor };
  });

  const totals = summaries.reduce(
    (acc, s) => ({
      totalMembers: acc.totalMembers + s.group.members.length,
      owedMinor: acc.owedMinor + s.owedMinor,
      oweMinor: acc.oweMinor + s.oweMinor,
    }),
    { totalMembers: 0, owedMinor: 0, oweMinor: 0 },
  );

  return {
    summaries,
    totals,
    isLoading,
    totalGroups: groups.length,
    currency: summaries[0]?.currency ?? defaultCurrency,
  };
}
