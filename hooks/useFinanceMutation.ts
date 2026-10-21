"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { financeKeys } from "@/lib/query-keys";

export const FINANCE_INVALIDATION_KEYS: readonly QueryKey[] = [
  financeKeys.receivables(),
  financeKeys.payments(),
  financeKeys.patientSummaries(),
  financeKeys.appointmentStatuses(),
  financeKeys.cash(),
  financeKeys.reports(),
];

export type FinanceMutationOptions<TVariables, TData> = Omit<
  UseMutationOptions<TData, unknown, TVariables>,
  "mutationFn"
> & { invalidate?: readonly QueryKey[] };

export function useFinanceMutation<TVariables = void, TData = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: FinanceMutationOptions<TVariables, TData>,
) {
  const queryClient = useQueryClient();
  const { invalidate = [], ...mutationOptions } = options ?? {};
  return useMutation<TData, unknown, TVariables>({
    ...mutationOptions,
    mutationFn,
    onSuccess: (...args) => {
      for (const queryKey of [...FINANCE_INVALIDATION_KEYS, ...invalidate]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      return mutationOptions.onSuccess?.(...args);
    },
  });
}
