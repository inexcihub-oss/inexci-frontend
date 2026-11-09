import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({ getSecurity: vi.fn() }));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

const replace = vi.hoisted(() => vi.fn());
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/seguranca",
  useSearchParams: () => new URLSearchParams(search),
}));

import { AdminSecurity } from "./AdminSecurity";

const zeros = {
  login_failed: 0,
  login_locked: 0,
  mfa_failed: 0,
  refresh_reuse: 0,
  password_changed: 0,
  mfa_enabled: 0,
  mfa_disabled: 0,
};

const overview = (over: Record<string, unknown> = {}) => ({
  fromDay: "2026-09-29",
  toDay: "2026-10-28",
  totals: {
    ...zeros,
    login_failed: 7,
    login_locked: 2,
    mfa_failed: 1,
    refresh_reuse: 3,
    mfa_enabled: 4,
  },
  unattributedLocks: 1,
  daily: [
    { day: "2026-10-27", eventType: "login_failed", total: 7 },
    { day: "2026-10-27", eventType: "mfa_enabled", total: 4 },
  ],
  failureAccounts: [
    {
      ownerId: "o-1",
      ownerName: "Clínica Ortho",
      total: 9,
      users: 2,
      lastSeenAt: "2026-10-27T15:00:00Z",
    },
  ],
  reuseAccounts: [],
  mfa: { activeUsers: 20, withoutMfa: 12 },
  spike: {
    accountThreshold: 10,
    platformThreshold: 50,
    platformTotal24h: 5,
    platformSpike: false,
    accountsWithSpike24h: 0,
    topSpikeAccounts: [],
  },
  lokiAvailable: false,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  svc.getSecurity.mockResolvedValue(overview());
});

describe("AdminSecurity", () => {
  it("mostra falhas, bloqueios, reuso e cobertura de duas etapas", async () => {
    renderWithProviders(<AdminSecurity />);

    const falhas = await screen.findByText("Falhas de login", {
      selector: "p",
    });
    expect(falhas.closest("div.flex.h-full")).toHaveTextContent("10");
    expect(
      screen
        .getByText("Logins bloqueados", { selector: "p" })
        .closest("div.flex.h-full"),
    ).toHaveTextContent("1 em e-mail que não é de ninguém");
    expect(
      screen
        .getByText("Reuso de sessão", { selector: "p" })
        .closest("div.flex.h-full"),
    ).toHaveTextContent("3");
    expect(
      screen
        .getByText("Sem duas etapas", { selector: "p" })
        .closest("div.flex.h-full"),
    ).toHaveTextContent("12 de 20");
  });

  it("lista eventos por tipo em português e contas com falha com link para a equipe", async () => {
    renderWithProviders(<AdminSecurity />);

    const tipos = await screen.findByRole("list", { name: "Eventos por tipo" });
    expect(tipos).toHaveTextContent("Senha errada7");
    expect(tipos).toHaveTextContent("Duas etapas ligada4");
    const link = screen.getByRole("link", { name: /Clínica Ortho/ });
    expect(link).toHaveAttribute("href", "/admin/clientes/o-1?tab=equipe");
    expect(link).toHaveTextContent("9 falhas");
    expect(
      screen.getByText("Nenhum reuso de sessão no período."),
    ).toBeInTheDocument();
  });

  it("o gráfico conta só falhas, não eventos de rotina", async () => {
    renderWithProviders(<AdminSecurity />);
    const tabela = await screen.findByRole("table", {
      name: "Falhas por dia",
    });
    const linha = within(tabela)
      .getAllByRole("row")
      .find((r) => r.textContent?.startsWith("27/10"));
    expect(linha).toHaveTextContent("27/107");
  });

  it("pico na plataforma vira aviso de possível ataque", async () => {
    svc.getSecurity.mockResolvedValue(
      overview({
        spike: {
          accountThreshold: 10,
          platformThreshold: 50,
          platformTotal24h: 80,
          platformSpike: true,
          accountsWithSpike24h: 0,
          topSpikeAccounts: [],
        },
      }),
    );
    renderWithProviders(<AdminSecurity />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "80 falhas de login nas últimas 24 h",
    );
  });

  it("período vem da URL e troca atualiza a query string", async () => {
    search = "periodo=7";
    renderWithProviders(<AdminSecurity />);
    await waitFor(() => expect(svc.getSecurity).toHaveBeenCalledWith(7));
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    expect(replace).toHaveBeenCalledWith("/admin/seguranca?periodo=1", {
      scroll: false,
    });
  });

  it("erro mostra o estado vazio", async () => {
    svc.getSecurity.mockRejectedValue(new Error("falha"));
    renderWithProviders(<AdminSecurity />);
    expect(
      await screen.findByText("Não foi possível carregar a segurança"),
    ).toBeInTheDocument();
  });
});
