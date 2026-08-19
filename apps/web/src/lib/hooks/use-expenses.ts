import type { CreateExpenseRequest, UpdateExpenseRequest } from "@finance/shared";
import { createResourceHooks } from "./create-resource-hooks";
import type { ExpenseRecord } from "../types";

export const {
  useList: useExpenseList,
  useCreate: useCreateExpense,
  useUpdate: useUpdateExpense,
  useRemove: useRemoveExpense,
} = createResourceHooks<ExpenseRecord, CreateExpenseRequest, UpdateExpenseRequest>("/expenses", "expenses");
