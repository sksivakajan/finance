import type { CreateExpenseRequest } from "@finance/shared";
import { createResourceHooks } from "./create-resource-hooks";
import type { ExpenseRecord } from "../types";

export const {
  useList: useExpenseList,
  useCreate: useCreateExpense,
  useRemove: useRemoveExpense,
} = createResourceHooks<ExpenseRecord, CreateExpenseRequest>("/expenses", "expenses");
