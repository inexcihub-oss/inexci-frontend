import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({ listAuditLogs: vi.fn(), listTeam: vi.fn() }));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

const replace = vi.hoisted(() => vi.fn());
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/historico",
  useSearchParams: () => new URLSearchParams(search),
}));

import { AdminAuditList } from "./AdminAuditList";

const item = {
  id: "l1",
  actorUserId: "a1",
  actorName: "Ana Admin",
  actorEmail: "ana@i.com",
  action: "TRIAL_EXTENDED",
  targetOwnerId: "o-9",
  targetUserId: null,
  targetName: null,
  reason: "Pediu mais tempo",
  before: { trialEndsAt: "2026-11-01T12:00:00Z", days: 15 },
  after: { trialEndsAt: "2026-11-16T12:00:00Z", days: 30 },
  gatewayRef: null,
  status: "succeeded",
  error: null,
  createdAt: "2026-10-23T15:30:00Z",
  completedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  svc.listAuditLogs.mockResolvedValue({ items: [item], total: 1 });
  svc.listTeam.mockResolvedValue([{ id: "a1", name: "Ana Admin" }]);
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

describe("AdminAuditList", () => {
  it("mostra a linha com ação em português, link da conta e situação", async () => {
    renderWithProviders(<AdminAuditList />);
    expect(
      await screen.findByText("Trial estendido", { selector: "td" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ana Admin", { selector: "td" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pediu mais tempo")).toBeInTheDocument();
    expect(screen.getByText("Concluída")).toBeInTheDocument();
    expect(screen.getByText("23/10/2026 12:30")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir conta" })).toHaveAttribute(
      "href",
      "/admin/clientes/o-9",
    );
  });

  it("mostra o nome do administrador alvo nas ações de equipe", async () => {
    svc.listAuditLogs.mockResolvedValue({
      items: [
        {
          ...item,
          action: "PLATFORM_ADMIN_ACCESS_RESET",
          targetOwnerId: null,
          targetUserId: "a2",
          targetName: "Bruno Admin",
        },
      ],
      total: 1,
    });
    renderWithProviders(<AdminAuditList />);
    expect(
      await screen.findByText("Acesso de administrador redefinido", {
        selector: "td",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bruno Admin")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir conta" })).toBeNull();
  });

  it("abre o drawer com antes e depois formatados", async () => {
    renderWithProviders(<AdminAuditList />);
    fireEvent.click(
      await screen.findByRole("link", { name: /Detalhes de Trial estendido/ }),
    );
    expect(screen.getByRole("region", { name: "Antes" })).toHaveTextContent(
      "01/11/2026 09:00",
    );
    expect(screen.getByRole("region", { name: "Depois" })).toHaveTextContent(
      "16/11/2026 09:00",
    );
    expect(screen.getByRole("region", { name: "Depois" })).toHaveTextContent(
      "30",
    );
  });

  it("filtros da URL vão para a API e mudanças atualizam a query string", async () => {
    search =
      "acao=COUPON_CREATED&autor=a1&conta=11111111-1111-4111-8111-111111111111&de=2026-10-01&ate=2026-10-02";
    renderWithProviders(<AdminAuditList />);
    await waitFor(() =>
      expect(svc.listAuditLogs).toHaveBeenCalledWith({
        action: "COUPON_CREATED",
        actorUserId: "a1",
        targetOwnerId: "11111111-1111-4111-8111-111111111111",
        from: "2026-10-01T00:00:00-03:00",
        to: "2026-10-02T23:59:59.999-03:00",
        limit: 25,
        offset: 0,
      }),
    );
    fireEvent.change(screen.getByLabelText("Ação"), {
      target: { value: "TRIAL_EXTENDED" },
    });
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("acao=TRIAL_EXTENDED"),
      { scroll: false },
    );
  });

  it("id de conta parcial não vai para a URL", () => {
    renderWithProviders(<AdminAuditList />);
    fireEvent.change(screen.getByLabelText("Conta (id)"), {
      target: { value: "1111-22" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe o id completo da conta.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("no celular os filtros ficam no botão Filtros e cada ação vira um card", async () => {
    mockMobile();
    renderWithProviders(<AdminAuditList />);

    const card = await screen.findByRole("link", {
      name: /Detalhes de Trial estendido/,
    });
    expect(card.tagName).toBe("LI");
    expect(card).toHaveTextContent("Pediu mais tempo");
    expect(screen.queryByRole("table")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Ação")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Autor")).toBeInTheDocument();
  });
});
