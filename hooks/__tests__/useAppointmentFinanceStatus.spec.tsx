import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test-utils/render-with-providers";

vi.mock("@/services/finance.service", () => ({
  financeService: { getAppointmentsStatus: vi.fn() },
}));

import { financeService } from "@/services/finance.service";
import {
  emLotes,
  LIMITE_DE_IDS_POR_CHAMADA,
  useAppointmentsFinanceStatus,
} from "@/hooks/useAppointmentFinanceStatus";
import { ReceivableStatus } from "@/types/finance.types";

const getStatus = vi.mocked(financeService.getAppointmentsStatus);

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe("emLotes", () => {
  it("divide em lotes do tamanho pedido", () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(emLotes([], 2)).toEqual([]);
  });
});

describe("useAppointmentsFinanceStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStatus.mockImplementation(async (ids) =>
      ids.map((id) => ({
        appointmentId: id,
        receivableId: `r-${id}`,
        status: ReceivableStatus.OPEN,
      })),
    );
  });

  it("consulta mais de 200 consultas em lotes paralelos e junta tudo", async () => {
    const ids = Array.from({ length: 450 }, (_, i) =>
      `a-${String(i).padStart(3, "0")}`,
    );
    const { result } = renderHook(
      () => useAppointmentsFinanceStatus(ids, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.porConsulta.size).toBe(450));
    expect(getStatus).toHaveBeenCalledTimes(3);
    for (const [lote] of getStatus.mock.calls) {
      expect(lote.length).toBeLessThanOrEqual(LIMITE_DE_IDS_POR_CHAMADA);
    }
    expect(getStatus.mock.calls.flatMap(([lote]) => lote).sort()).toEqual(
      [...ids].sort(),
    );
    expect(result.current.porConsulta.get("a-449")?.receivableId).toBe(
      "r-a-449",
    );
  });

  it("faz uma chamada só quando cabe num lote", async () => {
    const { result } = renderHook(
      () => useAppointmentsFinanceStatus(["a-1", "a-1", "a-2"], true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.porConsulta.size).toBe(2));
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(getStatus).toHaveBeenCalledWith(["a-1", "a-2"]);
  });
});
