import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  getAccountErrors: vi.fn(),
  getErrorOccurrences: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminAccountErrorsTab } from "./AdminAccountErrorsTab";

const FP = "b".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  svc.getAccountErrors.mockResolvedValue({
    ownerId: "o-1",
    fromDay: "2026-09-29",
    toDay: "2026-10-28",
    totals: { total: 4, accounts: 1, fingerprints: 2, failedDeliveries: 1 },
    daily: [],
    fingerprints: {
      items: [
        {
          fingerprint: FP,
          source: "queue",
          errorClass: "Error",
          route: "pdf-generation",
          lastMessage: "Chromium travou",
          total: 4,
          accounts: 1,
          firstSeenAt: "2026-10-20T10:00:00Z",
          lastSeenAt: "2026-10-27T13:00:00Z",
          lastRequestId: null,
          exploreUrl: null,
        },
      ],
      total: 1,
    },
    lokiAvailable: true,
  });
  svc.getErrorOccurrences.mockResolvedValue({
    fingerprint: FP,
    occurrences: [],
    logs: [],
    lokiAvailable: true,
    lokiError: "unavailable",
  });
});

describe("AdminAccountErrorsTab", () => {
  it("lista os erros da conta, sem contagem de contas, e filtra pelo período", async () => {
    renderWithProviders(<AdminAccountErrorsTab ownerId="o-1" />);
    expect(await screen.findByText("Chromium travou")).toBeInTheDocument();
    expect(screen.getByText("Tipos de erro")).toBeInTheDocument();
    expect(screen.queryByText("Contas mais afetadas")).toBeNull();
    expect(screen.getByText(/4 ocorrências · última/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver no Grafana/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Ver envios" })).toHaveAttribute(
      "href",
      "/admin/envios?conta=o-1&situacao=failed",
    );

    fireEvent.click(screen.getByRole("button", { name: "7 dias" }));
    await waitFor(() =>
      expect(svc.getAccountErrors).toHaveBeenLastCalledWith("o-1", {
        days: 7,
        limit: 20,
        offset: 0,
      }),
    );
  });

  it("ocorrências ficam presas à conta e avisam quando o Grafana não responde", async () => {
    renderWithProviders(<AdminAccountErrorsTab ownerId="o-1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Ver ocorrências/ }),
    );
    expect(
      await screen.findByText(/Não foi possível consultar o Grafana agora/),
    ).toBeInTheDocument();
    expect(svc.getErrorOccurrences).toHaveBeenCalledWith(FP, {
      days: 30,
      ownerId: "o-1",
    });
  });
});
