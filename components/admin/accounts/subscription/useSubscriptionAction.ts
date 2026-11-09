"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { adminKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/http-error";

export function useSubscriptionAction(
  action: () => Promise<unknown>,
  successMessage: string,
  onDone: () => void,
) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: action,
    onMutate: () => setServerError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
      showToast(successMessage, "success");
      onDone();
    },
    onError: (error) => {
      setServerError(
        getApiErrorMessage(error, "Não foi possível concluir a ação."),
      );
    },
  });

  return { mutation, serverError, clearError: () => setServerError(null) };
}
