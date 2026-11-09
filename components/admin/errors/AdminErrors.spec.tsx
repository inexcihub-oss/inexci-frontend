import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  getErrors: vi.fn(),
  getErrorOccurrences: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

const replace = vi.hoisted(() => vi.fn());
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/erros",
  useSearchParams: () => new URLSearchParams(search),
}));

import { AdminErrors } from "./AdminErrors";

const FP = "a".repeat(64);

const fingerprint = {
  fingerprint: FP,
  source: "http",
  errorClass: "TypeError",
  route: "POST /surgery-requests/:id/send",
  lastMessage: "Cannot read properties of undefined",
  total: 12,
  accounts: 3,
  firstSeenAt: "2026-10-20T10:00:00Z",
  lastSeenAt: "2026-10-27T13:00:00Z",
  lastRequestId: "req-12345678",
  exploreUrl: "https://g.net/explore?x=1",
};

const overview = (over: Record<string, unknown> = {}) => ({
  fromDay: "2026-10-26",
  toDay: "2026-10-28",
  totals: { total: 12, accounts: 3, fingerprints: 1, failedDeliveries: 7 },
  daily: [{ day: "2026-10-27", source: "http", total: 12 }],
  fingerprints: { items: [fingerprint], total: 1 },
  accounts: [
    {
      ownerId: "o-1",
      ownerName: "Clínica Alfa",
      total: 9,
      fingerprints: 1,
      lastSeenAt: "2026-10-27T13:00:00Z",
    },
  ],
  lokiAvailable: true,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  svc.getErrors.mockResolvedValue(overview());
  svc.getErrorOccurrences.mockResolvedValue({
    fingerprint: FP,
    occurrences: [
      {
        day: "2026-10-27",
        ownerId: "o-1",
        ownerName: "Clínica Alfa",
        count: 9,
        lastSeenAt: "2026-10-27T13:00:00Z",
        lastRequestId: "req-12345678",
        lastMessage: "x",
        route: "POST /x",
        exploreUrl: "https://g.net/explore?y=1",
      },
    ],
    logs: [
      {
        timestamp: "2026-10-27T13:00:00Z",
        level: "error",
        message: "TypeError: Cannot read properties of undefined at send",
        context: "ExceptionFilter",
        requestId: "req-12345678",
        traceId: null,
      },
    ],
    lokiAvailable: true,
    lokiError: null,
  });
});

function mockMobile() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(max-width: 639px)",
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminErrors", () => {
  it("mostra totais, gráfico acessível, erros frequentes e contas mais afetadas", async () => {
    renderWithProviders(<AdminErrors />);

    expect(
      await screen.findByText("Cannot read properties of undefined"),
    ).toBeInTheDocument();
    expect(svc.getErrors).toHaveBeenCalledWith({
      days: 30,
      limit: 20,
      offset: 0,
    });
    expect(screen.getByText("Contas afetadas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver envios" })).toHaveAttribute(
      "href",
      "/admin/envios?situacao=failed",
    );
    expect(
      screen.getByRole("table", { name: "Erros por dia" }),
    ).toHaveTextContent("27/10");
    expect(
      screen.getByText("12 ocorrências · 3 contas", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver no Grafana/ }),
    ).toHaveAttribute("href", "https://g.net/explore?x=1");
    const contas = screen.getByRole("region", { name: "Contas mais afetadas" });
    expect(within(contas).getByRole("link")).toHaveAttribute(
      "href",
      "/admin/clientes/o-1?tab=erros",
    );
  });

  it("filtros vão para a URL e para a API", async () => {
    search = "periodo=7&origem=queue&pagina=2";
    renderWithProviders(<AdminErrors />);
    await waitFor(() =>
      expect(svc.getErrors).toHaveBeenCalledWith({
        days: 7,
        source: "queue",
        limit: 20,
        offset: 20,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    expect(replace).toHaveBeenCalledWith(
      "/admin/erros?periodo=1&origem=queue",
      { scroll: false },
    );
    fireEvent.change(screen.getByLabelText("Origem"), {
      target: { value: "" },
    });
    expect(replace).toHaveBeenLastCalledWith("/admin/erros?periodo=7", {
      scroll: false,
    });
  });

  it("abre as ocorrências com os logs do Grafana", async () => {
    renderWithProviders(<AdminErrors />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Ver ocorrências/ }),
    );
    const logs = await screen.findByRole("region", { name: "Logs do Grafana" });
    expect(logs).toHaveTextContent("at send");
    expect(svc.getErrorOccurrences).toHaveBeenCalledWith(FP, { days: 30 });
    expect(
      screen.getByRole("region", { name: "Ocorrências por dia" }),
    ).toHaveTextContent("req-1234");
  });

  it("sem Grafana configurado avisa e mostra só as contagens", async () => {
    svc.getErrors.mockResolvedValue(overview({ lokiAvailable: false }));
    svc.getErrorOccurrences.mockResolvedValue({
      fingerprint: FP,
      occurrences: [],
      logs: [],
      lokiAvailable: false,
      lokiError: "not_configured",
    });
    renderWithProviders(<AdminErrors />);
    expect(
      await screen.findByText(/não está configurado neste ambiente/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver ocorrências/ }));
    expect(
      await screen.findByText(/ainda não está configurado neste ambiente/),
    ).toBeInTheDocument();
  });

  it("sem erros mostra o estado vazio", async () => {
    svc.getErrors.mockResolvedValue(
      overview({
        totals: { total: 0, accounts: 0, fingerprints: 0, failedDeliveries: 0 },
        daily: [],
        fingerprints: { items: [], total: 0 },
        accounts: [],
      }),
    );
    renderWithProviders(<AdminErrors />);
    expect(
      await screen.findByText("Nenhum erro no período"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhuma conta com erro no período."),
    ).toBeInTheDocument();
  });

  it("paginação avança pela URL", async () => {
    svc.getErrors.mockResolvedValue(
      overview({ fingerprints: { items: [fingerprint], total: 45 } }),
    );
    renderWithProviders(<AdminErrors />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Próxima página" }),
    );
    expect(replace).toHaveBeenCalledWith("/admin/erros?pagina=2", {
      scroll: false,
    });
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("erro na API mostra aviso", async () => {
    svc.getErrors.mockRejectedValue(new Error("x"));
    renderWithProviders(<AdminErrors />);
    expect(
      await screen.findByText("Não foi possível carregar os erros"),
    ).toBeInTheDocument();
  });

  it("no celular a origem fica no botão Filtros e o período continua à vista", async () => {
    mockMobile();
    renderWithProviders(<AdminErrors />);

    expect(
      await screen.findByRole("group", { name: "Período" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Origem")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Origem")).toBeInTheDocument();
  });
});
