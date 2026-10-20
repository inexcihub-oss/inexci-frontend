"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { surgeryRequestKeys } from "@/lib/query-keys";

export function useSurgeryRequestMutation<TVariables = void, TData = unknown>(
  surgeryRequestId: string | number,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<
    UseMutationOptions<TData, unknown, TVariables>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, unknown, TVariables>({
    ...options,
    mutationFn,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({
        queryKey: surgeryRequestKeys.detail(surgeryRequestId),
      });
      void queryClient.invalidateQueries({
        queryKey: surgeryRequestKeys.kanban(),
      });
      void queryClient.invalidateQueries({
        queryKey: surgeryRequestKeys.agenda(),
      });
      return options?.onSuccess?.(...args);
    },
  });
}
