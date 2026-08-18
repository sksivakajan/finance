import type { CreateIncomeRequest } from "@finance/shared";
import { createResourceHooks } from "./create-resource-hooks";
import type { IncomeRecord } from "../types";

export const { useList: useIncomeList, useCreate: useCreateIncome, useRemove: useRemoveIncome } = createResourceHooks<
  IncomeRecord,
  CreateIncomeRequest
>("/income", "income");
