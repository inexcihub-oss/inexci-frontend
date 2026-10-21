import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test-utils/render-with-providers";
import {
  FINANCE_INVALIDATION_KEYS,
  useFinanceMutation,
} from "@/hooks/useFinanceMutation";
import { financeKeys } from "@/lib/query-keys";

describe("useFinanceMutation", () => {
  it("invalida cobranças, recebimentos, resumo do paciente, agenda, caixa e relatórios", async () => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const onSuccess = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useFinanceMutation((n: number) => Promise.resolve(n * 2), {
          onSuccess,
          invalidate: [financeKeys.accounts()],
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync(2);
    });

    const chaves = invalidate.mock.calls.map(([f]) => f?.queryKey);
    expect(chaves).toEqual([...FINANCE_INVALIDATION_KEYS, financeKeys.accounts()]);
    expect(FINANCE_INVALIDATION_KEYS).toEqual([
      financeKeys.receivables(),
      financeKeys.payments(),
      financeKeys.patientSummaries(),
      financeKeys.appointmentStatuses(),
      financeKeys.cash(),
      financeKeys.reports(),
    ]);
    expect(onSuccess).toHaveBeenCalled();
    expect(onSuccess.mock.calls[0][0]).toBe(4);
  });
});
