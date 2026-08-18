import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";
import type { Category } from "../types";

export function useCategories(kind?: "INCOME" | "EXPENSE") {
  const query = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });
  const data = kind ? query.data?.filter((c) => c.kind === kind) : query.data;
  return { ...query, data };
}
