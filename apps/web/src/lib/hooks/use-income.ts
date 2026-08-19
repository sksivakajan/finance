import type { CreateIncomeRequest, UpdateIncomeRequest } from "@finance/shared";
import { createResourceHooks } from "./create-resource-hooks";
import type { IncomeRecord } from "../types";

export const {
  useList: useIncomeList,
  useCreate: useCreateIncome,
  useUpdate: useUpdateIncome,
  useRemove: useRemoveIncome,
} = createResourceHooks<IncomeRecord, CreateIncomeRequest, UpdateIncomeRequest>("/income", "income");
